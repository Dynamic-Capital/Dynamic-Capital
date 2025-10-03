import { assert, assertEquals } from "../asserts.ts";
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
  assertEquals(results[0].term, "repayment");
});

Deno.test("thaana queries match glossary terms with latin entries", () => {
  const glossary = new Glossary();
  const results = glossary.search("ލޯން", { minimumScore: 0.3 });
  assertEquals(results[0].term, "loan");
});
