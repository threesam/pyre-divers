import type { ParamMatcher } from '@sveltejs/kit';

// listmonk's ids; a route using [x=uuid] 404s anything else before it runs
export const match: ParamMatcher = (param) =>
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu.test(param);
