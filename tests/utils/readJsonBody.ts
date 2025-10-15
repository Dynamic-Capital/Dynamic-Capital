const decoder = new TextDecoder();

type JsonRecord = Record<string, unknown>;

type ArrayBufferLike = ArrayBuffer | ArrayBufferView;

type MaybeBody =
  | BodyInit
  | ArrayBufferLike
  | URLSearchParams
  | FormData
  | null
  | undefined;

function isArrayBufferView(value: unknown): value is ArrayBufferView {
  return value != null && ArrayBuffer.isView(value);
}

function toArray(value: FormData | URLSearchParams): JsonRecord {
  const result: JsonRecord = {};
  for (const [key, entry] of value.entries()) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const current = result[key];
      if (Array.isArray(current)) {
        current.push(entry);
      } else {
        result[key] = [current, entry];
      }
    } else {
      result[key] = entry;
    }
  }
  return result;
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock?.();
  }

  if (chunks.length === 0) {
    return "";
  }

  if (chunks.length === 1) {
    return decoder.decode(chunks[0]);
  }

  let total = 0;
  for (const chunk of chunks) {
    total += chunk.byteLength;
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoder.decode(merged);
}

async function bodyToText(body: MaybeBody | JsonRecord): Promise<string> {
  if (body == null) return "";

  if (typeof body === "string") {
    return body;
  }

  if (isArrayBufferView(body)) {
    return decoder.decode(
      new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
    );
  }

  if (body instanceof ArrayBuffer) {
    return decoder.decode(new Uint8Array(body));
  }

  if (body instanceof URLSearchParams) {
    return JSON.stringify(toArray(body));
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return JSON.stringify(toArray(body));
  }

  if (body instanceof ReadableStream) {
    return await readStream(body);
  }

  if (typeof (body as Blob | Response | Request)?.text === "function") {
    try {
      return await (body as Blob | Response | Request).text();
    } catch {
      // fall through to Response handling below
    }
  }

  try {
    const response = new Response(body as BodyInit | null);
    return await response.text();
  } catch {
    return "";
  }
}

export async function readJsonBody(
  body: MaybeBody | JsonRecord,
): Promise<JsonRecord> {
  if (body instanceof URLSearchParams) {
    return toArray(body);
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return toArray(body);
  }

  const text = await bodyToText(body);
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
