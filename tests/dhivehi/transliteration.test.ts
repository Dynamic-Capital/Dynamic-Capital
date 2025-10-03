import { assertAlmostEquals, assertEquals } from "../asserts.ts";
import {
  scoreTransliterationPair,
  transliterateLatinToThaana,
  transliterateThaanaToLatin,
} from "../../tools/dhivehi/transliteration.ts";

Deno.test("transliterates latin syllables into thaana characters", () => {
  const result = transliterateLatinToThaana("thaana");
  assertEquals(result, "ތާނަ");
});

Deno.test("supports consonant digraphs like shaviyani", () => {
  const result = transliterateLatinToThaana("shaviyani");
  assertEquals(result, "ށަވިޔަނި");
});

Deno.test("keeps unknown characters when requested", () => {
  const result = transliterateLatinToThaana("loan #42", {
    preserveUnknown: true,
  });
  assertEquals(result, "ލޯނ #42");
});

Deno.test("drops unknown characters when disabled", () => {
  const result = transliterateLatinToThaana("loan #42", {
    preserveUnknown: false,
  });
  assertEquals(result, "ލޯނ");
});

Deno.test("scores transliteration quality using levenshtein", () => {
  const pair = scoreTransliterationPair("mvr", "މވރ");
  assertAlmostEquals(pair.score, 1, 1e-6);
});

Deno.test("can reverse transliterate thaana back to latin", () => {
  const latin = transliterateThaanaToLatin("ތާނަ");
  assertEquals(latin, "thaana");
});
