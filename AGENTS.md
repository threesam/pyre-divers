# AGENTS.md — pyre divers

Working guide for AI agents on this repo (SvelteKit, Svelte 5 runes).

## Svelte: use the Svelte MCP, every time

Any change to a `.svelte` / `.svelte.ts` file goes through the official Svelte
MCP (`svelte` server), not memory:

- **Before writing:** `list-sections` → `get-documentation` for the APIs you're
  touching (runes, `{@attach}`, snippets, `$app/state`, form actions…). Svelte 5
  and Kit move fast; training data lags.
- **After writing:** run `svelte-autofixer` on every component you created or
  changed, fix what it reports, and re-run until it comes back clean. Do this
  before `npm run check`, not instead of it.

## The list

Signups go through this site's `/subscribe` route (`src/routes/subscribe`), which adds the address with listmonk's admin API as the API user `pyre-signup`. Its key is `LISTMONK_SIGNUP_TOKEN` in Vercel (production and preview). Its role (`pyre signup`) can add subscribers to the pyre divers list and read every list. listmonk needs the read access to add the list to someone who is already on another one. It cannot touch settings, campaigns or lists. The list is **private** in listmonk, so listmonk's public signup API refuses it. A bot used that API to add 33 addresses in October 2026. Don't make the list public again. If signups fail, check the key first: listmonk loads API keys when it starts.

## Before a PR

`npm run check` (lint + typecheck + format + tests) must be green.
