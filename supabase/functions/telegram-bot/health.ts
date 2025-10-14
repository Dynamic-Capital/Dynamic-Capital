import {
  buildBaseHeaderApplier,
  DEFAULT_ALLOWED_METHODS,
} from "./response-headers.ts";

export function serveWebhook(req: Request): Response {
  const allowedMethods = DEFAULT_ALLOWED_METHODS;
  const withBaseHeaders = buildBaseHeaderApplier(allowedMethods);

  if (req.method === "OPTIONS") {
    return withBaseHeaders(new Response(null, { status: 204 }));
  }

  if (req.method === "HEAD") {
    return withBaseHeaders(new Response(null, { status: 200 }));
  }

  if (req.method === "GET") {
    return withBaseHeaders(
      new Response(JSON.stringify({ ok: false, error: "Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  return withBaseHeaders(
    new Response(JSON.stringify({ ok: false, error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    }),
  );
}
