export function smartCompress(
  body: Uint8Array,
  req: Request,
  contentType: string,
): { stream: ReadableStream | Uint8Array; encoding?: string } {
  const accept = req.headers.get("accept-encoding")?.toLowerCase() ?? "";

  // Only compress html and json responses
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

  for (const { name } of encodings) {
    if (name === "br" || name === "gzip") {
      try {
        const stream = new Blob([body]).stream().pipeThrough(
          new CompressionStream(name),
        );
        return { stream, encoding: name };
      } catch {
        // fall through
      }
    }
  }

  return { stream: body };
}

