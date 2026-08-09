# social assets — hero whirlpool

precut from the live splash render, native pixels per slot (no resampling).

| file                                  | slot                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `hero-1920x1080.png`                  | master 16:9 — streamyard background, general hero                                          |
| `streamyard-overlay-1280x720.png`     | streamyard overlay / 720p feeds                                                            |
| `youtube-banner-2560x1440.png`        | youtube channel art (wordmark inside 1546×423 safe area)                                   |
| `x-header-1500x500.png`               | x profile header                                                                           |
| `linkedin-banner-1584x396.png`        | linkedin personal banner (sam + steve)                                                     |
| `linkedin-company-cover-1128x191.png` | linkedin page cover — vortex band, no wordmark (too thin; page name sits next to the logo) |
| `facebook-cover-1640x624.png`         | facebook page cover (2× of 820×312)                                                        |
| `instagram-square-1080x1080.png`      | ig feed square                                                                             |
| `instagram-portrait-1080x1350.png`    | ig feed portrait                                                                           |
| `instagram-story-1080x1920.png`       | ig story / reel cover / tiktok                                                             |
| `podcast-cover-3000x3000.png`         | spotify / apple show art (wordmark at 420px so it survives ~64px list thumbnails)          |
| `podcast-cover-3000x3000-subtle.png`  | same frame, default 272px wordmark — alt if the big type feels loud in situ                |

link previews (`og.png` 1200×630, `og-square.png` 1200×1200) live at repo root and ship with the site.

## regen

serve the repo locally, then screenshot with playwright at each viewport:

1. fresh `goto` per size (resizing a running sim displaces the vortex eye — particles reseed on width change only)
2. `scrollTo(0,0)` with `scrollRestoration = 'manual'` and `scroll-behavior: auto` (snap can settle on screen two)
3. hide `.down` (chevrons)
4. youtube: set `.wordmark` font-size to 245px so the wordmark clears the 1546px safe width
5. linkedin company cover: hide `.wordmark`
6. podcast cover: 3000×3000 viewport needs device emulation (window resize caps at screen height); set `.wordmark` font-size to 420px (2× 544px clips both words)
7. wait ~2s for the field to settle before the shot
