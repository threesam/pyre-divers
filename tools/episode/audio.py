# The two audio files the publish step needs, from the episode's mix and its
# conversation without music (the edit, step 5):
#   pyre-divers-NNN.mp3   the podcast enclosure: loudness-matched to -16 LUFS
#                         (apple's spec; the mix is ~-14 for youtube), 44.1 kHz
#                         stereo, 128k CBR, id3v2.3 tags + the cover embedded
#   part1.mp3, part2.mp3  the conversation (no music) for transcription: 16 kHz
#                         mono. gpt-4o-transcribe-diarize takes at most 1400 s
#                         per request, so it's split at the longest pause near
#                         each boundary, and parts.txt records each part's
#                         offset on the show timeline for transcript.py
# usage: audio.py MIX.wav|- CLEAN.wav|- SHOW_SECONDS NUM OUTDIR [TITLE]   (- skips that file)
import os
import re
import subprocess
import sys

FF = '/usr/local/bin/ffmpeg'
MAX_PART = 1380.0   # under the model's 1400 s cap, with room for rounding
COVER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'static', 'podcast-cover.jpg')

mix, clean, show, num, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
title = sys.argv[6] if len(sys.argv) > 6 else ''
os.makedirs(out, exist_ok=True)


def ff(*args, capture=False):
    r = subprocess.run([FF, '-nostdin', '-hide_banner', *args], capture_output=True, text=True, check=True)
    return r.stderr


if mix != '-':  # '-' = parts only (step 5, before there's a mix)
    # podcast mp3: measure, then one static gain to -16 LUFS (no dynamics touched)
    loud = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', ff('-i', mix, '-af', 'ebur128', '-f', 'null', '-'))[-1])
    gain = -16.0 - loud
    mp3 = os.path.join(out, f'pyre-divers-{num:03d}.mp3')
    ff('-v', 'error', '-y', '-i', mix, '-i', COVER, '-map', '0:a', '-map', '1:v',
       '-af', f'volume={gain:.2f}dB,aresample=44100:filter_size=64:phase_shift=10:cutoff=0.97',
       '-c:a', 'libmp3lame', '-b:a', '128k', '-c:v', 'copy', '-disposition:v', 'attached_pic',
       '-id3v2_version', '3', '-write_id3v1', '1', '-metadata', f'title={title}', '-metadata', 'artist=pyre divers',
       '-metadata', 'album=pyre divers', '-metadata', f'track={num}', '-metadata', 'genre=Podcast',
       '-metadata', 'comment=https://pyredivers.com', '-metadata:s:v', 'title=Album cover',
       '-metadata:s:v', 'comment=Cover (front)', mp3)
    after = re.findall(r'(I|Peak):\s+(-?[\d.]+)', ff('-i', mp3, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'))
    print(f'{mp3}: {os.path.getsize(mp3)} bytes, mix {loud} LUFS {gain:+.2f} dB -> {dict(after[-2:])}')

if clean == '-':  # '-' = the mp3 only (step 9: the parts were cut from the edit in step 5)
    sys.exit()

# transcription parts: pauses in the conversation stem, then greedy splits
gaps = []
start = None
for kind, t in re.findall(r'silence_(start|end): (-?[\d.]+)',
                          ff('-t', f'{show}', '-i', clean, '-af', 'silencedetect=noise=-30dB:d=0.35', '-f', 'null', '-')):
    if kind == 'start':
        start = float(t)
    elif start is not None:
        gaps.append((start, float(t)))
        start = None
cuts, t0 = [0.0], 0.0
while show - t0 > MAX_PART:
    window = [g for g in gaps if t0 + MAX_PART * 0.6 < (g[0] + g[1]) / 2 < t0 + MAX_PART]
    cut = (lambda g: (g[0] + g[1]) / 2)(max(window, key=lambda g: g[1] - g[0])) if window else t0 + MAX_PART
    cuts.append(round(cut, 3))
    t0 = cut
cuts.append(show)
with open(os.path.join(out, 'parts.txt'), 'w') as f:
    for i, (a, b) in enumerate(zip(cuts, cuts[1:]), 1):
        part = os.path.join(out, f'part{i}.mp3')
        ff('-v', 'error', '-y', '-ss', f'{a:.3f}', '-t', f'{b - a:.3f}', '-i', clean, '-ac', '1', '-ar', '16000',
           '-c:a', 'libmp3lame', '-b:a', '48k', part)
        f.write(f'part{i}.mp3 {a:.3f}\n')
        print(f'{part}: {a:.3f}-{b:.3f} ({b - a:.1f} s, {os.path.getsize(part)} bytes)')
