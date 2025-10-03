import { transliterateLatinToThaana } from "./transliteration.ts";

export type ThaanaKeyModifier = "default" | "shift" | "punctuation";

export interface ThaanaKeyBinding {
  /** Latin keyboard character captured by the Thaana keyboard hook. */
  input: string;
  /** Thaana glyph inserted into the target element. */
  output: string;
  /** Which keyboard modifier is required to produce the glyph. */
  modifier: ThaanaKeyModifier;
  /** Optional short description used by UI tooltips or docs. */
  description?: string;
  /** Optional semantic label used for analytics or UI grouping. */
  label?: string;
}

export interface ThaanaKeyboardLayoutRow {
  /** Stable identifier so downstream UIs can track layout rows. */
  id: string;
  /** Human readable label (e.g. displayed in configuration menus). */
  label: string;
  /** The bindings that should be rendered for the row. */
  keys: readonly ThaanaKeyBinding[];
}

export interface CreateThaanaKeyboardLayoutOptions {
  /**
   * Include upper-case / Shift bindings alongside base keys. Enabled by default
   * so virtual keyboards mirror physical layouts.
   */
  includeShiftRows?: boolean;
  /** Include punctuation bindings commonly swapped in Thaana layouts. */
  includePunctuationRow?: boolean;
}

type BindingDefinition = readonly [
  input: string,
  output: string,
  modifier: ThaanaKeyModifier,
  description?: string,
  label?: string,
];

const KEYBOARD_BINDINGS_DEFINITION: readonly BindingDefinition[] = [
  ["q", "ް", "default", "Sukun / virama"],
  ["w", "އ", "default", "Alifu"],
  ["e", "ެ", "default", "Short vowel 'e'"],
  ["r", "ރ", "default", "Raa"],
  ["t", "ތ", "default", "Thaa"],
  ["y", "ޔ", "default", "Yaamu"],
  ["u", "ު", "default", "Short vowel 'u'"],
  ["i", "ި", "default", "Short vowel 'i'"],
  ["o", "ޮ", "default", "Short vowel 'o'"],
  ["p", "ޕ", "default", "Pey"],
  ["a", "ަ", "default", "Short vowel 'a'"],
  ["s", "ސ", "default", "Seenu"],
  ["d", "ދ", "default", "Dhaa"],
  ["f", "ފ", "default", "Faafu"],
  ["g", "ގ", "default", "Gaafu"],
  ["h", "ހ", "default", "Haa"],
  ["j", "ޖ", "default", "Jeem"],
  ["k", "ކ", "default", "Kaafu"],
  ["l", "ލ", "default", "Laamu"],
  ["z", "ޒ", "default", "Zey"],
  ["x", "×", "default", "Multiplication sign"],
  ["c", "ޗ", "default", "Chaa"],
  ["v", "ވ", "default", "Vaavu"],
  ["b", "ބ", "default", "Bey"],
  ["n", "ނ", "default", "Noonu"],
  ["m", "މ", "default", "Meem"],
  ["Q", "ޤ", "shift", "Ghain / Qaafu"],
  ["W", "ޢ", "shift", "Ayn"],
  ["E", "ޭ", "shift", "Long vowel 'ey'"],
  ["R", "ޜ", "shift", "Zaa"],
  ["T", "ޓ", "shift", "Ttaa"],
  ["Y", "ޠ", "shift", "Tah"],
  ["U", "ޫ", "shift", "Long vowel 'oo'"],
  ["I", "ީ", "shift", "Long vowel 'ee'"],
  ["O", "ޯ", "shift", "Long vowel 'oa'"],
  ["P", "÷", "shift", "Division sign"],
  ["A", "ާ", "shift", "Long vowel 'aa'"],
  ["S", "ށ", "shift", "Sheen"],
  ["D", "ޑ", "shift", "Retroflex dha"],
  ["F", "ﷲ", "shift", "Ligature Allah"],
  ["G", "ޣ", "shift", "Ghain"],
  ["H", "ޙ", "shift", "Hhaa"],
  ["J", "ޛ", "shift", "Zain"],
  ["K", "ޚ", "shift", "Khaa"],
  ["L", "ޅ", "shift", "Lhaviyani"],
  ["Z", "ޡ", "shift", "Dad"],
  ["X", "ޘ", "shift", "Tah"],
  ["C", "ޝ", "shift", "Sha"],
  ["V", "ޥ", "shift", "Vaviyani"],
  ["B", "ޞ", "shift", "Saa"],
  ["N", "ޏ", "shift", "Nya"],
  ["M", "ޟ", "shift", "Dhaa retroflex"],
  [",", "،", "punctuation", "Arabic comma"],
  [";", "؛", "punctuation", "Arabic semicolon"],
  ["?", "؟", "punctuation", "Arabic question mark"],
  ["[", "]", "punctuation", "Swap bracket"],
  ["]", "[", "punctuation", "Swap bracket"],
  ["(", ")", "punctuation", "Swap parenthesis"],
  [")", "(", "punctuation", "Swap parenthesis"],
  ["{", "}", "punctuation", "Swap brace"],
  ["}", "{", "punctuation", "Swap brace"],
  ["<", ">", "punctuation", "Swap chevron"],
  [">", "<", "punctuation", "Swap chevron"],
] as const;

export const THAANA_KEYBOARD_BINDINGS: readonly ThaanaKeyBinding[] = Object
  .freeze(KEYBOARD_BINDINGS_DEFINITION.map((definition) => {
    const [input, output, modifier, description, label] = definition;
    return Object.freeze({
      input,
      output,
      modifier,
      description,
      label,
    }) as ThaanaKeyBinding;
  }));

const BINDING_LOOKUP = new Map<string, ThaanaKeyBinding>(
  THAANA_KEYBOARD_BINDINGS.map((binding) => [binding.input, binding]),
);

const DEFAULT_LAYOUT_DEFINITION: readonly (readonly string[])[] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const SHIFT_LAYOUT_DEFINITION: readonly (readonly string[])[] = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const PUNCTUATION_LAYOUT_DEFINITION: readonly string[] = [
  ",",
  ";",
  "?",
  "[",
  "]",
  "(",
  ")",
  "{",
  "}",
  "<",
  ">",
];

function resolveBindingOrThrow(key: string): ThaanaKeyBinding {
  const binding = BINDING_LOOKUP.get(key);
  if (!binding) {
    throw new Error(`No Thaana keyboard binding registered for \"${key}\"`);
  }
  return binding;
}

function createLayoutRow(
  id: string,
  label: string,
  keys: readonly string[],
): ThaanaKeyboardLayoutRow {
  const bindings = keys.map((key) => resolveBindingOrThrow(key));
  return Object.freeze({ id, label, keys: Object.freeze(bindings) });
}

export function createThaanaKeyboardLayout(
  options: CreateThaanaKeyboardLayoutOptions = {},
): readonly ThaanaKeyboardLayoutRow[] {
  const {
    includeShiftRows = true,
    includePunctuationRow = true,
  } = options;

  const rows: ThaanaKeyboardLayoutRow[] = [];

  DEFAULT_LAYOUT_DEFINITION.forEach((row, index) => {
    rows.push(createLayoutRow(
      `default-row-${index + 1}`,
      `Default row ${index + 1}`,
      row,
    ));
  });

  if (includeShiftRows) {
    SHIFT_LAYOUT_DEFINITION.forEach((row, index) => {
      rows.push(createLayoutRow(
        `shift-row-${index + 1}`,
        `Shift row ${index + 1}`,
        row,
      ));
    });
  }

  if (includePunctuationRow) {
    rows.push(createLayoutRow(
      "punctuation-row",
      "Punctuation",
      PUNCTUATION_LAYOUT_DEFINITION,
    ));
  }

  return Object.freeze(rows.slice());
}

export const DEFAULT_THAANA_KEYBOARD_LAYOUT = createThaanaKeyboardLayout();

export function resolveThaanaKeyBinding(
  input: string,
): ThaanaKeyBinding | undefined {
  return BINDING_LOOKUP.get(input);
}

export function mapKeyboardInputToThaana(input: string): string {
  if (!input) {
    return "";
  }

  let output = "";

  for (const char of input) {
    const binding = BINDING_LOOKUP.get(char);
    if (binding) {
      output += binding.output;
      continue;
    }

    output += char;
  }

  return output;
}

export function projectLatinToThaanaKeyboardSequence(latin: string): string {
  if (!latin) {
    return "";
  }

  const transliterated = transliterateLatinToThaana(latin, {
    preserveUnknown: true,
    caseSensitive: false,
  });

  const keySequence: string[] = [];

  outer: for (const char of transliterated) {
    for (const [input, binding] of BINDING_LOOKUP) {
      if (binding.output === char) {
        keySequence.push(input);
        continue outer;
      }
    }

    keySequence.push(char);
  }

  return keySequence.join("");
}
