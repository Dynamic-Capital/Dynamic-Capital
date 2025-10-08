import {
  type ThemePass,
  type ThemePassBrandPalette,
  type ThemePassColors,
  type ThemePassEffects,
  type ThemePassModePalette,
  ThemePassSchema,
  type ThemePassTypography,
} from "../resources/types/theme-pass";
import type {
  BrandingThemeTokens,
  BrandingTokens,
} from "../resources/types/branding.types";

export type ThemePassNormalizationResult = {
  data: ThemePass;
  tokens: BrandingTokens;
};

export function validateThemePass(input: unknown) {
  return ThemePassSchema.safeParse(input);
}

export function normalizeThemePassTokens(
  input: unknown,
  defaults: BrandingTokens,
): ThemePassNormalizationResult | null {
  const validation = validateThemePass(input);
  if (!validation.success) {
    return null;
  }

  const tokens: BrandingTokens = {
    light: { ...defaults.light },
    dark: { ...defaults.dark },
  };

  const data = validation.data;

  if (data.colors?.brand) {
    applyBrandPalette(tokens.light, data.colors.brand);
    applyBrandPalette(tokens.dark, data.colors.brand);
  }

  if (data.colors?.light) {
    applyModePalette(tokens.light, data.colors.light);
  }

  if (data.colors?.dark) {
    applyModePalette(tokens.dark, data.colors.dark);
  }

  if (data.colors?.gradients) {
    applyGradients(tokens.light, data.colors.gradients, "light");
    applyGradients(tokens.dark, data.colors.gradients, "dark");
  }

  if (data.effects?.motion) {
    applyMotion(tokens.light, data.effects.motion);
    applyMotion(tokens.dark, data.effects.motion);
  }

  if (data.effects?.tokens) {
    assignCustomTokens(tokens.light, data.effects.tokens);
    assignCustomTokens(tokens.dark, data.effects.tokens);
  }

  if (data.typography) {
    applyTypography(tokens.light, data.typography);
    applyTypography(tokens.dark, data.typography);
  }

  if (data.sounds) {
    applyNamespacedTokens(tokens.light, data.sounds, "--sound-");
    applyNamespacedTokens(tokens.dark, data.sounds, "--sound-");
  }

  if (data.assets) {
    applyNamespacedTokens(tokens.light, data.assets, "--asset-");
    applyNamespacedTokens(tokens.dark, data.assets, "--asset-");
  }

  if (data.tokens) {
    assignCustomTokens(tokens.light, data.tokens);
    assignCustomTokens(tokens.dark, data.tokens);
  }

  return { data, tokens };
}

const MODE_TOKEN_MAP: Record<string, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  elevated: "--elevated",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
  radius: "--radius",
};

const BRAND_TOKEN_MAP: Record<string, string> = {
  base: "--dc-brand",
  light: "--dc-brand-light",
  dark: "--dc-brand-dark",
  secondary: "--dc-secondary",
  accent: "--dc-accent",
};

const GRADIENT_TOKEN_MAP: Record<string, string> = {
  brand: "--gradient-brand",
  primary: "--gradient-primary",
  card: "--gradient-card",
  hero: "--gradient-hero",
  navigation: "--gradient-navigation",
};

function applyModePalette(
  target: BrandingThemeTokens,
  palette: ThemePassModePalette,
) {
  for (const [key, token] of Object.entries(MODE_TOKEN_MAP)) {
    const value = (palette as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      target[token] = value;
    }
  }

  const charts = Array.isArray(palette.charts) ? palette.charts : [];

  for (let index = 0; index < charts.length; index += 1) {
    const chartValue = charts[index];
    if (typeof chartValue === "string" && chartValue.trim()) {
      target[`--chart-${index + 1}`] = chartValue;
    }
  }

  if (palette.tokens && typeof palette.tokens === "object") {
    assignCustomTokens(target, palette.tokens);
  }
}

function applyBrandPalette(
  target: BrandingThemeTokens,
  palette: ThemePassBrandPalette,
) {
  for (const [key, token] of Object.entries(BRAND_TOKEN_MAP)) {
    const value = (palette as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      target[token] = value;
    }
  }
}

function applyGradients(
  target: BrandingThemeTokens,
  gradients: NonNullable<ThemePassColors["gradients"]>,
  mode: "light" | "dark",
) {
  for (const [key, token] of Object.entries(GRADIENT_TOKEN_MAP)) {
    const value = (gradients as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      target[token] = value;
    }
  }

  const motion = gradients?.motion;
  if (motion) {
    if (typeof motion.primary === "string" && motion.primary.trim()) {
      target["--gradient-motion-primary"] = motion.primary;
    }
    if (typeof motion.card === "string" && motion.card.trim()) {
      target["--gradient-motion-card"] = motion.card;
    }
    const backgroundKey = mode === "light"
      ? "backgroundLight"
      : "backgroundDark";
    const backgroundValue = motion[backgroundKey as keyof typeof motion];
    if (typeof backgroundValue === "string" && backgroundValue.trim()) {
      target["--gradient-motion-bg"] = backgroundValue;
    }
  }

  const glass = gradients?.glass;
  if (glass) {
    const base = glass.base;
    if (typeof base === "string" && base.trim()) {
      target["--glass-base"] = base;
    }
    const border = glass.border;
    if (typeof border === "string" && border.trim()) {
      target["--glass-border"] = border;
    }
    const shadow = glass.shadow;
    if (typeof shadow === "string" && shadow.trim()) {
      target["--glass-shadow"] = shadow;
    }
    const blur = glass.motionBlur;
    if (typeof blur === "string" && blur.trim()) {
      target["--glass-motion-blur"] = blur;
    }

    const motionBackground = mode === "light"
      ? glass.motionBackground
      : glass.motionBackgroundDark;
    if (typeof motionBackground === "string" && motionBackground.trim()) {
      target["--glass-motion-bg"] = motionBackground;
    }

    const motionBorder = mode === "light"
      ? glass.motionBorder
      : glass.motionBorderDark;
    if (typeof motionBorder === "string" && motionBorder.trim()) {
      target["--glass-motion-border"] = motionBorder;
    }

    const motionShadow = mode === "light"
      ? glass.motionShadow
      : glass.motionShadowDark;
    if (typeof motionShadow === "string" && motionShadow.trim()) {
      target["--glass-motion-shadow"] = motionShadow;
    }
  }
}

function applyMotion(
  target: BrandingThemeTokens,
  motion: NonNullable<ThemePassEffects["motion"]>,
) {
  if (motion?.durations) {
    applyNamespacedTokens(target, motion.durations, "--motion-duration-");
  }
  if (motion?.easings) {
    applyNamespacedTokens(target, motion.easings, "--motion-ease-");
  }
  if (motion?.shadows) {
    applyNamespacedTokens(target, motion.shadows, "--shadow-motion-");
  }
  if (motion?.scales) {
    applyNamespacedTokens(target, motion.scales, "--scale-motion-");
  }
}

function applyTypography(
  target: BrandingThemeTokens,
  typography: ThemePassTypography,
) {
  if (typography.families) {
    applyNamespacedTokens(target, typography.families, "--font-");
  }
  if (typography.weights) {
    applyNamespacedTokens(target, typography.weights, "--font-weight-");
  }
  if (typography.sizes) {
    applyNamespacedTokens(target, typography.sizes, "--font-size-");
  }
  if (typography.lineHeight) {
    applyNamespacedTokens(target, typography.lineHeight, "--line-height-");
  }
  if (typography.letterSpacing) {
    applyNamespacedTokens(
      target,
      typography.letterSpacing,
      "--letter-spacing-",
    );
  }
}

function assignCustomTokens(
  target: BrandingThemeTokens,
  tokens: Record<string, unknown>,
) {
  for (const [key, value] of Object.entries(tokens)) {
    if (typeof value === "string" && key.startsWith("--")) {
      target[key] = value;
    }
  }
}

function applyNamespacedTokens(
  target: BrandingThemeTokens,
  values: Record<string, unknown>,
  prefix: string,
) {
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim()) {
      const normalizedKey = normalizeTokenKey(prefix, key);
      target[normalizedKey] = value;
    }
  }
}

function normalizeTokenKey(prefix: string, key: string) {
  const safeKey = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return prefix.startsWith("--")
    ? `${prefix}${safeKey}`
    : `--${prefix}${safeKey}`;
}
