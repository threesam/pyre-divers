# A social clip: 4:5 (1080x1350, LinkedIn's tallest feed shape) in the episode's
# paper + ink — the wordmark in the top band, the footage in the middle, word-
# timed captions in the bottom band (most feeds play muted). Captions come from
# faster-whisper word timings on the clip itself, lowercased like the brand,
# fillers dropped. Audio is the finished mix, 20 ms fades at the cut points.
# usage: clip.py FINAL.mp4 START END OUT.mp4   (seconds on the episode timeline)
# WHISPER_PY = a python with faster-whisper (default: the voicepipe venv)
import json
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FF = '/usr/local/bin/ffmpeg'
SRC, A, B, OUT = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
W, H, VH, FPS = 1080, 1350, 608, 24
BAR = (H - VH) // 2
PAPER, INK, MUTED = (0xe7, 0xe2, 0xda), (0x21, 0x26, 0x14), (0x7d, 0x74, 0x5f)
TTF = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pyre-display.ttf')
WHISPER_PY = os.environ.get('WHISPER_PY', os.path.expanduser('~/Code/Me/voicepipe/.venv/bin/python'))
FILLER = {'um', 'uh', 'umm', 'uhh', 'mm', 'hmm'}

with tempfile.TemporaryDirectory() as td:
    wav = os.path.join(td, 'clip.wav')
    subprocess.run([FF, '-nostdin', '-v', 'error', '-y', '-ss', f'{A:.3f}', '-t', f'{B - A:.3f}', '-i', SRC,
                    '-vn', '-ac', '1', '-ar', '16000', wav], check=True)
    cache = os.path.splitext(OUT)[0] + '.words.json'   # re-renders skip whisper
    words = json.load(open(cache)) if os.path.exists(cache) else json.loads(subprocess.run([WHISPER_PY, '-c', f'''
import json
from faster_whisper import WhisperModel
m = WhisperModel("distil-large-v3", device="cpu", compute_type="int8")
segs, _ = m.transcribe({wav!r}, language="en", word_timestamps=True)
print(json.dumps([[w.start, w.end, w.word] for s in segs for w in s.words]))'''],
        capture_output=True, text=True, check=True).stdout)
    json.dump(words, open(cache, 'w'))

# words -> caption chunks: <= 2 lines of ~26 chars, a new chunk on a sentence
# end or after ~2.8 s (never before 3 words — a lone "in" flashing up reads as
# a glitch), each shown from its first word to the next chunk
words = [(s, e, re.sub(r'\s+', ' ', w).strip().lower()) for s, e, w in words]
words = [(s, e, w) for s, e, w in words if w.strip('.,?!') not in FILLER]
chunks, cur = [], []
for s, e, w in words:
    text = ' '.join(x[2] for x in cur + [(s, e, w)])
    if cur and (len(text) > 52 or (e - cur[0][0] > 2.8 and len(cur) >= 3)):
        chunks.append(cur); cur = []
    cur.append((s, e, w))
    if w.endswith(('.', '?', '!')):
        chunks.append(cur); cur = []
if cur:
    chunks.append(cur)
cues = [(c[0][0], (chunks[i + 1][0][0] if i + 1 < len(chunks) else c[-1][1] + 0.4), ' '.join(x[2] for x in c))
        for i, c in enumerate(chunks)]

font = ImageFont.truetype(TTF, 50)
mark = ImageFont.truetype(TTF, 64)


def wrap(text, width=900):
    lines, line = [], ''
    for word in text.split():
        trial = f'{line} {word}'.strip()
        if line and font.getlength(trial) > width:
            lines.append(line); line = word
        else:
            line = trial
    return lines + [line]


base = Image.new('RGB', (W, H), PAPER)
d = ImageDraw.Draw(base)
d.text((W / 2, BAR / 2 + 8), 'pyre divers', font=mark, fill=INK, anchor='mm')
d.line([(W / 2 - 60, BAR - 44), (W / 2 + 60, BAR - 44)], fill=MUTED, width=2)
caption_imgs = []
for _, _, text in cues:
    im = Image.new('RGBA', (W, BAR), (0, 0, 0, 0))
    dd = ImageDraw.Draw(im)
    lines = wrap(text)[:3]
    y0 = BAR / 2 - (len(lines) - 1) * 32
    for i, line in enumerate(lines):
        dd.text((W / 2, y0 + i * 64), line, font=font, fill=INK, anchor='mm')
    caption_imgs.append(im)

dec = subprocess.Popen([FF, '-nostdin', '-v', 'error', '-ss', f'{A:.3f}', '-t', f'{B - A:.3f}', '-i', SRC,
                        '-vf', f'scale={W}:{VH}:flags=lanczos', '-r', str(FPS), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       stdout=subprocess.PIPE)
enc = subprocess.Popen([FF, '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                        '-r', str(FPS), '-i', '-', '-ss', f'{A:.3f}', '-t', f'{B - A:.3f}', '-i', SRC, '-map', '0:v', '-map', '1:a',
                        '-af', f'afade=t=in:d=0.02,afade=t=out:st={B - A - 0.02:.3f}:d=0.02',
                        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
                        '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
n, size = 0, W * VH * 3
while True:
    raw = dec.stdout.read(size)
    if len(raw) < size:
        break
    t = n / FPS
    frame = base.copy()
    frame.paste(Image.fromarray(np.frombuffer(raw, np.uint8).reshape(VH, W, 3)), (0, BAR))
    for (s, e, _), im in zip(cues, caption_imgs):
        if s <= t < e:
            frame.paste(im, (0, BAR + VH), im)
            break
    enc.stdin.write(frame.tobytes())
    n += 1
enc.stdin.close(); enc.wait(); dec.wait()
print(f'{OUT}: {n} frames ({n / FPS:.1f} s), {len(cues)} captions')
