# The cut list: every silence of MIN_GAP s or more is cut down to KEEP_GAP s
# (half kept at each end), inside [HEAD, TAIL] of the raw recording. Silence =
# below NOISE dB on a 48 kHz mono downmix (ffmpeg silencedetect). Writes
# EPDIR/keep.json: the raw-time pieces the edit keeps.
#
# This is the method behind ep 1's list, reconstructed: -37 dB gives 69 cuts /
# 69.4 s against the original's 70 / 70.2 s, most cut points within a
# millisecond. Whisper word gaps do NOT work: its word timings stretch across
# the pauses (ep 1's "cool" spans 6.8-8.7 s, and the first cut sits inside it).
# A noisier room raises the floor; nudge NOISE up (-35) until the cut count
# looks like ep 1's, ~70 in 39 minutes.
# usage: tighten.py EPDIR RAW.mp4 HEAD TAIL [NOISE_DB=-37] [MIN_GAP=1.2] [KEEP_GAP=0.6]
#   ep 1: tighten.py assets/ep1 RAW 2.5 2352.5
import json
import os
import re
import subprocess
import sys

ep, src, head, tail = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
noise = float(sys.argv[5]) if len(sys.argv) > 5 else -37.0
min_gap = float(sys.argv[6]) if len(sys.argv) > 6 else 1.2
keep_gap = float(sys.argv[7]) if len(sys.argv) > 7 else 0.6

log = subprocess.run(['/usr/local/bin/ffmpeg', '-nostdin', '-hide_banner', '-i', src, '-vn', '-ac', '1', '-ar', '48000',
                      '-af', f'silencedetect=noise={noise}dB:d={min_gap}', '-f', 'null', '-'],
                     capture_output=True, text=True, check=True).stderr
silences, start = [], None
for kind, t in re.findall(r'silence_(start|end): (-?[\d.]+)', log):
    if kind == 'start':
        start = float(t)
    elif start is not None:
        silences.append((start, float(t)))
        start = None

keep, t = [], head
for s, e in silences:
    if s < head or e > tail:
        continue
    keep.append([round(t, 6), round(s + keep_gap / 2, 6)])
    t = e - keep_gap / 2
keep.append([round(t, 6), tail])
json.dump(keep, open(os.path.join(ep, 'keep.json'), 'w'))
kept = sum(b - a for a, b in keep)
print(f'{len(keep) - 1} cuts, {tail - head - kept:.1f} s removed, show {kept:.3f} s')
