import { defineEnvVars } from '@sveltejs/kit/env';

// read at runtime, unset = ''. the signup key lives in vercel; PREVIEW_DRAFTS
// is a local-only switch (src/lib/server/queries.ts)
export const variables = defineEnvVars({
  LISTMONK_SIGNUP_TOKEN: { schema: (input) => input ?? '' },
  PREVIEW_DRAFTS: { schema: (input) => input ?? '' },
});
