import { guardHealthRequest } from "../_shared/health.ts";
import { jsonResponse } from "../_shared/http.ts";
import { healthPayload } from "../_shared/commit.ts";
import { registerHandler } from "../_shared/serve.ts";

export const handler = registerHandler((req) => {
  const guard = guardHealthRequest(req, ["GET"]);
  if (guard) return guard;

  return jsonResponse(healthPayload(), {}, req);
});

export default handler;
