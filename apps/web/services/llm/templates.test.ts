import { listPromptTemplates } from "./templates.ts";
import { promptTemplateSchema } from "./schema.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

declare const Deno: {
  test: (name: string, fn: () => void | Promise<void>) => void;
};

Deno.test("listPromptTemplates returns validated templates", () => {
  const templates = listPromptTemplates();
  assert(Array.isArray(templates), "Expected templates to be an array");
  assert(
    templates.length > 0,
    "Expected at least one template to be registered",
  );
  for (const template of templates) {
    promptTemplateSchema.parse(template);
  }
});
