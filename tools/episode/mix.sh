#!/bin/bash
# The episode audio: the FL-cleaned conversation plus the outro music. The music
# enters on the first frame of the ASCII ending (show − BARS bars, floored to a
# frame), starts at 50% and rises to 100% over those BARS, sits GAIN dB up for
# balance, and a limiter holds true-peak headroom for the aac encode.
# ep 1: 69 bpm, 6 bars (20.87 s), +3.3 dB, music is a 26.000 s FL export.
# usage: mix.sh EPDIR CLEAN.wav OUTRO.wav BPM OUT.wav [BARS=6] [GAIN_DB=3.3]
set -e
EP=$1 CLEAN=$2 OUTRO=$3 BPM=$4 OUT=$5 BARS=${6:-6} GAIN=${7:-3.3}
read -r SHOW START RAMP G <<<"$(python3 -c "
import json, math
keep = json.load(open('$EP/keep.json')); show = sum(b - a for a, b in keep)
ramp = $BARS * 4 * 60 / $BPM
start = math.floor((show - ramp) * 24) / 24
print(f'{show:.6f}', round(start * 48000), f'{ramp:.6f}', round(10 ** ($GAIN / 20), 5))")"
echo "show ${SHOW}s, music in at sample ${START} ($(python3 -c "print(round($START/48000,6))")s), ramp ${RAMP}s, gain x${G}"
/usr/local/bin/ffmpeg -nostdin -v error -y -t "$SHOW" -i "$CLEAN" -i "$OUTRO" -filter_complex \
  "[1:a]volume='${G}*(0.5+0.5*min(t/${RAMP},1))':eval=frame,adelay=${START}S|${START}S[m];[0:a][m]amix=inputs=2:normalize=0:duration=longest:dropout_transition=0,alimiter=limit=0.841:level=false[a]" \
  -map "[a]" -ar 48000 -c:a pcm_f32le "$OUT"
/usr/local/bin/ffmpeg -nostdin -hide_banner -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)" | tr -s ' ' | tr '\n' ' '
echo
