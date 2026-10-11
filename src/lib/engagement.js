// What a visitor did with a page after it loaded: how far down they got, how
// long it was in front of them, what they played and where they left for.
// Every mark is its own event name, so umami's journey and funnel reports can
// read them in order.
//
// The same file runs on threesam.com, sixtom.com and pyredivers.com. Change
// one, change all three. It is plain JavaScript and starts itself, so a site
// can import it from its layout or point a module script straight at it, which
// is how it reaches a page that ships no framework code.

const SCROLL_MARKS = [25, 50, 75, 100];
const SECOND_MARKS = [10, 30, 60, 180];
// A looping video goes back to the start without ever saying it ended, so
// getting this far counts as the end.
const END = 95;
const FIRST = 25;
const MEDIA_MARKS = [FIRST, 50, 75, END];

/**
 * The marks passed on the way from one reading up to the next.
 * @param {readonly number[]} marks
 * @param {number} from
 * @param {number} to
 */
export const crossed = (marks, from, to) =>
  marks.filter((mark) => mark > from && mark <= to);

function watch() {
  let path = location.pathname;
  let depth = 0;
  let seconds = 0;
  /**
   * What each player is on, and how far into it this play has got, as a
   * percentage. A player that moves to another file starts again.
   * @type {WeakMap<HTMLMediaElement, { src: string, at: number }>}
   */
  const played = new WeakMap();

  // SvelteKit changes page without loading a new document, so a new address
  // is what starts the counts again.
  const turnPage = () => {
    if (location.pathname === path) {
      return;
    }
    path = location.pathname;
    depth = 0;
    seconds = 0;
  };

  // Every handler waits for the tracker, which loads after the page does, so
  // nothing reached before it arrives is marked as told and then lost.
  const onScroll = () => {
    if (!window.umami) {
      return;
    }
    turnPage();
    const room = document.documentElement.scrollHeight - innerHeight;
    // Less than a screen of scrolling says nothing about reading.
    if (room < innerHeight) {
      return;
    }
    const now = Math.round((scrollY / room) * 100);
    for (const mark of crossed(SCROLL_MARKS, depth, now)) {
      window.umami.track(`scroll-${String(mark)}`);
    }
    depth = Math.max(depth, now);
  };

  // Only seconds with the page in front of the visitor count.
  // ponytail: looked at once a second, so a mark can be a second out.
  const tick = () => {
    if (!window.umami) {
      return;
    }
    turnPage();
    if (document.visibilityState !== 'visible') {
      return;
    }
    seconds += 1;
    if (SECOND_MARKS.includes(seconds)) {
      window.umami.track(`engaged-${String(seconds)}s`);
    }
  };

  // Media events do not bubble, but the capture phase passes through here on
  // the way down, so one listener hears every video and sound on the site.
  // Muted loops are decoration and are left out.
  // ponytail: a jump forward counts every mark it passes, so `media-75` means
  // "got to 75%", not "sat through 75%". Count watched seconds if that matters.
  // ponytail: a loop of a few seconds can go round between two looks and skip
  // its `media-end`. Nothing that short plays with sound today.
  /** @param {Event} event */
  const onTime = ({ type, target: media }) => {
    if (!window.umami || !(media instanceof HTMLMediaElement)) {
      return;
    }
    // Paused means a visitor dragging the bar, except at the very end, where
    // some browsers pause before they say so.
    if (media.muted || (media.paused && type !== 'ended')) {
      return;
    }
    if (!Number.isFinite(media.duration) || media.duration === 0) {
      return;
    }
    const src = media.currentSrc;
    // Where the file is, without the cache stamp. Files of the site's own
    // lose the site's name; anything hosted elsewhere keeps its whole address.
    const data = {
      src: src.replace(location.origin, '').split(/[?#]/)[0] ?? '',
    };
    const now = (media.currentTime / media.duration) * 100;
    const last = played.get(media);
    let was = last?.src === src ? last.at : undefined;
    if (was === undefined) {
      window.umami.track('media-play', data);
      was = 0;
    } else if (was >= FIRST && now < FIRST) {
      // Back at the start after getting somewhere: a loop coming round, a
      // second press, or the bar dragged back.
      window.umami.track('media-replay', data);
      was = 0;
    }
    for (const mark of crossed(MEDIA_MARKS, was, now)) {
      window.umami.track(
        mark === END ? 'media-end' : `media-${String(mark)}`,
        data,
      );
    }
    played.set(media, { src, at: Math.max(was, now) });
  };

  // Capture phase so an inner stopPropagation can't hide the click. Both click
  // and auxclick, because a middle click to open a new tab fires only auxclick.
  /** @param {MouseEvent} event */
  const onClick = ({ button, target }) => {
    if (button !== 0 && button !== 1) {
      return;
    }
    const anchor = target instanceof Element ? target.closest('a') : null;
    if (!anchor?.href.startsWith('http') || anchor.origin === location.origin) {
      return;
    }
    window.umami?.track('outbound-click', {
      host: anchor.host,
      path: anchor.pathname,
      from: location.pathname,
    });
  };

  setInterval(tick, 1000);
  addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('timeupdate', onTime, true);
  document.addEventListener('ended', onTime, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true);
}

// Started by being loaded, and it lives as long as the page does. On the
// server there is no page to watch.
if (typeof window !== 'undefined') {
  watch();
}
