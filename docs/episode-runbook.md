# episode runbook

How an episode goes from a StreamYard recording to live everywhere. Ep 1
("first dive", September 2026) is the reference run: every step below is what
actually made it, and its numbers are the defaults.

**What you decide per episode:** the raw recording, where the conversation starts
and ends in it, the outro's BPM, and the episode's number, slug, title and
description. Everything else is a default.

## once

- **tools**: `/usr/local/bin/ffmpeg` (brew; the miniforge build is broken, it has
  no openh264). python3 with numpy, pillow, opencv and mediapipe for
  `ascii6.py`, which loads the two MediaPipe models that sit next to it
  (selfie segmenter + BlazeFace, Apache-2.0). The voicepipe venv
  (`~/Code/Me/voicepipe/.venv`) for faster-whisper. Node 24 with `npm ci`. FL Studio.
- **db access**: `vercel env pull .env.local --environment=production` gives you
  `DATABASE_URL` for `db.mjs`. The file is gitignored.
- **speaker references**: 2–10 s of each host talking alone, as
  `assets/speakers/<Name>.wav` (16 kHz mono), named as the transcript shows the
  speaker: `Sam.wav`, `Steve.wav`. They're gitignored, because voices
  don't go in a public repo. Ep 1's are there; reuse them. A guest needs one too:
  cut it from their first long solo turn and check it by transcribing it.
- **the box** (`BOX=user@host`, see `~/Code/Me/infra`): `/opt/media` is served
  as `https://media.pyredivers.com`, and `/opt/infra/.env` holds
  `OPENAI_API_KEY` and `PYRE_DEPLOY_HOOK`. Neither secret leaves the box.
- **directories**: submit the feed to Apple and Spotify once (see
  [distribution](#11-distribution)). After that they poll it.

## the episode folder

Everything for episode N lives in `assets/epN/`, which is gitignored because it
runs to gigabytes. Below: `EP=assets/epN`, `RAW` = the StreamYard export,
`T=tools/episode`, `N` = the episode number.

## 1. record

Recorded live on StreamYard, in one take. Ep 1 wasn't broadcast; from ep 2 the show streams live. Either way, export the finished recording: 1920×1080, two
panels, **Steve on the left, Sam on the right**. The name tags and the
renderer's crops assume that layout.

## 2. cut list: tighten the pauses

```sh
python3 $T/tighten.py $EP "$RAW" HEAD TAIL   # ep 1: 2.5 2352.5, ~5 s
```

`HEAD` and `TAIL` are where the conversation starts and ends in the raw, in
seconds. Every silence of 1.2 s or more is cut down to 0.6 s. Silence means
below −37 dB on a 48 kHz mono downmix. Writes `keep.json`. Ep 1's list had 70
cuts, removed 70.2 s, and left a 2279.82 s show; the script gets 69 cuts and
69.4 s on the same file. If a new room is noisier, raise the threshold (−35)
until the cut count looks like ep 1's. Don't use Whisper word gaps for this:
its word timings stretch across the pauses.

## 3. custom video filtering: the ASCII head and tail

```sh
python3 $T/windows.py $EP        # which raw seconds make the edit's first 12 s and last 45 s
$T/ascii-ends.sh $EP "$RAW"      # -> $EP/head-ascii.mp4, $EP/tail-ascii.mp4, rendered in parallel
```

The look is ep 1's: bold Menlo 6×12, light mode (`#e7e2da` paper, `#212614`
ink), rooms at 45%, no ring. Every knob is an env var, documented at the top of
`ascii6.py`.

## 4. assemble the edit

```sh
python3 $T/assemble.py $EP "$RAW" $EP/ep$N-edit.mp4 BPM   # ep 1: 69
```

This takes the raw footage in the renderer's panel framing, cut by `keep.json`.
It opens fully ASCII and dissolves to footage over 3 bars, with the wordmark and
the name tags. The ASCII returns over the last 6 bars: fading in for 3, full
for 3. The audio is loudnormed to −16 LUFS and becomes FL's input. The body (30
s to show − 45 s) is cached in `$EP/assemble-work/`, so re-running for a head or tail
change takes about a minute.

## 5. FL: clean the audio, write the outro

- `ffmpeg -nostdin -i $EP/ep$N-edit.mp4 -vn -c:a pcm_f32le $EP/edit.wav`, then run
  it through FL with the cleanup preset (ep 1's project is `pyredivers_01.flp`).
  Render it to `$EP/clean.wav`.
- Outro music at the episode's BPM: 6 bars under the ASCII ending, plus a tail
  (ep 1: 69 bpm, 26.000 s total). Load the edit into FL's video player to line
  it up. Render, trim to length, and save as `$EP/outro.wav`.
- The FL projects live in
  `~/Documents/Image-Line/FL Studio/Projects/me/actually trying/pyredivers/`.

## 6. mix

```sh
$T/mix.sh $EP $EP/clean.wav $EP/outro.wav BPM $EP/mix.wav
```

The music enters at 50% on the first frame of the ASCII ending, rises to 100%
over those 6 bars, sits +3.3 dB for balance, and goes through a limiter. Ep 1
came out at −14.0 LUFS, −1.2 dBTP, and this script reproduces ep 1's shipped mix
bit for bit.

## 7. the outro sequence

```sh
python3 $T/whirl.py $EP/ep$N-edit.mp4 $EP/whirl.mkv   # 195 frames in ~1 min; stills in $EP/whirl-frames/
```

The edit's last frame turns, darkest cell first, into the site's whirlpool, which
is a port of `src/lib/page-fx.ts`. The whirlpool is drawn as `.` dots at 0.4×
speed; at full speed it twinkled. The wordmark fades in black, holds 2 s, then
everything fades to flat paper over 2 s. Look at `whirl-frames/` before moving
on.

## 8. final + verify

```sh
$T/final.sh $EP/ep$N-edit.mp4 $EP/whirl.mkv $EP/mix.wav $EP/ep$N-final.mp4
```

It fails loudly unless the frame count is right, the pts step is one value
throughout (no gaps, no dupes), and a full decode is clean. It also prints the
loudness. This is the file for YouTube and the Drive folder.

## 9. publish kit

```sh
SHOW=$(python3 -c "import json; print(sum(b-a for a,b in json.load(open('$EP/keep.json'))))")
python3 $T/audio.py $EP/mix.wav $EP/clean.wav $SHOW $N $EP/publish "title"
scp $EP/publish/pyre-divers-$(printf %03d $N).mp3 $BOX:/opt/media/
curl -sI https://media.pyredivers.com/pyre-divers-$(printf %03d $N).mp3   # 200, audio/mpeg, content-length, accept-ranges
BOX=... SPEAKERS=assets/speakers $T/transcribe.sh $EP/publish           # ~7 min, ~$1
python3 $T/transcript.py $EP/publish                                    # transcript.json/.md, captions.srt
```

- **`audio.py`** writes two kinds of file:
  - The podcast mp3: one static gain to −16 LUFS (Apple's spec), 44.1 kHz stereo,
    128k CBR, tagged, with the cover embedded.
  - The transcription parts: the clean conversation without music, split at a
    pause so each part is at most 1380 s.
- **mp3 URLs are write-once.** A re-cut gets a new filename; never put new bytes
  at an old URL, because apps cache them.
- **`transcribe.sh`** runs `gpt-4o-transcribe-diarize` on the box with the speaker
  references, so segments come back named. Give the diarized text one
  read-through: ep 1's labels were right the whole way.

Then write `$EP/publish/episode.json` (ep 1's is the template: `slug`, `title`,
`description`, `audioUrl`, `durationSeconds`, `publishAt`, `transcript`), and:

```sh
node --env-file=.env.local $T/db.mjs draft $EP/publish/episode.json
set -a; . ./.env.local; set +a; PREVIEW_DRAFTS=1 npm run build
# read .svelte-kit/output/prerendered/pages/episodes/<slug>.html, feed.xml, sitemap.xml
```

The draft is invisible to every real deploy until it's published. **The slug is
permanent once published**: it's the feed guid and the URL.

## 10. publish

```sh
node --env-file=.env.local $T/db.mjs publish <slug>
ssh $BOX 'set -a; . /opt/infra/.env; curl -fsS -X POST "$PYRE_DEPLOY_HOOK"'
```

About a minute later the episode page, the homepage's "latest dive" link, the
feed item (numbered, with `<podcast:transcript>` pointing at
`/episodes/<slug>/transcript.vtt`), the sitemap entry and the `llms.txt` line
are live — all of it from the row, nothing per-episode to add. Check `https://pyredivers.com/feed.xml`
for the item and `https://pyredivers.com/episodes/<slug>`.

## 11. distribution

- **Apple and Spotify** (once, ever): in Apple Podcasts Connect, add a show from
  the feed URL `https://pyredivers.com/feed.xml`. In Spotify for Creators, add a
  podcast via RSS; a code goes to `sam@pyredivers.com`. Apple reviews a new show
  in about 1–5 days, Spotify in minutes. After that, both pick up new episodes
  from the feed on their own. Put the show links in `SocialStones`, and each
  episode's `spotifyUrl` and `applePodcastsUrl` in its manifest.
- **YouTube**: once the show streams, the live stream is already a video on
  the channel, unedited. Decide per episode whether the finished cut replaces
  it, sits beside it, or the stream stays the YouTube version. The podcast
  feed gets the finished audio either way. For an upload:
  1. Upload `ep$N-final.mp4` in Studio.
  2. Add the title, and a description with chapters (from `transcript.md`).
  3. Upload `publish/captions.srt` as the captions.
  4. Add a thumbnail and schedule it.
  5. Then put `youtubeUrl` in the manifest, run `db.mjs draft`, and fire the
     deploy hook.
- **email**: in listmonk (`mail.sixtom.com`), the list is "pyre divers" and mail
  goes from `fire@pyredivers.com` through Resend. Draft it, Sam approves, send.
- **LinkedIn**: Wednesday is the drop (the best clip plus the link). Clips fill
  the off days, 4 per episode at most (see content-engine's AGENTS.md). Pick
  30–60 s that stand alone from `transcript.md`, set the cut points on sentence
  edges from the `diarized-part*.json` segment times, then:

  ```sh
  python3 $T/clip.py $EP/ep$N-final.mp4 START END $EP/clips/1-name.mp4   # ~5 min each
  ```

  That gives a 4:5 clip in the episode's paper and ink, with word-timed
  lowercase captions (fillers dropped). Keep the clips clear of anything the
  feed would suppress: no profanity.

## costs and times (ep 1)

| step                       | wall time                               | cost               |
| -------------------------- | --------------------------------------- | ------------------ |
| tighten                    | ~5 s                                    | —                  |
| ASCII head + tail          | a few min (not timed)                   | —                  |
| assemble (first run)       | ~20 min (the body re-encode; not timed) | —                  |
| FL clean + outro music     | ≤1 h (cap)                              | —                  |
| mix, outro, final + verify | ~10 min                                 | —                  |
| transcription              | ~6.5 min                                | $0.76 (~$0.02/min) |
| media hosting              | —                                       | the box, ~38 MB/ep |

## gotchas that cost time on ep 1

- **ffmpeg in scripts**:
  - Always pass `-nostdin`, or a heredoc'd script gets eaten.
  - `aselect` silently keeps all the audio; cut audio with `atrim` and `concat`.
  - This build has no `drawtext` and no `soxr`.
- **stream-copy cuts overshoot** by a frame or two (a keyframe plus a forward
  P-frame). Count packets and cut with `-frames:v N`; never trust `-to`.
  `final.sh` asserts the pts step for exactly this reason.
- **`gpt-4o-transcribe-diarize` has hard limits**: 1400 s of audio and 25 MB per
  request. The box's old solve-for-x worker posts whole episodes and can't pass
  either limit; it isn't part of this flow. Output tokens are most of the cost,
  so the $0.006/min list estimate is about 3× low.
- **new DNS records**: the Mac's router resolver held the old `*.pyredivers.com`
  answer for a while after `media` was added, even though public resolvers had
  the new one within 60 s. A local build's enclosure HEAD check fails until the
  cache clears; Vercel's builds are unaffected.
- **Caddy's `Caddyfile` is a single-file bind mount.** An editor that swaps
  inodes (`sed -i`) leaves the running container on the old file. Recreate it
  with `docker compose up -d --no-deps caddy`.
- **Headless captures of the site can't show the vortex**: without a GPU the site
  draws its static fallback. That's why `whirl.py` re-implements the sim rather
  than recording it.
- **Disk**: every full render is about 1 GB. Delete intermediates as you go.
