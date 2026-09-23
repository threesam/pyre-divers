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
  let joined = $state(false);
  let busy = $state(false);
  let email = $state('');
  let message = $state('');

  onMount(() => {
    open = !hasJoined();
  });

  async function join(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    // cleared first, so a retry that fails the same way is announced again
    message = '';
    const res = await subscribeFlow(email, LISTMONK, fetch);
    busy = false;
    message = res.message;
    if (res.state === 'joined') {
      joined = true;
      rememberJoined();
      // long enough to read the confirmation (and for a screen reader to say
      // it), then out of the reader's way
      setTimeout(() => (open = false), 2600);
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
    transition:fade={{ duration: 250 }}
  >
    <div class="bar">
      {#if !joined}
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
              bind:value={email}
            />
          </div>
          <button class="join" type="submit" disabled={busy}>send</button>
          <button
            class="x"
            type="button"
            aria-label="close"
            onclick={() => (open = false)}>×</button
          >
        </form>
      {/if}
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
     shadow would follow the card's hand-drawn corners and leave gaps. */
  .dock {
    position: sticky;
    bottom: 0;
    z-index: 1;
    margin: 3rem -0.75rem 0;
    padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom));
    background: #10120a;
  }
  /* the ember card is the landing's .dive */
  .bar {
    padding: 0.75rem 1rem;
    border: 1.5px solid #e25822;
    border-radius: 60px 8px 50px 8px / 8px 50px 8px 60px;
  }
  form {
    display: grid;
    grid-template-columns: 1fr auto;
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
  .join:disabled {
    opacity: 0.6;
    cursor: progress;
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
  /* the form above it only while there is one: after a join it's gone */
  form + .msg:not(:empty) {
    margin-top: 0.5rem;
  }
  @media (min-width: 640px) {
    form {
      grid-template-columns: auto 1fr auto auto;
      grid-template-areas: 'label field send x';
    }
  }
</style>
