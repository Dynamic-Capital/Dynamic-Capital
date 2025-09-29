import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { defaultGlossary, Glossary } from "../../tools/dhivehi/glossary.ts";

Deno.test("loads baseline glossary entries", () => {
  const terms = defaultGlossary.list();
  assert(terms.length >= 4);
});

Deno.test("search matches latin queries against thaana terms", () => {
  const glossary = new Glossary();
  const results = glossary.search("loan", { minimumScore: 0.4 });
  assertEquals(results[0].term, "loan");
});

Deno.test("search leverages transliteration for thaana input", () => {
  const glossary = new Glossary();
  const results = glossary.search("ރިޕޭ", { minimumScore: 0.3 });
  assert(results.some((entry) => entry.term === "repayment"));
});
