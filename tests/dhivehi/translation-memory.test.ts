import {
  assert,
  assertEquals,
  assertGreater,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { TranslationMemory } from "../../tools/dhivehi/translation-memory.ts";

Deno.test("stores and retrieves translation segments", () => {
  const memory = new TranslationMemory();
  const inserted = memory.add({
    id: "loan-overdue",
    source: "Loan repayment overdue",
    target: "ލޯން ރިޕޭމެންޓް ޑިލޭ",
    metadata: { domain: "finance", tags: ["support"] },
  });

  const fetched = memory.get("loan-overdue");
  assertEquals(fetched?.target, inserted.target);
});

Deno.test("finds fuzzy matches for similar english prompts", () => {
  const memory = new TranslationMemory();
  memory.bulkImport([
    {
      id: "late-fee",
      source: "Late fee explanation",
      target: "ލޭޓް ފީ ބަޔަކުން",
      metadata: { domain: "finance" },
    },
    {
      id: "repayment-plan",
      source: "Repayment plan",
      target: "ރިޕޭމެންޓް ޕްލޭން",
      metadata: { domain: "finance" },
    },
  ]);

  const matches = memory.match("Explain the late fee", { minimumScore: 0.19 });
  assert(matches.length >= 1);
  assertEquals(matches[0].id, "late-fee");
  assertGreater(matches[0].score, 0.19);
});

Deno.test("matches thaana queries against english sources", () => {
  const memory = new TranslationMemory();
  memory.add({
    id: "repayment-plan",
    source: "Repayment plan",
    target: "ރިޕޭމެންޓް ޕްލޭން",
    metadata: { domain: "finance" },
  });

  const matches = memory.match("ރިޕޭމެންޓް", { minimumScore: 0.3 });
  assert(matches.length === 1);
  assertEquals(matches[0].id, "repayment-plan");
  assertGreater(matches[0].score, 0.3);
});

Deno.test("boosts matches using romanized target metadata", () => {
  const memory = new TranslationMemory([]);
  memory.add({
    id: "romanized-greeting",
    source: "Formal greeting",
    target: "ހަލޯ",
    metadata: { tags: ["roman:halo"] },
  });

  const matches = memory.match("halo", { minimumScore: 0.35 });
  assertEquals(matches.length, 1);
  assertEquals(matches[0].id, "romanized-greeting");
  assertGreater(matches[0].score, 0.35);
});
