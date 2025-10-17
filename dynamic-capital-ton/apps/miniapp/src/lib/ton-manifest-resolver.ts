import { TON_MANIFEST_URL_CANDIDATES } from "@shared/ton/manifest";

export type ResolveTonManifestUrlOptions = {
  candidates?: readonly string[];
  timeoutMs?: number;
  fetchImplementation?: typeof fetch;
};

const DEFAULT_TIMEOUT_MS = 2_500;

function contentTypeLooksLikeJson(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const lower = value.toLowerCase();
  return lower.includes("json");
}

async function responseLooksLikeJson(response: Response): Promise<boolean> {
  if (contentTypeLooksLikeJson(response.headers.get("content-type"))) {
    return true;
  }

  try {
    await response.clone().json();
    return true;
  } catch {
    return false;
  }
}

async function requestWithTimeout(
  fetchFn: typeof fetch,
  input: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
): Promise<Response | null> {
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    return await fetchFn(input, {
      method,
      signal: controller?.signal,
      cache: "no-store",
    });
  } catch {
    return null;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function resolveTonManifestUrl({
  candidates = TON_MANIFEST_URL_CANDIDATES,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImplementation,
}: ResolveTonManifestUrlOptions = {}): Promise<string | null> {
  const fetchFn = fetchImplementation ?? globalThis.fetch;

  if (!fetchFn) {
    return null;
  }

  for (const candidate of candidates) {
    const headResponse = await requestWithTimeout(
      fetchFn,
      candidate,
      "HEAD",
      timeoutMs,
    );

    if (
      headResponse?.ok &&
      contentTypeLooksLikeJson(headResponse.headers.get("content-type"))
    ) {
      return candidate;
    }

    const shouldAttemptGet =
      !headResponse ||
      headResponse.status === 405 ||
      !headResponse.ok ||
      (headResponse.ok &&
        !contentTypeLooksLikeJson(
          headResponse.headers.get("content-type"),
        ));

    if (!shouldAttemptGet) {
      continue;
    }

    const getResponse = await requestWithTimeout(
      fetchFn,
      candidate,
      "GET",
      timeoutMs,
    );

    if (getResponse?.ok && (await responseLooksLikeJson(getResponse))) {
      return candidate;
    }
  }

  return null;
}
