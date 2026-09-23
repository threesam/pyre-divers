<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import {
    LISTMONK,
    hasJoined,
    rememberJoined,
    subscribeFlow,
  } from '$lib/subscribe';

  // the episode page's ask, for readers who came for one episode and aren't
  // on the list. Client-side only: whether this browser already joined lives
  // in localStorage, and a prerendered bar would flash for readers who have.
  let open = $state(false);
  let busy = $state(false);
  let email = $state('');
  let message = $state('');
  let dock: HTMLElement | undefined = $state();
  // where focus came into the bar from: closing hands it back there
  let back: HTMLElement | null = null;

  onMount(() => {
    open = !hasJoined();
  });

  function onfocusin(e: FocusEvent) {
    const from = e.relatedTarget as HTMLElement | null;
    if (!dock?.contains(from)) {
      back = from;
    }
  }

  function close() {
    // focus in the bar would go with it, to the top of the document. Back
    // where it came from instead, without scrolling a reader who moved on
    if (dock?.contains(document.activeElement)) {
      back?.focus({ preventScroll: true });
    }
    open = false;
  }

  async function join(e: SubmitEvent) {
    e.preventDefault();
    // send is only aria-disabled while it's out: a disabled button drops
    // keyboard focus to the body. So a second press lands here, and stops
    if (busy) {
      return;
    }
    busy = true;
    // cleared first, so a retry that comes back with the same failure is
    // announced again
    message = '';
    const res = await subscribeFlow(email, LISTMONK, fetch);
    message = res.message;
    if (res.state === 'joined') {
      rememberJoined();
      // send stays off. The confirmation is up long enough to read (and for a
      // screen reader to say), then the bar goes
      setTimeout(close, 2600);
    } else {
      busy = false;
    }
    // the landing form's event names, so the monday digest counts both;
    // `from` tells them apart
    if (res.state === 'joined' || res.state === 'failed') {
      window.umami?.track(`seat-${res.state}`, { from: 'episode' });
    }
  }
</script>

{#if open}
  <aside
    class="dock"
    aria-label="subscribe"
    bind:this={dock}
    {onfocusin}
    transition:fade={{ duration: 250 }}
  >
    <div class="bar">
      <form novalidate onsubmit={join}>
        <label for="subscribe-email">get the next dive by email.</label>
        <div class="fieldwrap">
          <input
            id="subscribe-email"
            name="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            placeholder="your@email.com"
            aria-describedby="subscribe-msg"
            required
            readonly={busy}
            bind:value={email}
          />
        </div>
        <button class="join" type="submit" aria-disabled={busy}>send</button>
        <button class="x" type="button" aria-label="close" onclick={close}
          >×</button
        >
      </form>
      <!-- always in the page while the bar is: a live region has to exist
           before its message does, or it isn't announced -->
      <p id="subscribe-msg" class="msg" role="status">{message}</p>
    </div>
  </aside>
{/if}

<style>
  /* sticky, not fixed: it rides the bottom of the screen but keeps its own
     place at the end of the page, so the transcript's last lines scroll clear
     of it instead of ending under it. The dock is a plain page-colour band:
     text scrolls under the card and mustn't show through or around it, and a
     shadow would follow the card's hand-drawn corners and leave gaps. It
     reaches 1rem past the card to cover the transcript's now-playing rule too,
     which sits in the gutter at 0.75rem + 2px. */
  .dock {
    position: sticky;
    bottom: 0;
    z-index: 1;
    margin: 3rem -1rem 0;
    padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
    background: #10120a;
  }
  /* the ember card is the landing's .dive */
  .bar {
    container-type: inline-size;
    padding: 0.75rem 1rem;
    border: 1.5px solid #e25822;
    border-radius: 60px 8px 50px 8px / 8px 50px 8px 60px;
  }
  form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'label x'
      'field send';
    gap: 0.4rem 0.6rem;
    align-items: center;
  }
  label {
    grid-area: label;
    font-size: 0.95rem;
  }
  .fieldwrap {
    grid-area: field;
  }
  /* the landing's ring and slab (app.css), a size down for a bar. The input
     stays at 1rem: any smaller and iOS zooms the page on focus. */
  .fieldwrap input {
    padding: 0.6rem 0.9rem;
  }
  .join {
    grid-area: send;
    font-size: 1rem;
    padding: 0.6rem 1.1rem;
  }
  .x {
    grid-area: x;
    justify-self: end;
    width: 2rem;
    height: 2rem;
    padding: 0;
    font: inherit;
    font-size: 1.4rem;
    line-height: 1;
    color: #877d67;
    background: none;
    border: none;
    cursor: pointer;
  }
  @media (hover: hover) {
    .x:hover {
      color: #e7e2da;
    }
  }
  .x:focus-visible {
    outline: 2px solid #f5b942;
    outline-offset: 1px;
  }
  .msg {
    margin: 0;
    color: #f5b942;
    font-size: 0.9rem;
  }
  /* empty, it takes no room */
  .msg:not(:empty) {
    margin-top: 0.5rem;
  }
  /* anything scrolled into view (a transcript button tabbed to, say) stops
     above the bar instead of under it. ponytail: at normal text sizes the
     bar is at most ~13.5rem (stacked, with a message); at 200% text on a
     phone it's taller than this. Measure it (bind:offsetHeight) if that
     combination ever matters */
  :global(html:has(aside.dock)) {
    scroll-padding-bottom: calc(14rem + env(safe-area-inset-bottom));
  }
  /* laid out by the card's own width in rem, so a zoomed page or a bigger
     text size gets the roomier layout too. Too narrow for the field beside
     send (a zoomed phone): send goes under it */
  @container (max-width: 14rem) {
    form {
      grid-template-areas:
        'label x'
        'field field'
        'send send';
    }
  }
  @container (min-width: 32rem) {
    form {
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      grid-template-areas: 'label field send x';
    }
  }
</style>
