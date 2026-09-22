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

## Before a PR

`npm run check` (lint + typecheck + format + tests) must be green.
