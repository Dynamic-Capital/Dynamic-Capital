import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ProviderId, type ProviderSummary } from "../types";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

async function getProvider(
  id: ProviderSummary["id"],
): Promise<ProviderSummary> {
  const { listProviders } = await import("../providers");
  const providers = listProviders();
  const provider = providers.find((entry) => entry.id === id);
  if (!provider) {
    throw new Error(`Provider ${id} not found in listProviders()`);
  }
  return provider;
}

describe("LLM provider availability", () => {
  it("marks Dynamic and open-source providers as ready without env keys", async () => {
    const alwaysOnIds: ProviderId[] = [
      "dynamic-ai",
      "dynamic-agi",
      "dynamic-ags",
      "llama-cpp",
      "vllm",
      "text-generation-inference",
    ];

    for (const id of alwaysOnIds) {
      const provider = await getProvider(id);
      expect(provider.configured).toBe(true);
    }
  });

  it("keeps third-party providers gated behind configuration", async () => {
    const externalIds: ProviderId[] = [
      "openai",
      "anthropic",
      "huggingface",
      "groq",
    ];

    for (const id of externalIds) {
      const provider = await getProvider(id);
      expect(provider.configured).toBe(false);
    }
  });

  it("treats Hugging Face as configured when the access token is present", async () => {
    process.env.HUGGINGFACE_ACCESS_TOKEN = "example-token";
    const provider = await getProvider("huggingface");
    expect(provider.configured).toBe(true);
  });

  it("treats Hugging Face as configured when only the legacy API key is present", async () => {
    delete process.env.HUGGINGFACE_ACCESS_TOKEN;
    process.env.HUGGINGFACE_API_KEY = "legacy-token";
    const provider = await getProvider("huggingface");
    expect(provider.configured).toBe(true);
  });
});
