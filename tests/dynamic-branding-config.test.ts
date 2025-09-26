import test from "node:test";
import {
  deepEqual as assertDeepEqual,
  equal as assertEqual,
  notEqual as assertNotEqual,
} from "node:assert/strict";

import {
  dynamicBranding,
  exportDynamicBranding,
  importDynamicBranding,
} from "../apps/web/resources/dynamic-branding.config.ts";
import { normalizeThemePassTokens } from "../apps/web/utils/theme-pass.ts";

const ORIGINAL_PRIMARY = dynamicBranding.palette.light.primary;
const ORIGINAL_TAGLINE = dynamicBranding.metadata.tagline;

test("exportDynamicBranding returns an immutable snapshot", () => {
  const snapshot = exportDynamicBranding();
  assertNotEqual(snapshot, dynamicBranding);
  assertNotEqual(snapshot.palette, dynamicBranding.palette);
  assertNotEqual(snapshot.tokens.light, dynamicBranding.tokens.light);

  snapshot.palette.light.primary = "1 1% 1%";
  snapshot.tokens.light["--primary"] = "1 1% 1%";

  assertEqual(dynamicBranding.palette.light.primary, ORIGINAL_PRIMARY);
  assertEqual(dynamicBranding.tokens.light["--primary"], ORIGINAL_PRIMARY);
});

test("importDynamicBranding merges overrides without mutating base config", () => {
  const merged = importDynamicBranding({
    palette: {
      light: {
        primary: "10 82% 52%",
      },
    },
    metadata: {
      tagline: "Test tagline",
    },
  });

  assertEqual(merged.palette.light.primary, "10 82% 52%");
  assertEqual(merged.metadata.tagline, "Test tagline");
  assertEqual(merged.tokens.light["--primary"], "10 82% 52%");

  assertEqual(dynamicBranding.palette.light.primary, ORIGINAL_PRIMARY);
  assertEqual(dynamicBranding.metadata.tagline, ORIGINAL_TAGLINE);
  assertEqual(dynamicBranding.tokens.light["--primary"], ORIGINAL_PRIMARY);
});

test("importDynamicBranding allows token overrides to opt-out of automation", () => {
  const merged = importDynamicBranding({
    tokens: {
      light: {
        "--primary": "120 50% 45%",
      },
    },
  });

  assertEqual(merged.tokens.light["--primary"], "120 50% 45%");
  assertEqual(dynamicBranding.tokens.light["--primary"], ORIGINAL_PRIMARY);
});

test("importDynamicBranding applies Theme Pass tokens before manual overrides", () => {
  const themePass = {
    colors: {
      brand: {
        base: "120 75% 40%",
      },
      light: {
        primary: "120 75% 40%",
      },
    },
    effects: {
      motion: {
        durations: {
          fast: "0.2s",
        },
      },
    },
  };

  const merged = importDynamicBranding(
    {
      tokens: {
        light: {
          "--primary": "360 70% 45%",
        },
      },
    },
    themePass,
  );

  assertEqual(merged.tokens.light["--primary"], "360 70% 45%");
  assertEqual(merged.tokens.dark["--dc-brand"], "120 75% 40%");
  assertEqual(merged.tokens.light["--motion-duration-fast"], "0.2s");
});

test("normalizeThemePassTokens returns defaults when validation fails", () => {
  const result = normalizeThemePassTokens(
    { colors: { light: { primary: 123 } } },
    dynamicBranding.tokens,
  );

  assertEqual(result, null);
});

test("importDynamicBranding gracefully handles non-object overrides", () => {
  const merged = importDynamicBranding(
    5 as unknown as Parameters<typeof importDynamicBranding>[0],
  );
  assertDeepEqual(merged, exportDynamicBranding());
});
