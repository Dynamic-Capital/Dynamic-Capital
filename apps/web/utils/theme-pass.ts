import { z } from "zod";

export type ThemePreferenceMode = "light" | "dark" | "system";
const THEME_MODES = ["light", "dark", "system"] as const;

function coerceThemeMode(value: unknown): ThemePreferenceMode {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export interface ThemePassMetadata {
  id?: string;
  name?: string;
  description?: string;
  defaultMode: ThemePreferenceMode;
  variables: {
    common: Record<string, string>;
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  partnerAssets: Record<string, string>;
}

export interface ThemePassSelection {
  id: string;
  metadata: ThemePassMetadata;
  selectedAt: number;
}

const themeVariablesSchema = z
  .object({
    common: z.record(z.string()).catch(() => ({})).optional(),
    light: z.record(z.string()).catch(() => ({})).optional(),
    dark: z.record(z.string()).catch(() => ({})).optional(),
  })
  .partial()
  .transform((value) => ({
    common: value.common ?? {},
    light: value.light ?? {},
    dark: value.dark ?? {},
  }));

const metadataSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    defaultMode: z.enum(THEME_MODES).optional(),
    theme: z
      .object({
        mode: z.enum(THEME_MODES).optional(),
        variables: themeVariablesSchema.optional(),
      })
      .partial()
      .optional(),
    cssVariables: z
      .union([
        z.record(z.string()),
        themeVariablesSchema,
      ])
      .optional(),
    variables: themeVariablesSchema.optional(),
    assets: z
      .object({
        partner: z.record(z.string()).optional(),
        variables: z.record(z.string()).optional(),
      })
      .partial()
      .optional(),
    partnerAssets: z.record(z.string()).optional(),
  })
  .catch(() => ({ variables: { common: {}, light: {}, dark: {} } }))
  .transform((raw) => {
    const defaultMode = coerceThemeMode(raw.theme?.mode ?? raw.defaultMode);

    const mergedVariables = mergeThemeVariables([
      toThemeVariableShape(raw.cssVariables),
      raw.variables,
      raw.theme?.variables,
    ]);

    const partnerAssets = {
      ...(raw.partnerAssets ?? {}),
      ...(raw.assets?.partner ?? {}),
      ...(raw.assets?.variables ?? {}),
    };

    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      defaultMode,
      variables: mergedVariables,
      partnerAssets,
    } satisfies ThemePassMetadata;
  });

function toThemeVariableShape(
  value: unknown,
): z.infer<typeof themeVariablesSchema> | undefined {
  if (!value) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    const isFlat = keys.every((key) => typeof record[key] === "string");
    if (isFlat) {
      return {
        common: record as Record<string, string>,
        light: {},
        dark: {},
      };
    }
  }
  try {
    return themeVariablesSchema.parse(value);
  } catch {
    return undefined;
  }
}

function mergeThemeVariables(
  inputs: (z.infer<typeof themeVariablesSchema> | undefined)[],
): ThemePassMetadata["variables"] {
  const merged: ThemePassMetadata["variables"] = {
    common: {},
    light: {},
    dark: {},
  };

  for (const input of inputs) {
    if (!input) continue;
    Object.assign(merged.common, input.common ?? {});
    Object.assign(merged.light, input.light ?? {});
    Object.assign(merged.dark, input.dark ?? {});
  }

  return merged;
}

export function parseThemePassMetadata(input: unknown): ThemePassMetadata {
  return metadataSchema.parse(input);
}

const STORAGE_KEY = "dc-theme-pass";

export function loadStoredThemePass(): ThemePassSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ThemePassSelection;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.id !== "string" || !parsed.id) return null;
    if (!parsed.metadata) return null;
    return parsed;
  } catch (error) {
    console.warn("[theme-pass] Failed to load cached theme pass", error);
    return null;
  }
}

export function storeThemePass(selection: ThemePassSelection | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!selection) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch (error) {
    console.warn("[theme-pass] Failed to persist theme pass", error);
  }
}

const STYLE_ELEMENT_ID = "theme-pass-overrides";

export function applyThemePassStyles(
  selection: ThemePassSelection | null,
): void {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(STYLE_ELEMENT_ID);

  if (!selection) {
    if (existing?.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    return;
  }

  const { metadata } = selection;
  const styleElement = ensureStyleElement();
  styleElement.textContent = serializeThemePass(metadata);

  const root = document.documentElement;
  for (const [key, value] of Object.entries(metadata.partnerAssets)) {
    try {
      root.style.setProperty(key, value);
    } catch (error) {
      console.warn(`[theme-pass] Failed to set CSS variable ${key}`, error);
    }
  }
}

function ensureStyleElement(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ELEMENT_ID);
  if (existing instanceof HTMLStyleElement) {
    return existing;
  }
  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  document.head.appendChild(style);
  return style;
}

function serializeThemePass(metadata: ThemePassMetadata): string {
  const segments: string[] = [];
  const serialize = (selector: string, vars: Record<string, string>) => {
    const entries = Object.entries(vars);
    if (entries.length === 0) return;
    segments.push(`${selector} {`);
    for (const [key, value] of entries) {
      segments.push(`  ${key}: ${value};`);
    }
    segments.push("}");
  };

  serialize(":root", metadata.variables.common);
  serialize('[data-theme="light"]', metadata.variables.light);
  serialize('[data-theme="dark"]', metadata.variables.dark);

  return segments.join("\n");
}

export function buildThemePassInlineScriptPayload(
  selection: ThemePassSelection | null,
) {
  if (!selection) {
    return null;
  }
  return {
    id: selection.id,
    metadata: selection.metadata,
  };
}
