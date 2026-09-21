#!/bin/bash
# Diarized transcription on the infra box, so the OpenAI key never leaves it:
# uploads the parts from audio.py plus the speaker references, runs every part
# in parallel through gpt-4o-transcribe-diarize (names from the references),
# brings the json back, and deletes the audio from the box.
# ~6.5 min wall for a 38-min episode; ep 1 cost $0.76 (40.7k in, 65.9k out tokens).
#
# needs: BOX=user@host of the infra box (OPENAI_API_KEY in /opt/infra/.env) and
# SPEAKERS=dir of 2-10 s solo clips named <speaker>.wav (gitignored — voices
# don't go in a public repo; ep 1's are in assets/speakers/).
# usage: BOX=... SPEAKERS=assets/speakers transcribe.sh PUBLISHDIR
set -e
PB=$(cd "$1" && pwd); : "${BOX:?set BOX=user@host}"; : "${SPEAKERS:?set SPEAKERS=dir of <name>.wav}"
R=/tmp/pyre-transcribe-$$
ssh -o BatchMode=yes "$BOX" "mkdir -p $R"
scp -q "$PB"/part*.mp3 "$SPEAKERS"/*.wav "$BOX:$R/"
NAMES=$(cd "$SPEAKERS" && ls *.wav | sed 's/\.wav$//' | tr '\n' ' ')
ssh -o BatchMode=yes "$BOX" "cd $R && NAMES='$NAMES' sh -s" <<'EOS'
KEY=$(grep '^OPENAI_API_KEY=' /opt/infra/.env | cut -d= -f2- | tr -d "\"'")
SPK=""
for n in $NAMES; do
  { printf 'data:audio/wav;base64,'; base64 -w0 "$n.wav"; } > "$n.ref"
  SPK="$SPK -F known_speaker_names[]=$n -F known_speaker_references[]=<$n.ref"
done
for p in part*.mp3; do
  ( code=$(curl -sS --max-time 1500 https://api.openai.com/v1/audio/transcriptions \
      -H "Authorization: Bearer $KEY" -F "file=@$p" -F model=gpt-4o-transcribe-diarize \
      -F response_format=diarized_json -F chunking_strategy=auto -F language=en $SPK \
      -o "${p%.mp3}.json" -w '%{http_code}'); echo "$p: HTTP $code" ) &
done
wait
EOS
for j in $(ssh -o BatchMode=yes "$BOX" "cd $R && ls part*.json"); do scp -q "$BOX:$R/$j" "$PB/diarized-$j"; done
ssh -o BatchMode=yes "$BOX" "rm -rf $R"
python3 - "$PB" <<'EOF'
import json, sys, glob
ins = outs = 0
for f in sorted(glob.glob(f'{sys.argv[1]}/diarized-part*.json')):
    d = json.load(open(f))
    if 'error' in d:
        sys.exit(f'{f}: {d["error"]["message"]}')
    u = d['usage']; ins += u['input_tokens']; outs += u['output_tokens']
    print(f'{f}: {len(d["segments"])} segments, {d["duration"]:.1f} s')
print(f'cost ≈ ${ins * 2.5e-6 + outs * 1e-5:.2f} ({ins} in, {outs} out tokens)')
EOF
