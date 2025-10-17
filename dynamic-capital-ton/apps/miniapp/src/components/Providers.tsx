"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  DataThemeProvider,
  IconProvider,
  LayoutProvider,
  ThemeProvider,
  ToastProvider,
  type IconLibrary,
} from "@once-ui-system/core";

import {
  useMiniAppThemeManager,
  type UseMiniAppThemeResult,
} from "@shared/miniapp/use-miniapp-theme";
import type { MiniAppThemeOption } from "@shared/miniapp/theme-loader";
import { dataStyle, style } from "@/resources/once-ui.config";

type ProvidersProps = {
  children: ReactNode;
  icons?: Partial<IconLibrary>;
};

const FALLBACK_RESOLVED_THEME: "dark" | "light" = "dark";

const MANAGED_STYLE_ATTRIBUTES = [
  "data-theme",
  "data-neutral",
  "data-brand",
  "data-accent",
  "data-solid",
  "data-solid-style",
  "data-border",
  "data-surface",
  "data-transition",
  "data-scaling",
] as const;

type ManagedStyleAttribute = (typeof MANAGED_STYLE_ATTRIBUTES)[number];

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function resolvePreferredTheme(): "dark" | "light" {
  if (style.theme === "dark" || style.theme === "light") {
    return style.theme;
  }
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return FALLBACK_RESOLVED_THEME;
}

function extractDataAttributeOverrides(
  theme: MiniAppThemeOption | null,
): Record<string, string> {
  if (!theme) return {};
  const overrides: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(theme.cssVariables)) {
    if (!key.startsWith("--data-")) continue;
    const trimmed = rawValue.trim();
    if (!trimmed) continue;
    overrides[key.slice(2)] = trimmed;
  }
  return overrides;
}

function resolveActiveTheme(
  themeState: UseMiniAppThemeResult["state"],
): MiniAppThemeOption | null {
  if (!themeState.activeThemeId) {
    return null;
  }
  return (
    themeState.availableThemes.find((theme) =>
      theme.id === themeState.activeThemeId
    ) ?? null
  );
}

export function Providers({ children, icons }: ProvidersProps) {
  const { variant, mode, height, axis, tick } = dataStyle;
  const { state: themeState } = useMiniAppThemeManager();
  const activeTheme = useMemo(
    () => resolveActiveTheme(themeState),
    [themeState],
  );
  const dataAttributeOverrides = useMemo(
    () => extractDataAttributeOverrides(activeTheme),
    [activeTheme],
  );
  const appliedAttributeRef = useRef<Set<string>>(new Set());
  const baselineAttributeRef = useRef<Map<string, string | null>>(new Map());

  useIsomorphicLayoutEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const resolvedTheme = resolvePreferredTheme();
    const fallbackValues: Record<ManagedStyleAttribute, string> = {
      "data-theme": resolvedTheme,
      "data-neutral": style.neutral,
      "data-brand": style.brand,
      "data-accent": style.accent,
      "data-solid": style.solid,
      "data-solid-style": style.solidStyle,
      "data-border": style.border,
      "data-surface": style.surface,
      "data-transition": style.transition,
      "data-scaling": style.scaling,
    };

    const baseAttributes: Record<string, string> = {};
    for (const attr of MANAGED_STYLE_ATTRIBUTES) {
      baseAttributes[attr] = root.getAttribute(attr) ?? fallbackValues[attr];
    }

    const nextAttributes: Record<string, string | null> = { ...baseAttributes };

    for (const [attr, value] of Object.entries(dataAttributeOverrides)) {
      if (!value) continue;
      if (!baselineAttributeRef.current.has(attr)) {
        baselineAttributeRef.current.set(
          attr,
          root.hasAttribute(attr) ? root.getAttribute(attr) : null,
        );
      }
      nextAttributes[attr] = value;
    }

    for (const attr of Array.from(baselineAttributeRef.current.keys())) {
      if (attr in dataAttributeOverrides) continue;
      const baseline = baselineAttributeRef.current.get(attr);
      if (baseline === null) {
        if (!(attr in baseAttributes)) {
          nextAttributes[attr] = null;
        }
      } else if (typeof baseline === "string") {
        nextAttributes[attr] = baseline;
      }
      baselineAttributeRef.current.delete(attr);
    }

    const nextManaged = new Set<string>([
      ...MANAGED_STYLE_ATTRIBUTES,
      ...Object.keys(dataAttributeOverrides),
    ]);

    for (const attr of appliedAttributeRef.current) {
      if (!nextManaged.has(attr)) {
        root.removeAttribute(attr);
      }
    }

    for (const attr of nextManaged) {
      const value = nextAttributes[attr] ?? null;
      if (value === null || value === "") {
        root.removeAttribute(attr);
        continue;
      }
      if (root.getAttribute(attr) !== value) {
        root.setAttribute(attr, value);
      }
    }

    appliedAttributeRef.current = new Set(nextManaged);
  }, [dataAttributeOverrides, themeState.isReady]);

  return (
    <LayoutProvider>
      <ThemeProvider
        theme={style.theme}
        neutral={style.neutral}
        brand={style.brand}
        accent={style.accent}
        solid={style.solid}
        solidStyle={style.solidStyle}
        border={style.border}
        surface={style.surface}
        transition={style.transition}
        scaling={style.scaling}
      >
        <DataThemeProvider
          variant={variant}
          mode={mode}
          height={height}
          axis={axis}
          tick={tick}
        >
          <ToastProvider>
            <IconProvider icons={icons}>{children}</IconProvider>
          </ToastProvider>
        </DataThemeProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}
