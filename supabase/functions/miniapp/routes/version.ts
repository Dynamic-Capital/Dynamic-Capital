import { smartCompress } from "../lib/compress.ts";

export function versionResponse(req: Request): Response {
  const versionData = {
    name: "miniapp",
    ts: new Date().toISOString(),
  };
  const body = new TextEncoder().encode(JSON.stringify(versionData));
  const contentType = "application/json; charset=utf-8";
  const { stream, encoding } = smartCompress(body, req, contentType);
  const headers: Record<string, string> = {
    "content-type": contentType,
    "x-served-from": "version-endpoint",
  };
  if (encoding) headers["content-encoding"] = encoding;
  return new Response(stream, { status: 200, headers });
}

