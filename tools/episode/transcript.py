# Stitch the diarized parts back into one show-time transcript. usage:
#   transcript.py PUBLISHDIR
# reads PUBLISHDIR/parts.txt (audio.py: each part and where it starts on the
# show timeline) and the matching diarized-partN.json (transcribe.sh). Writes:
#   transcript.json  paragraphs for the site's segments table: a turn is split
#                    at segment edges into ~PARA s paragraphs; the speaker is
#                    set on a turn's first paragraph only, so the page labels
#                    each turn once and timestamps every paragraph
#   transcript.md    the same, readable (show notes, clip picking, chapters)
#   captions.srt     youtube captions: sentence-level, long cues split by
#                    characters so no cue runs past two lines
import json, os, sys

PARA = 45.0      # max seconds of one speaker before a new paragraph
CUE_CHARS = 84   # ~2 lines of youtube caption

def load(pb):
    segs = []
    for line in open(os.path.join(pb, 'parts.txt')):
        part, off = line.split()
        path = os.path.join(pb, 'diarized-' + part.replace('.mp3', '.json'))
        for s in json.load(open(path))['segments']:
            text = s['text'].strip()
            if text:
                segs.append({'start': s['start'] + float(off), 'end': s['end'] + float(off),
                             'speaker': s.get('speaker'), 'text': text})
    segs.sort(key=lambda s: s['start'])
    return segs

def paragraphs(segs):
    out = []
    for s in segs:
        last = out[-1] if out else None
        if last and last['_who'] == s['speaker'] and s['end'] - last['start'] <= PARA:
            last['end'] = s['end']; last['text'] += ' ' + s['text']
        else:
            first_of_turn = not last or last['_who'] != s['speaker']
            out.append({'start': s['start'], 'end': s['end'], '_who': s['speaker'],
                        'speaker': s['speaker'] if first_of_turn else None, 'text': s['text']})
    return [{k: v for k, v in p.items() if k != '_who'} for p in out]

def ts(t, srt=False):
    h, r = divmod(t, 3600); m, s = divmod(r, 60)
    if srt:
        return f'{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)) % 1000:03d}'
    return f'{int(h)}:{int(m):02d}:{int(s):02d}' if h else f'{int(m)}:{int(s):02d}'

def cues(segs):
    for s in segs:
        words, chunks, cur = s['text'].split(), [], ''
        for w in words:
            if cur and len(cur) + 1 + len(w) > CUE_CHARS:
                chunks.append(cur); cur = w
            else:
                cur = f'{cur} {w}'.strip()
        chunks.append(cur)
        total = sum(len(c) for c in chunks) or 1
        t = s['start']
        for c in chunks:
            d = (s['end'] - s['start']) * len(c) / total
            yield t, t + d, c
            t += d

if __name__ == '__main__':
    out_dir = sys.argv[1]
    segs = load(out_dir)
    paras = paragraphs(segs)
    json.dump(paras, open(os.path.join(out_dir, 'transcript.json'), 'w'), indent=1)
    with open(os.path.join(out_dir, 'transcript.md'), 'w') as f:
        for p in paras:
            who = f"**{p['speaker']}:** " if p['speaker'] else ''
            f.write(f"[{ts(p['start'])}] {who}{p['text']}\n\n")
    with open(os.path.join(out_dir, 'captions.srt'), 'w') as f:
        for i, (a, b, c) in enumerate(cues(segs), 1):
            f.write(f'{i}\n{ts(a, True)} --> {ts(b, True)}\n{c}\n\n')
    words = sum(len(s['text'].split()) for s in segs)
    print(f'{len(segs)} segments -> {len(paras)} paragraphs, {words} words, '
          f'{segs[0]["start"]:.1f}-{segs[-1]["end"]:.1f}s')
