import { assertEquals, assertExists } from "../asserts.ts";
import {
  createThaanaKeyboardLayout,
  DEFAULT_THAANA_KEYBOARD_LAYOUT,
  mapKeyboardInputToThaana,
  projectLatinToThaanaKeyboardSequence,
  resolveThaanaKeyBinding,
  THAANA_KEYBOARD_BINDINGS,
} from "../../tools/dhivehi/thaana-input-toolkit.ts";

Deno.test("exposes baseline key bindings for Thaana keyboard", () => {
  const binding = resolveThaanaKeyBinding("q");
  assertExists(binding);
  assertEquals(binding.output, "ް");
  assertEquals(binding.modifier, "default");
});

Deno.test("maps keyboard input sequences into Thaana glyphs", () => {
  const output = mapKeyboardInputToThaana("tAna");
  assertEquals(output, "ތާނަ");
});

Deno.test("supports punctuation swaps defined by aharen/thaana-keyboard", () => {
  const output = mapKeyboardInputToThaana("Hello?");
  assertEquals(output, "ޙެލލޮ؟");
});

Deno.test("default layout includes shift and punctuation rows", () => {
  const layout = DEFAULT_THAANA_KEYBOARD_LAYOUT;
  assertEquals(layout.length, 7);
  assertEquals(layout[0].keys.length, 10);
  assertEquals(layout.at(-1)?.id, "punctuation-row");
});

Deno.test("layout builder can omit shift rows when requested", () => {
  const layout = createThaanaKeyboardLayout({
    includeShiftRows: false,
  });
  assertEquals(layout.length, 4);
});

Deno.test("can project latin words into keyboard sequence for replay", () => {
  const sequence = projectLatinToThaanaKeyboardSequence("thaana");
  const rendered = mapKeyboardInputToThaana(sequence);
  assertEquals(rendered, "ތާނަ");
});

Deno.test("key bindings remain immutable", () => {
  const binding = THAANA_KEYBOARD_BINDINGS[0];
  try {
    (binding as { input: string }).input = "";
  } catch {
    // Ignore if runtime prevents mutation directly.
  }
  assertEquals(THAANA_KEYBOARD_BINDINGS[0].input, "q");
});
