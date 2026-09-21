# The two windows of the EDITED timeline that the show renders as ASCII — the
# head [0, HEAD) and the tail [show-TAIL, show) — mapped back onto the raw
# recording through keep.json, for ascii6.py (via ascii-ends.sh):
#   head-range.txt / tail-range.txt   raw start, raw end (tail: + edited start)
#   head-sel.txt   / tail-sel.txt     ffmpeg select expr over that raw clip that
#                                     keeps only the kept pieces
# usage: windows.py EPDIR [HEAD=12] [TAIL=45]
import json
import sys

ep = sys.argv[1]
HEAD = float(sys.argv[2]) if len(sys.argv) > 2 else 12.0
TAIL = float(sys.argv[3]) if len(sys.argv) > 3 else 45.0
keep = json.load(open(f'{ep}/keep.json'))
show = sum(b - a for a, b in keep)


def pieces(t0, t1):
    out, e0 = [], 0.0
    for a, b in keep:
        e1 = e0 + (b - a)
        if e1 > t0 and e0 < t1:
            out.append((a + max(t0, e0) - e0, a + min(t1, e1) - e0))
        e0 = e1
    return out


def write(name, t0, t1, extra=''):
    pc = pieces(t0, t1)
    r0 = pc[0][0]
    open(f'{ep}/{name}-range.txt', 'w').write(f'{r0:.3f} {pc[-1][1]:.3f}{extra}\n')
    open(f'{ep}/{name}-sel.txt', 'w').write('+'.join(f'between(t,{a - r0:.3f},{b - r0:.3f})' for a, b in pc))


write('head', 0, HEAD)
write('tail', show - TAIL, show, f' {show - TAIL:.3f}')
print(f'show {show:.3f}s: head = edited 0-{HEAD:g}s, tail = edited {show - TAIL:.3f}-{show:.3f}s')
