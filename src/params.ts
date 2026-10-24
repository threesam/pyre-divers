import { defineParams } from '@sveltejs/kit/params';

// listmonk's ids; a route using [x=uuid] 404s anything else before it runs
const matchUuid = (param: string) =>
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu.test(param);

export const params = defineParams({
  uuid: (param) => (matchUuid(param) ? param : undefined),
});
