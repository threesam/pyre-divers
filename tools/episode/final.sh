#!/bin/bash
# The finished episode: the edit's frames then the outro sequence as one 24 fps
# picture, the mix as sound (padded with silence to the picture — the outro
# outlasts the music), then the checks that caught every real bug on ep 1:
# frame count, one pts step everywhere (no gaps, no dupes), a clean full decode,
# and loudness.
# usage: final.sh EDIT.mp4 WHIRL.mkv MIX.wav OUT.mp4
set -e
EDIT=$1 WHIRL=$2 MIX=$3 OUT=$4
F=/usr/local/bin/ffmpeg P=/usr/local/bin/ffprobe
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
frames() { $P -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of csv=p=0 "$1"; }

# same encoder settings as assemble.py so the concat demuxer can stream-copy
$F -nostdin -v error -y -i "$WHIRL" -c:v libx264 -preset faster -crf 20 -pix_fmt yuv420p -profile:v high -level 4.0 -r 24 "$W/outro.mp4"
$F -nostdin -v error -y -i "$EDIT" -map 0:v -c copy "$W/edit.mp4"
printf "file '%s'\nfile '%s'\n" "$W/edit.mp4" "$W/outro.mp4" > "$W/list.txt"
$F -nostdin -v error -y -f concat -safe 0 -i "$W/list.txt" -c copy "$W/video.mp4"
N=$(frames "$W/video.mp4"); VD=$(python3 -c "print(round($N/24,6))")
echo "picture: $(frames "$W/edit.mp4") edit + $(frames "$W/outro.mp4") outro = $N frames = ${VD}s"

$F -nostdin -v error -y -i "$W/video.mp4" -i "$MIX" -filter_complex "[1:a]apad=whole_dur=${VD}[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 320k -movflags +faststart -t "$VD" "$OUT"

$P -v error -select_streams v:0 -show_entries packet=pts -of csv=p=0 "$OUT" | python3 -c "
import sys
p = sorted(int(l) for l in sys.stdin if l.strip())
steps = {b - a for a, b in zip(p, p[1:])}
assert len(p) == len(set(p)) == $N, f'{len(p)} packets, {len(set(p))} unique, expected $N'
assert len(steps) == 1, f'uneven pts steps {steps}'
print(f'pts: {len(p)} frames, one step ({steps.pop()}), no gaps or dupes')"
ERR=$($F -nostdin -v error -i "$OUT" -f null - 2>&1 | head -3)
[ -z "$ERR" ] && echo "decode: clean" || { echo "decode errors: $ERR"; exit 1; }
echo "audio: $($P -v error -select_streams a:0 -show_entries stream=duration -of csv=p=0 "$OUT")s; $($F -nostdin -hide_banner -i "$OUT" -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I:|Peak:)' | tr -s ' ' | tr '\n' ' ')"
