import { dynamicBranding } from "../../apps/web/resources/dynamic-branding.config";
import {
  dynamicDataStyleDefaults,
  dynamicStyleDefaults,
} from "./dynamic-ui-tokens";

const BRANDING_STYLE_ELEMENT_ID = "dynamic-branding-tokens";
const THEME_STORAGE_KEY = "data-theme";

const style = dynamicStyleDefaults;
const dataStyle = dynamicDataStyleDefaults;

const DEFAULT_THEME = style.theme === "light" || style.theme === "dark"
  ? style.theme
  : "dark";

const htmlAttributeDefaults: Record<string, string> = {
  "data-neutral": style.neutral,
  "data-brand": style.brand,
  "data-accent": style.accent,
  "data-solid": style.solid,
  "data-solid-style": style.solidStyle,
  "data-border": style.border,
  "data-surface": style.surface,
  "data-transition": style.transition,
  "data-scaling": style.scaling,
  "data-viz-style": dataStyle.variant,
};

const themeAttributeDefaults = Object.fromEntries(
  Object.entries(htmlAttributeDefaults).map(([key, value]) => [
    key.replace(/^data-/, ""),
    value,
  ]),
);

export function applyDynamicBranding(): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const brandingStyles = createBrandingStyles(dynamicBranding.tokens);
  ensureBrandingStyleElement(document, brandingStyles);
  applyBrandingAttributes(root);
  applyThemeAttributes(root);
  applyBrandingMetadata(document);
}

function applyBrandingAttributes(root: HTMLElement) {
  for (const [attribute, value] of Object.entries(htmlAttributeDefaults)) {
    root.setAttribute(attribute, value);
  }
}

function applyThemeAttributes(root: HTMLElement) {
  const storedTheme = safeStorageGet(THEME_STORAGE_KEY);
  const resolvedTheme = resolveTheme(
    storedTheme ?? style.theme ?? DEFAULT_THEME,
  );
  root.setAttribute("data-theme", resolvedTheme);

  for (const [key, fallbackValue] of Object.entries(themeAttributeDefaults)) {
    const storageKey = `data-${key}`;
    const storedValue = safeStorageGet(storageKey);
    const value = storedValue ?? fallbackValue;
    if (value) {
      root.setAttribute(storageKey, value);
    }
  }
}

function applyBrandingMetadata(doc: Document) {
  const { metadata, assets, palette } = dynamicBranding;

  if (metadata?.name) {
    doc.title = metadata.name;
    updateMeta(doc, "apple-mobile-web-app-title", metadata.name);
  }

  if (metadata?.description) {
    updateMeta(doc, "description", metadata.description);
  }

  if (Array.isArray(metadata?.keywords) && metadata.keywords.length > 0) {
    updateMeta(doc, "keywords", metadata.keywords.join(", "));
  }

  updateMeta(doc, "theme-color", `hsl(${palette.brand.base})`);

  if (assets?.favicon) {
    updateLink(doc, "icon", assets.favicon);
    updateLink(doc, "shortcut icon", assets.favicon);
  }

  if (assets?.appleTouchIcon) {
    updateLink(doc, "apple-touch-icon", assets.appleTouchIcon);
  }
}

function updateMeta(doc: Document, name: string, content: string) {
  if (!content) return;

  let meta = doc.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = doc.createElement("meta");
    meta.name = name;
    doc.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function updateLink(doc: Document, rel: string, href: string) {
  if (!href) return;

  const links = Array.from(
    doc.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`),
  );

  if (links.length === 0) {
    const link = doc.createElement("link");
    link.rel = rel;
    link.href = href;
    doc.head.appendChild(link);
    return;
  }

  for (const link of links) {
    link.href = href;
  }
}

function ensureBrandingStyleElement(doc: Document, cssContent: string) {
  let styleElement = doc.getElementById(BRANDING_STYLE_ELEMENT_ID);

  if (!(styleElement instanceof HTMLStyleElement)) {
    styleElement = doc.createElement("style");
    styleElement.id = BRANDING_STYLE_ELEMENT_ID;
    doc.head.appendChild(styleElement);
  }

  styleElement.textContent = cssContent;
}

function createBrandingStyles(tokens: typeof dynamicBranding.tokens) {
  const lightTokens = serializeBrandingTokens(tokens.light);
  const darkTokens = serializeBrandingTokens(tokens.dark);

  return [
    ':root, [data-theme="light"] {',
    lightTokens,
    "  color-scheme: light;",
    "}",
    "",
    '[data-theme="dark"] {',
    darkTokens,
    "  color-scheme: dark;",
    "}",
  ].join("\n");
}

function serializeBrandingTokens(tokenSet: Record<string, string>): string {
  return Object.entries(tokenSet)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
}

function resolveTheme(themeValue: string | null | undefined): string {
  if (!themeValue || themeValue === "system") {
    if (
      typeof window !== "undefined" && typeof window.matchMedia === "function"
    ) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return DEFAULT_THEME;
  }

  if (themeValue === "light" || themeValue === "dark") {
    return themeValue;
  }

  return DEFAULT_THEME;
}

function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}
