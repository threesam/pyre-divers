import { defineParams } from '@sveltejs/kit/params';

// listmonk's ids; a route using [x=uuid] 404s anything else before it runs
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;

export const params = defineParams({
  uuid: (param) => (UUID.test(param) ? param : undefined),
});
