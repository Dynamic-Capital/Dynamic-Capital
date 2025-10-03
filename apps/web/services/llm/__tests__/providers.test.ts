import { describe, expect, it } from "vitest";

import { listProviders } from "../providers";
import { type ProviderId, type ProviderSummary } from "../types";

function getProvider(id: ProviderSummary["id"]): ProviderSummary {
  const providers = listProviders();
  const provider = providers.find((entry) => entry.id === id);
  if (!provider) {
    throw new Error(`Provider ${id} not found in listProviders()`);
  }
  return provider;
}

describe("LLM provider availability", () => {
  it("marks dynamic providers as configured even without env keys", () => {
    const dynamicIds: ProviderId[] = [
      "dynamic-ai",
      "dynamic-agi",
      "dynamic-ags",
    ];

    for (const id of dynamicIds) {
      const provider = getProvider(id);
      expect(provider.configured).toBe(true);
    }
  });

  it("keeps third-party providers gated behind configuration", () => {
    const externalIds: ProviderId[] = ["openai", "anthropic", "groq"];

    for (const id of externalIds) {
      const provider = getProvider(id);
      expect(provider.configured).toBe(false);
    }
  });
});
