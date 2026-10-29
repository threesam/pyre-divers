# episode runbook

How an episode goes from a StreamYard recording to live everywhere. Ep 5
("blind spots", October 2026) is the reference run: every step below is what
actually made it, and its numbers are the defaults. Stay on this page. If an
episode needs something it doesn't say, do it, then write it in here.

**The show is unedited.** No pauses tightened, nothing taken out of the middle.
Only the dead air before the first word and after the last is trimmed.

**What you decide per episode:** the raw recording, where the conversation starts
and ends in it, the threshold levels, the outro music, and the episode's number,
slug, title and description. Everything else is a default.

## once

- **tools**: `/usr/local/bin/ffmpeg` (brew; the miniforge build is broken, it has
  no openh264). python3 with numpy, pillow, opencv and mediapipe (BlazeFace sits
  in `tools/episode/`, Apache-2.0). The voicepipe venv
  (`~/Code/Me/voicepipe/.venv`) for faster-whisper. Node 24 with `npm ci`.
  For the audio: `~/.venvs/pyre-episode` (python 3.11, `pedalboard==0.9.25`,
  numpy), and FabFilter Pro-Q 4, Pro-DS, Pro-C 3 and Pro-L 2 installed as VST3.
- **speaker references**: 2–10 s of each host talking alone, as
  `assets/speakers/<Name>.wav` (16 kHz mono), named as the transcript shows the
  speaker: `Sam.wav`, `Steve.wav`. They're gitignored, because voices
  don't go in a public repo. Ep 1's are there; reuse them. A guest needs one too:
  cut it from their first long solo turn and check it by transcribing it.
- **the box** (`BOX=user@host`, see `~/Code/Me/infra`): `/opt/media` is served
  as `https://media.pyredivers.com`, and `/opt/infra/.env` holds
  `OPENAI_API_KEY` and `PYRE_DEPLOY_HOOK`. Neither secret leaves the box.
- **directories**: submit the feed to Apple and Spotify once (see
  [distribution](#12-distribution)). After that they poll it.

## the episode folder

Everything for episode N lives in `assets/epN/`, which is gitignored because it
runs to gigabytes. A full build needs about 7 GB free. Below:

- `EP=assets/epN`, `RAW` = the StreamYard export, `N` = the episode number
- `T=tools/episode`. Copy it to `$EP/t/` too: ep 5's helpers read it from there.
- `S=assets/ep5/s`: ep 5's one-off helpers, plus `assets/ep5/final-ep5.sh`
  (step 8). Gitignored, so they exist only in the main checkout. Copy them into
  the new episode's folder; they hard-code ep 5's paths and numbers, so edit
  those first.
- `K=~/Code/Me/portal.worktrees/mouth-log/maschine/mouth-machine/sketch`: ep 4's
  one-offs for the threshold head, the ending and the low-pass. They're on the
  portal repo's `docs/mouth-machine-log` branch, checked out in that worktree
  (the main portal checkout is on another branch).

The ep 5 helpers aren't in `tools/`. Each step names the one it needs, and the
list at the end says what to promote.

## 1. record

Recorded live on StreamYard, in one take. **Before recording, turn on local
recordings** in the studio's settings: each host then gets a separate,
uncompressed track. It can't be switched on afterwards (ep 4 didn't have them).
The show streams live; export the finished recording too.

- `RAW` = `~/Downloads/Episode N.mp4`: 1920×1080, 30 fps, two panels.
- The local tracks go in `$EP/local/` (`00;00;00_sam.wav`, `00;00;00_steve.wav`).
- **Steve on the left, Sam on the right.** The name tags and the crops assume
  it. Check it every episode: ep 2 came out the other way round, and `SWAP=1`
  on assemble.py swaps the panels back.
- The threshold look needs a face lit brighter than the wall behind it, from
  the front. Side light splits the face down the middle at every level.

## 2. cut list: one piece

Write `keep.json` by hand as one interval, `[[HEAD, TAIL]]`, in raw seconds.
Ep 5: `[[5.166, 2895.6]]`. Don't run `tighten.py`; eps 1 and 2 went out
tightened, and that was a mistake.

```sh
/usr/local/bin/ffmpeg -nostdin -hide_banner -i "$RAW" -vn -ac 1 \
  -af "silencedetect=noise=-37dB:d=0.15" -f null - 2>&1 | grep -o 'silence_.*' > $EP/silences.txt
head -2 $EP/silences.txt; tail -2 $EP/silences.txt   # candidates for the first word's start and the last word's end
```

The silences are only candidates: a recording that starts or stops mid-talk has
no silence at that end, and one with chatter before the show has an earlier one.
Listen at both points before choosing. Put `HEAD` just before the first word.
Put `TAIL` at least 1.5 s after the last word ends, so the fade doesn't bury it
(ep 2's first pick left "Why not?" 7–12 dB down). Ep 5's mp4 ended only 0.65 s
after the last word, so its clean used a 0.5 s end fade instead.

Edit time = raw time − HEAD (ep 5: − 155/30). Everything after this reads
`keep.json` as it is.

## 3. align the local tracks

The local tracks run on their own clock. Ep 5's drifted about 135 ppm against
the mp4, which is about 0.4 s by the end.

```sh
python3 -I $S/align2.py $EP "$RAW"        # band-limited GCC-PHAT on speech windows + a line fit -> align.json
python3 -I $S/align_apply.py $EP "$RAW"   # Kaiser-sinc warp ($S/warp.py) -> $EP/aligned/<name>.wav, then re-measures
```

The re-measure should print a lag near 0 ms and near 0 ppm for both voices.
Align on speech, band-limited to 150–3500 Hz; a plain waveform match locks onto
pitch periods.

## 4. the picture: threshold head and ending

The head and the ending are the threshold look: darker than X percent is flat
ink, brighter is clear, with the whirlpool behind the clear parts. It replaced
ep 1–3's ASCII. X = 55 for the head and the ending.

```sh
python3 $T/windows.py $EP     # head-range.txt, tail-range.txt: raw seconds of the edit's first 18 s and last 45 s
$K/pyre-head-threshold.sh "$RAW" HEAD 18 $EP/head-thr.mp4 55      # ep 5: HEAD = 5.166
INTRO=1 python3 $T/whirl.py $EP/head-thr.mp4 $EP/intro.mkv 116      # the opening whirlpool, flipping into it
```

Then the edit, in three moves:

1. **assemble** the whole edit once, as ep 3 and 4 did (77 bpm,
   `INTRO=$EP/intro.mkv HOLD_M=2.5507 TITLE_IN=4.833`). It still wants an ASCII
   head and tail (`$T/ascii-ends.sh $EP "$RAW"`); both get replaced below. The
   body (30 s to show − 45 s) is cached in `$EP/assemble-work/`.

   ```sh
   INTRO=$EP/intro.mkv HOLD_M=2.5507 TITLE_IN=4.833 \
     python3 $T/assemble.py $EP "$RAW" $EP/ep$N-edit.mp4 77
   ```

2. **the head**: re-render the first 30 s on the threshold head, with the paper
   wordmark (ink doesn't read on the threshold's ink):

   ```sh
   python3 -c "from PIL import Image; im=Image.open('$T/brand/wordmark-ink.png'); p=Image.new('RGBA',im.size,(232,226,216,255)); p.putalpha(im.split()[3]); p.save('$EP/wordmark-paper.png')"
   HEAD_ASCII=$EP/head-thr.mp4 INTRO=$EP/intro.mkv HOLD_M=2.5507 TITLE_IN=4.833 \
     WORDMARK=$EP/wordmark-paper.png python3 $K/pyre-head-only.py $T/assemble.py $EP "$RAW" $EP/head-thr-30.mp4 77
   bash $S/splice.sh   # head-thr-30.mp4 + the edit's body, minus its last 45 s -> ep$N-edit-thr.mp4 (stream copy)
   ```

3. **the ending**: `$K/pyre-ending-window.sh` on the last 45 s of footage in the
   show's framing. The threshold comes on over 8 bars with the whirlpool
   already turning behind it, holds 8, then the footage ends, its ink fades,
   and the wordmark comes in. The whirlpool is one layer from the first bar to
   the last frame. `CRF=12`, since it gets encoded again. Ep 5 kept ep 4's
   ending timing (`BAR_S=1.0545`, wordmark at the edit's frame count + 66) and
   fit the music to the picture (step 7).

   ```sh
   # the last 45 s in show framing, 24 fps; TS = raw time of the edit's last 45 s (tail-range.txt) − 2
   /usr/local/bin/ffmpeg -nostdin -ss TS -i "$RAW" -filter_complex \
     "[0:v]trim=2.0:47.0,setpts=PTS-STARTPTS,split=2[gl][gr];[gl]crop=843:940:57:30,scale=960:1080[pl];[gr]crop=843:940:1017:30,scale=960:1080[pr];[pl][pr]hstack,fps=24,format=yuv420p[v];[0:a]atrim=2.0:47.0,asetpts=PTS-STARTPTS[a]" \
     -map "[v]" -map "[a]" -r 24 -t 45 -c:v libx264 -preset faster -crf 12 -c:a pcm_s24le $EP/tail-plain.mov
   mkdir -p $EP/ending
   CRF=12 sh $K/pyre-ending-window.sh $EP/tail-plain.mov $EP/tail-ascii.mp4 assets/ep4/outro.wav "$PWD" $EP/ending
   # -> $EP/ending/ep4-ending-window.mp4 (the name is hard-coded); tail-ascii.mp4 is only read for the paper colour
   ```

   The music here is ep 4's 24-bar outro (`assets/ep4/outro.wav`, 26.7 s): it
   only sets the ending's length. The episode's own music goes in at the mix (step 7).

Look at frames before moving on (step 8).

## 5. transcribe

```sh
/usr/local/bin/ffmpeg -nostdin -i $EP/ep$N-edit.mp4 -vn -c:a pcm_f32le $EP/edit.wav
SHOW=$(python3 -c "import json; print(sum(b-a for a,b in json.load(open('$EP/keep.json'))))")
python3 $T/audio.py - $EP/edit.wav $SHOW $N $EP/publish                  # transcription parts
BOX=... SPEAKERS=assets/speakers $T/transcribe.sh $EP/publish           # ~7 min, ~$1
```

`transcribe.sh` runs `gpt-4o-transcribe-diarize` on the box with the speaker
references, so segments come back named. Read the labels through. Ep 5's came
back with 43 of Sam's segments as "A": relabel them from the local tracks (the
voice is on one track and not the other).

## 6. clean the audio, per voice

```sh
~/.venvs/pyre-episode/bin/python -I $S/clean5.py $EP   # aligned/<name>.wav -> clean-v2.wav
```

Each voice is cleaned on its own track, cropped to `keep.json`:

- spectral noise reduction, 14 dB
- a soft gate, −6 dB, 300 ms hold, 500 ms release
- level to −16 LUFS
- Pro-Q 4 "fuller", plus a 606 Hz notch on Steve
- Pro-DS (split band, 3–16 kHz) and Pro-C 3 (opto, −24 dB, 2:1)

Then the two are summed through Pro-L 2, fitted to −13.5 LUFS at −1 dBTP. The
output has the same length and timeline as the edit.

- To change the sound, A/B short clips at matched loudness (`loudnorm` each
  one) before rendering the whole show, and have Sam pick blind.
- No local tracks (ep 4)? `$T/clean.py` cleans the mixed edit audio, switching
  Steve's EQ on and off from the diarized turns.

## 7. outro music and mix

The music comes in under the end of the talk. It starts at half level, and it
starts muffled: a low-pass at 500 Hz holds until the last word, then opens to
full over 2 bars. That keeps 10 dB or more between the last words and the
music, and it isn't a level dip. The wordmark lands on the downbeat of the
music's last bar.

Ep 5's music is sea foam (a mouth machine piece in the portal repo), as stems:
drums without the "go to sleep" voice, and the music.

```sh
mkdir -p STEMDIR && ~/.venvs/pyre-episode/bin/python $S/stems.py MMDIR STEMDIR   # MMDIR = the sea foam piece folder
~/.venvs/pyre-episode/bin/python -I $S/outro5.py STEMDIR $EP/work/seafoam-outro.wav   # prints MUSIC_IN HOLD OPEN BARS BPM
~/.venvs/pyre-episode/bin/python $K/pyre-lowpass-open.py $EP/work/seafoam-outro.wav $EP/outro-seafoam.wav 500 HOLD OPEN
$T/mix.sh $EP $EP/clean-v2.wav $EP/outro-seafoam.wav BPM $EP/mix.wav BARS 3.3 0.5   # ep 5's second mix: mix-v2.wav
```

- **`outro5.py`**: drums ×0.70, −5 dB at 3.2 kHz, a little room reverb. It
  times the piece from the picture: the wordmark's first frame (the edit's
  frame count + 66) is the downbeat of bar 16, and music-in is snapped to a
  frame. The file runs to the picture's last frame, with a 1 s fade.
- **The low-pass** is four plain one-pole `LowpassFilter`s in series.
  Pedalboard's `LadderFilter` models an analogue filter and adds 1–4% harmonics,
  which Sam heard as distortion.
- **Measure the music per beat**, not by its file length: a file runs on with
  reverb and then silence. Ep 3's ran 28.9 s, but the music stopped at 18.7 s.
- **`mix.sh`**: music in at show − BARS bars, from FROM (0.5) to full over those
  bars, +3.3 dB (GAIN; ep 5 used the default, measured from `mix-v2.wav`),
  then a limiter. Don't push either side into it; an ep 4 version did and
  came out distorted.

## 8. final, verify, compare

```sh
$EP/final-ep5.sh $EP/ep$N-edit-thr.mp4 $EP/ending/ep4-ending-window.mp4 $EP/mix.wav $EP/ep$N-final.mp4
```

`final-ep5.sh` is `$T/final.sh` with a `duration` line for the edit in the
concat list. Without it the join had a 508-tick step and the pts check failed.

It fails loudly unless the frame count is right, the pts step is one value
throughout (no gaps, no dupes), and a full decode is clean. It also prints the
loudness. This is the file for YouTube, Spotify and the Drive folder.

A new mix on the same picture doesn't need a re-render: copy the video stream
and encode the new mix the way `final.sh` does (aac 320k, padded to the picture).
That's how ep 5's `ep5-final-v2.mp4` was made from `mix-v2.wav`.

- **Compare frames to the last episode before shipping**: the same moments
  (2.5, 5.5, 13, 17, 26 s and the ending), side by side, into `$EP/sheets/`.
  For "is this the same frame", diff PNG pixels, not `ffmpeg -f md5`.
- **No burned-in transcript on the episode.** Captions only go on the clips.
- **Don't build extra previews.** One render per change, then the comparison.

## 9. publish kit

```sh
python3 $T/audio.py $EP/mix.wav - $SHOW $N $EP/publish "title"
python3 $T/transcript.py $EP/publish   # transcript.json/.md, captions.srt (from step 5)
```

- **`audio.py`** makes the podcast mp3: one static gain to −16 LUFS (Apple's
  spec), 44.1 kHz stereo, 128k CBR, tagged, with the cover embedded. With `-` as
  the mix it makes the transcription parts instead (step 5).
- **The cards**: `pyre-divers-NNN-cover.jpg` and `pyre-divers-NNN-outro.jpg`
  (the email uses the outro card). `card.py` makes them; it's on
  `origin/feat/episode-art`, not master:

  ```sh
  git show origin/feat/episode-art:tools/episode/card.py > $EP/t/card.py
  python3 $EP/t/card.py $EP/publish/pyre-divers-NNN-cover.jpg 3000x3000 "title"
  python3 $EP/t/card.py $EP/publish/pyre-divers-NNN-outro.jpg 1280x720 "title"
  ```

  Check its font path first: ep 4 had to edit it.
- **mp3 URLs are write-once.** A re-cut gets a new filename; never put new bytes
  at an old URL, because apps cache them.

Then write `$EP/publish/episode.json` (`slug`, `title`, `description`,
`audioUrl`, `durationSeconds`, `publishAt`, `transcript`), and:

```sh
node $T/content.mjs draft $EP/publish/episode.json   # writes content/episodes/<slug>.json
PREVIEW_DRAFTS=1 npm run build
# read .svelte-kit/output/prerendered/pages/episodes/<slug>.html, feed.xml, sitemap.xml
```

**The file is public from the moment it's pushed** (this repo is public):
title, description and transcript. Push it the night before, not the week
before. **The slug is permanent once published**: it's the feed guid and the URL.

## 10. publish

1. The mp3 and both cards to the box:

   ```sh
   scp $EP/publish/pyre-divers-$(printf %03d $N){.mp3,-cover.jpg,-outro.jpg} $BOX:/opt/media/
   curl -sI https://media.pyredivers.com/pyre-divers-$(printf %03d $N).mp3   # 200, audio/mpeg, content-length, accept-ranges
   ```

2. Commit `content/episodes/<slug>.json` and merge it to master (a PR, like
   every change). Master deploys pyredivers.com in about 40 s. A build only
   shows an episode once its `publishedAt` has passed. The box rebuilds every
   day at 11:01 UTC, so an episode set for the usual Wednesday 11:00 UTC slot
   goes out a minute after it. To go live now instead (ep 5 did):

   ```sh
   node $T/content.mjs publish <slug>   # publishedAt = now; commit and merge it
   ```

After the build the episode page, the homepage's "latest dive" link, the feed
item (numbered, with `<podcast:transcript>`), the sitemap entry and the
`llms.txt` line are live, all from the file. Check
`https://pyredivers.com/feed.xml` and `https://pyredivers.com/episodes/<slug>`.

## 11. clips

Ep 5 cut 13. There's no per-episode cap any more. Each one is 4:5 with captions
in `clips/final/`, then the threshold look in `clips/threshold/`.

1. **Pick** 30–60 s that stand alone from `transcript.md`. Keep them clear of
   anything the feed would suppress: no profanity.
2. **Cut points come from the sound**, never from whisper word times. Word times
   are off by 0.1–0.3 s, and whisper invents words in silence.
   `python3 -I $S/snap2.py $EP A B` snaps a rough in and out to the nearest
   pause in `$EP/clean.wav` (ep 5 ran it before the v2 clean; on a fresh
   episode, point it at `clean-v2.wav`). "NO PAUSE" means pick another sentence edge.
3. **Captions**: word times come from each host's own track:
   `~/Code/Me/voicepipe/.venv/bin/python -I $S/transcribe_local.py $EP sam steve`
   (faster-whisper on `aligned/<name>.wav` -> `tx/<name>.json`), then
   `python3 -I $S/txtools.py merge $EP` (-> `tx/words.json` on the edit
   timeline). `$S/mkwords5.py` writes `<slug>.words.json`. Re-text the words
   from `publish/captions.srt` (whisper mishears names and phrases), keeping
   whisper's timings. The cache is keyed by the output name, so delete it when
   a range changes.
4. **The whirlpool**: `$S/whirl_tall.py` makes one tall whirlpool
   (`clips/whirl/whirl-full.mkv`) for both the top band and the footage window.
   It has to be one continuous pool, centred behind the wordmark; two crops
   turning separately looked wrong. `Scss` derives from the canvas size, so pin
   it (1542) when you change the canvas.
5. **Levels** are per episode and per person: the cameras and the light change.
   `$S/calib.py` measures how much of each face (BlazeFace's box) is clear at
   each level. Pick the level that keeps the clear share of ep 4's approved
   clips. Ep 5: Steve 71, Sam 48. Check the panel order.
6. **Render**: `(cd $EP && sh s/render1.sh SLUG A B)` (it uses paths relative to
   the episode folder; the subshell keeps you at the repo root) runs `s/clip5.py` on the final mp4, then
   `s/threshold5.sh` with the levels. The fade-out is 0.02 s; a clip with no
   silence after its last word needs 0.08, which `render1.sh` sets by slug
   (ep 5: `branded-island`), so add the new slug there.

## 12. distribution

Ep 5's order: site (step 10), YouTube, email, LinkedIn, Spotify video.

- **Apple and Spotify** (once, ever): in Apple Podcasts Connect, add a show from
  the feed URL `https://pyredivers.com/feed.xml`. In Spotify for Creators, add a
  podcast via RSS; a code goes to `sam@pyredivers.com`. After that, both pick up
  new episodes from the feed on their own.
- **YouTube** (Studio):
  1. Upload `ep$N-final.mp4` (or the latest `-vN`).
  2. Title, and a description with chapters (from `transcript.md`; ep 5's is
     `publish/youtube.txt`).
  3. `publish/captions.srt` as the captions. The upload lands as a draft: open
     it and publish it, or only the auto captions go public.
  4. The thumbnail: the wordmark on paper from the episode's own ending, about
     5 s after the conversation stops:
     `ffmpeg -ss $(echo "$SHOW + 5" | bc) -i $EP/ep$N-final.mp4 -frames:v 1 -vf scale=1280:720 -q:v 2 $EP/publish/thumbnail-paper.jpg`
  5. Playlist "pyre divers", not made for kids, AI use: No.
  6. Then set `youtubeUrl` in `content/episodes/<slug>.json` and merge it in a PR.
- **email**: in listmonk (`mail.sixtom.com`), the list is "pyre divers" and mail
  goes from `fire@pyredivers.com` through Resend. Clone the previous campaign as
  a draft (`publish/email-draft.sql`). People's names are lowercase and bold
  (**sam**, **steve**), "claude" is always lowercase, AI and platform names keep
  their capitals. Sam approves the text, then a separate yes to send.
- **LinkedIn**: through Studio (content-engine), with one threshold clip as the
  video and the episode link in the body.
- **Spotify video**: after the feed has delivered the episode to Spotify, in
  Spotify for Creators: the episode → Details → Upload video, the final mp4.
  Explicit: Yes, to match the feed. 18+: No. Thumbnail: `thumbnail-paper.jpg`.

## gotchas

- **ffmpeg in scripts**:
  - Always pass `-nostdin`, or a heredoc'd script gets eaten.
  - `aselect` silently keeps all the audio; cut audio with `atrim` and `concat`.
  - This build has no `drawtext` and no `soxr`.
  - Every `maskedmerge` input has to be `gbrp`: with rgb24 and a grey mask the
    whole picture quietly turns grey.
- **stream-copy cuts overshoot** by a frame or two (a keyframe plus a forward
  P-frame). Count packets and cut with `-frames:v N`; never trust `-to`.
- **`gpt-4o-transcribe-diarize` has hard limits**: 1400 s of audio and 25 MB per
  request. Output tokens are most of the cost, so the $0.006/min list estimate
  is about 3× low.
- **Plugin latency**: pedalboard streaming with `reset=False` doesn't compensate
  it. Measure it with an impulse, drop that many samples, and flush the tail.
- **Don't tone-match to an older episode**: fitting ep 2's EQ to ep 1's tone came
  out thin every time, and blind, Sam picked the raw.
- **Caddy's `Caddyfile` is a single-file bind mount.** An editor that swaps
  inodes (`sed -i`) leaves the running container on the old file. Recreate it
  with `docker compose up -d --no-deps caddy`.
- **Headless captures of the site can't show the vortex**: without a GPU the site
  draws its static fallback. That's why `whirl.py` re-implements the sim.
- **Disk**: every full-length float wav or render is about 1 GB. Delete
  intermediates as you go.

## to promote into tools/episode

Each of these did its job once, for one episode:

- `$S/align2.py`, `align_apply.py`, `warp.py`, `sig.py`: local-track alignment
  (step 3).
- `$S/clean5.py`: the per-voice clean, as the default `clean.py` when local
  tracks exist (step 6).
- `$K/pyre-head-threshold.sh`, `pyre-head-only.py`, `pyre-ending-window.sh`,
  `pyre-whirl-knobs.py`: the threshold head and ending (step 4). With them,
  assemble.py should take the threshold head directly and stop asking for an
  ASCII tail; then `ascii-ends.sh`, `ascii6.py` and `$S/splice.sh` can go.
- `$K/pyre-lowpass-open.py` and `$S/outro5.py`'s timing: the outro music fit to
  the picture (step 7). The sea foam stems script is saved as `$S/stems.py`
  (was only in a session scratchpad); it belongs next to the piece.
- `final.sh`: add the concat `duration` line (step 8).
- `card.py` from `origin/feat/episode-art` (step 9).
- `$S/snap2.py`, `mkwords5.py`, `whirl_tall.py`, `calib.py`, `threshold5.sh`,
  `clip5.py` (made by `mkclip5.py` from `clip.py` with the fat title band), and
  `render1.sh`: the clips (step 11).
