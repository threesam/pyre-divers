import { defineEnvVars } from '@sveltejs/kit/env';

// unset reads as '' — queries.ts treats a falsy DATABASE_URL as "no db"
// (zero episodes, valid empty feed), so '' is the right fallback.
export const variables = defineEnvVars({
  DATABASE_URL: { schema: (input) => input ?? '' },
  PREVIEW_DRAFTS: { schema: (input) => input ?? '' },
});
