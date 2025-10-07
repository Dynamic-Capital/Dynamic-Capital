import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const DYNAMIC_AI_FETCH_OVERRIDE = Symbol.for(
  "dynamic-capital.dynamic-ai.fetch-override",
);

describe("callDynamicAiVoiceToText", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    process.env = { ...ORIGINAL_ENV };
    process.env.DYNAMIC_AI_VOICE_TO_TEXT_URL =
      "https://dynamic.test/transcribe";
    process.env.DYNAMIC_AI_VOICE_TO_TEXT_KEY = "test-secret";
    process.env.DYNAMIC_AI_VOICE_TO_TEXT_MODEL = "test-model";
    process.env.DYNAMIC_AI_VOICE_TO_TEXT_TIMEOUT_MS = "1000";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as Record<PropertyKey, unknown>)[
      DYNAMIC_AI_FETCH_OVERRIDE
    ];
    process.env = ORIGINAL_ENV;
  });

  it("aborts timed out requests even when an external signal is supplied", async () => {
    expect.assertions(6);

    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const abortSignal = init?.signal;
        expect(abortSignal).toBeDefined();
        expect(abortSignal?.aborted).toBe(false);

        return new Promise<Response>((_resolve, reject) => {
          abortSignal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      },
    );

    (globalThis as Record<PropertyKey, unknown>)[DYNAMIC_AI_FETCH_OVERRIDE] =
      fetchMock;

    const { callDynamicAiVoiceToText } = await import(
      "../dynamic-ai/voice-to-text"
    );

    const externalController = new AbortController();

    const pending = callDynamicAiVoiceToText({
      file: new Blob(["dummy"], { type: "audio/webm" }),
      signal: externalController.signal,
    });

    const handled = pending.catch((error) => error);

    await vi.advanceTimersByTimeAsync(1_000);

    await expect(handled).resolves.toMatchObject({ name: "AbortError" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchInit = fetchMock.mock.calls[0]?.[1];
    const abortSignal = fetchInit?.signal as AbortSignal | undefined;
    expect(abortSignal?.aborted).toBe(true);
    expect(externalController.signal.aborted).toBe(false);
  });

  it("propagates already-aborted external signals to the fetch controller", async () => {
    expect.assertions(4);

    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const abortSignal = init?.signal as AbortSignal | undefined;
        expect(abortSignal).toBeDefined();
        expect(abortSignal?.aborted).toBe(true);

        throw new DOMException("Aborted", "AbortError");
      },
    );

    (globalThis as Record<PropertyKey, unknown>)[DYNAMIC_AI_FETCH_OVERRIDE] =
      fetchMock;

    const { callDynamicAiVoiceToText } = await import(
      "../dynamic-ai/voice-to-text"
    );

    const externalController = new AbortController();
    externalController.abort(new Error("external"));

    await expect(
      callDynamicAiVoiceToText({
        file: new Blob(["dummy"], { type: "audio/webm" }),
        signal: externalController.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
