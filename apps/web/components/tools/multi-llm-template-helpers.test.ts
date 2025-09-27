import {
  applySystemPrompt,
  FALLBACK_TEMPLATE_ID,
  resolveTemplatePrompt,
  selectTemplateForProvider,
} from "./multi-llm-template-helpers.ts";
import { type ChatMessage, type PromptTemplate } from "@/services/llm/types";

function assertEquals<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(
      `Expected ${JSON.stringify(expected)} but received ${
        JSON.stringify(actual)
      }`,
    );
  }
}

function assertArrayEquals<T>(actual: T[], expected: T[]): void {
  if (actual.length !== expected.length) {
    throw new Error(
      `Expected array of length ${expected.length} but received ${actual.length}`,
    );
  }

  for (let index = 0; index < actual.length; index += 1) {
    const actualValue = actual[index];
    const expectedValue = expected[index];
    if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
      throw new Error(
        `Expected element ${index} to equal ${
          JSON.stringify(expectedValue)
        } but received ${JSON.stringify(actualValue)}`,
      );
    }
  }
}

const sampleTemplates: PromptTemplate[] = [
  {
    id: "alpha",
    label: "Alpha",
    description: "",
    providerSuitability: ["openai"],
    prompt: "alpha",
  },
  {
    id: "beta",
    label: "Beta",
    description: "",
    providerSuitability: ["groq"],
    prompt: "beta",
  },
];

declare const Deno: {
  test: (name: string, fn: () => void | Promise<void>) => void;
};

Deno.test("applySystemPrompt inserts a system message when absent", () => {
  const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];
  const result = applySystemPrompt(messages, "system prompt");
  assertArrayEquals(result, [
    { role: "system", content: "system prompt" },
    { role: "user", content: "Hello" },
  ]);
});

Deno.test("applySystemPrompt updates the existing system message", () => {
  const messages: ChatMessage[] = [
    { role: "system", content: "old" },
    { role: "user", content: "Hi" },
  ];
  const result = applySystemPrompt(messages, "updated");
  assertArrayEquals(result, [
    { role: "system", content: "updated" },
    { role: "user", content: "Hi" },
  ]);
});

Deno.test("selectTemplateForProvider returns a provider-specific template when available", () => {
  const result = selectTemplateForProvider(sampleTemplates, "groq");
  assertEquals(result?.id ?? null, "beta");
});

Deno.test("selectTemplateForProvider falls back to the first template when no match exists", () => {
  const result = selectTemplateForProvider(sampleTemplates, "anthropic");
  assertEquals(result?.id ?? null, "alpha");
});

Deno.test("resolveTemplatePrompt falls back to the default string", () => {
  const fallback = "default";
  assertEquals(resolveTemplatePrompt(undefined, fallback), fallback);
  assertEquals(resolveTemplatePrompt(null, fallback), fallback);
});

Deno.test("FALLBACK_TEMPLATE_ID is a stable sentinel value", () => {
  assertEquals(typeof FALLBACK_TEMPLATE_ID, "string");
  assertEquals(FALLBACK_TEMPLATE_ID.length > 0, true);
});
