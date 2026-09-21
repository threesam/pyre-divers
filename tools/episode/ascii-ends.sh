#!/bin/bash
# The episode's "custom video filtering": the coarse light-mode ASCII look for the
# head and tail windows (windows.py writes their range/select files first),
# rendered straight from the raw recording, both windows in parallel. The look is
# ep 1's: bold Menlo 6x12 on paper, rooms at 45%, no ring.
# usage: ascii-ends.sh EPDIR RAW.mp4   -> EPDIR/head-ascii.mp4, EPDIR/tail-ascii.mp4
set -e
T=$(cd "$(dirname "$0")" && pwd); EP=$(cd "$1" && pwd); SRC=$2
export FPS=24 KEEPBG=1 BGSCALE=0.45 GAMMA=1.0 ZOOM=1.0085 YOFF=0.03 NORING=1 CRF=20
unset RINGCHAR MOTION PLATE
read -r H0 H1 < "$EP/head-range.txt"
read -r T0 T1 _ < "$EP/tail-range.txt"
python3 "$T/ascii6.py" "$SRC" "$EP/head-ascii.mp4" "$H0" "$H1" "$EP/head-sel.txt" 2>&1 | grep "^frames" | sed 's/^/head /' &
python3 "$T/ascii6.py" "$SRC" "$EP/tail-ascii.mp4" "$T0" "$T1" "$EP/tail-sel.txt" 2>&1 | grep "^frames" | sed 's/^/tail /' &
wait
echo ASCII_ENDS_DONE
