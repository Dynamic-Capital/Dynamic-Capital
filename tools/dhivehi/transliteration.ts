import { levenshteinSimilarity } from "./utils.ts";

export interface TransliterationRule {
  /** Latin characters that should be replaced. */
  latin: string;
  /** Thaana character to use in place of the Latin sequence. */
  thaana: string;
  /** Optional human readable description used by tooling. */
  description?: string;
}

export interface TransliterationOptions {
  /**
   * When true the transliterator keeps characters it does not know about.
   * When false the function will drop unknown characters entirely.
   */
  preserveUnknown?: boolean;
  /**
   * Toggle case sensitive handling. When set to `false` the input is lowered
   * before applying rules while still respecting multi character digraphs.
   */
  caseSensitive?: boolean;
}

const MULTI_CHARACTER_RULES: TransliterationRule[] = [
  { latin: "aa", thaana: "ާ", description: "Long vowel 'aa'" },
  { latin: "ee", thaana: "ީ", description: "Long vowel 'ee'" },
  { latin: "ii", thaana: "ީ", description: "Long vowel 'ii'" },
  { latin: "oo", thaana: "ޫ", description: "Long vowel 'oo'" },
  { latin: "uu", thaana: "ޫ", description: "Long vowel 'uu'" },
  { latin: "ey", thaana: "ޭ", description: "Diphthong 'ey'" },
  { latin: "oa", thaana: "ޯ", description: "Diphthong 'oa'" },
  { latin: "ai", thaana: "ައި", description: "Diphthong 'ai'" },
  { latin: "au", thaana: "ައު", description: "Diphthong 'au'" },
  { latin: "sh", thaana: "ށ", description: "Sheen" },
  { latin: "lh", thaana: "ޅ", description: "Lhaviyani" },
  { latin: "gn", thaana: "ޏ", description: "Gnavi" },
  { latin: "ch", thaana: "ޗ", description: "Chaa" },
  { latin: "th", thaana: "ތ", description: "Thaa" },
  { latin: "dh", thaana: "ދ", description: "Dhaa" },
  { latin: "kh", thaana: "ޚ", description: "Khaa" },
  { latin: "gh", thaana: "ޣ", description: "Ghaa" },
  { latin: "hh", thaana: "ޙ", description: "Hhaa" },
  { latin: "zh", thaana: "ޛ", description: "Zaa" },
  { latin: "ph", thaana: "ޕ", description: "Phaa" },
  { latin: "q", thaana: "ް", description: "Sukun" },
];

const SINGLE_CHARACTER_RULES: Record<string, TransliterationRule> = {
  a: { latin: "a", thaana: "ަ", description: "Short vowel" },
  b: { latin: "b", thaana: "ބ", description: "Bey" },
  c: { latin: "c", thaana: "ޗ", description: "Chaa" },
  d: { latin: "d", thaana: "ދ", description: "Dhaa" },
  e: { latin: "e", thaana: "ެ", description: "Short vowel" },
  f: { latin: "f", thaana: "ފ", description: "Faafu" },
  g: { latin: "g", thaana: "ގ", description: "Gaafu" },
  h: { latin: "h", thaana: "ހ", description: "Haa" },
  i: { latin: "i", thaana: "ި", description: "Short vowel" },
  j: { latin: "j", thaana: "ޖ", description: "Jeem" },
  k: { latin: "k", thaana: "ކ", description: "Kaafu" },
  l: { latin: "l", thaana: "ލ", description: "Laamu" },
  m: { latin: "m", thaana: "މ", description: "Meem" },
  n: { latin: "n", thaana: "ނ", description: "Noonu" },
  o: { latin: "o", thaana: "ޮ", description: "Short vowel" },
  p: { latin: "p", thaana: "ޕ", description: "Pey" },
  q: { latin: "q", thaana: "ް", description: "Sukun" },
  r: { latin: "r", thaana: "ރ", description: "Raa" },
  s: { latin: "s", thaana: "ސ", description: "Seenu" },
  t: { latin: "t", thaana: "ޓ", description: "Ttaa" },
  u: { latin: "u", thaana: "ު", description: "Short vowel" },
  v: { latin: "v", thaana: "ވ", description: "Vaavu" },
  w: { latin: "w", thaana: "އ", description: "Alif carrier" },
  x: { latin: "x", thaana: "×", description: "Multiplication sign" },
  y: { latin: "y", thaana: "ޔ", description: "Yaamu" },
  z: { latin: "z", thaana: "ޒ", description: "Zey" },
  "'": { latin: "'", thaana: "އ", description: "Glottal stop" },
  '"': { latin: '"', thaana: '"', description: "Quotation mark" },
  ",": { latin: ",", thaana: "،", description: "Arabic comma" },
  ".": { latin: ".", thaana: ".", description: "Period" },
  "?": { latin: "?", thaana: "؟", description: "Arabic question mark" },
  ";": { latin: ";", thaana: "؛", description: "Arabic semicolon" },
  "[": { latin: "[", thaana: "]" },
  "]": { latin: "]", thaana: "[" },
  "(": { latin: "(", thaana: ")" },
  ")": { latin: ")", thaana: "(" },
  "<": { latin: "<", thaana: ">" },
  ">": { latin: ">", thaana: "<" },
  "{": { latin: "{", thaana: "}" },
  "}": { latin: "}", thaana: "{" },
  " ": { latin: " ", thaana: " " },
};

const ORDERED_RULES = [...MULTI_CHARACTER_RULES].sort((a, b) =>
  b.latin.length - a.latin.length
);

function sanitizeInput(input: string, caseSensitive: boolean): string {
  return caseSensitive ? input : input.toLowerCase();
}

export function transliterateLatinToThaana(
  input: string,
  options: TransliterationOptions = {},
): string {
  const { preserveUnknown = true, caseSensitive = false } = options;
  const sanitized = sanitizeInput(input, caseSensitive);
  let output = "";
  let cursor = 0;

  while (cursor < sanitized.length) {
    const remaining = sanitized.slice(cursor);
    const rule = ORDERED_RULES.find((candidate) =>
      remaining.startsWith(candidate.latin)
    );

    if (rule) {
      output += rule.thaana;
      cursor += rule.latin.length;
      continue;
    }

    const current = sanitized[cursor];
    const singleRule = SINGLE_CHARACTER_RULES[current];

    if (singleRule) {
      output += singleRule.thaana;
      cursor += 1;
      continue;
    }

    if (!preserveUnknown) {
      cursor += 1;
      continue;
    }

    output += input[cursor];
    cursor += 1;
  }

  return preserveUnknown ? output : output.trimEnd();
}

export interface ReverseTransliterationOptions {
  preserveUnknown?: boolean;
}

const REVERSE_RULES = new Map<string, string>();

for (
  const rule of [...ORDERED_RULES, ...Object.values(SINGLE_CHARACTER_RULES)]
) {
  if (!REVERSE_RULES.has(rule.thaana)) {
    REVERSE_RULES.set(rule.thaana, rule.latin);
  }
}

export function transliterateThaanaToLatin(
  input: string,
  options: ReverseTransliterationOptions = {},
): string {
  const { preserveUnknown = true } = options;
  let output = "";

  for (const char of input) {
    const latin = REVERSE_RULES.get(char);

    if (latin) {
      output += latin;
      continue;
    }

    if (!preserveUnknown) {
      continue;
    }

    output += char;
  }

  return output;
}

export interface TransliterationDiff {
  input: string;
  expected: string;
  actual: string;
  score: number;
}

export function scoreTransliterationPair(
  latin: string,
  thaana: string,
): TransliterationDiff {
  const actual = transliterateLatinToThaana(latin);
  const score = actual === thaana ? 1 : levenshteinSimilarity(actual, thaana);

  return {
    input: latin,
    expected: thaana,
    actual,
    score,
  };
}
