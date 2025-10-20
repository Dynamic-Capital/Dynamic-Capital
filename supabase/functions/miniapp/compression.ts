import { optionalEnv } from "../_shared/env.ts";

export const DISABLE_HTML_COMPRESSION = optionalEnv(
  "DISABLE_HTML_COMPRESSION",
) === "true";

export function smartCompress(
  body: Uint8Array,
  req: Request,
  contentType: string,
): { stream: ReadableStream | Uint8Array; encoding?: string } {
  const accept = req.headers.get("accept-encoding")?.toLowerCase() ?? "";

  if (DISABLE_HTML_COMPRESSION && contentType.startsWith("text/html")) {
    console.log("[miniapp] HTML compression disabled");
    return { stream: body };
  }

  const compressible = contentType.startsWith("text/html") ||
    contentType.startsWith("application/json");
  if (!compressible || !accept) return { stream: body };

  const encodings = accept.split(",")
    .map((e) => {
      const [name, q = "q=1"] = e.trim().split(";");
      const quality = parseFloat(q.split("=")[1] || "1");
      return { name: name.trim(), quality };
    })
    .filter((e) => e.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  console.log(
    `[miniapp] Accept-Encoding: ${accept}, parsed:`,
    encodings.map((e) => `${e.name}(${e.quality})`).join(", "),
  );

  for (const { name } of encodings) {
    if (name === "br" || name === "gzip") {
      try {
        const stream = new Blob([body as BlobPart]).stream().pipeThrough(
          new CompressionStream(name as CompressionFormat),
        );
        console.log(`[miniapp] Using compression: ${name}`);
        return { stream, encoding: name };
      } catch (e) {
        console.warn(`[miniapp] Compression ${name} failed:`, e);
      }
    }
  }

  console.log("[miniapp] No compression used");
  return { stream: body };
}
