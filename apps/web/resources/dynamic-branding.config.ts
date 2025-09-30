import {
  type BrandingCorePalette,
  type BrandingGradients,
  type BrandingMetadata,
  type BrandingMotion,
  type BrandingPalette,
  type BrandingThemePalette,
  type BrandingThemeTokens,
  type BrandingTokens,
  type DynamicBrandingConfig,
  type DynamicBrandingOverrides,
} from "./types/branding.types";
import { normalizeThemePassTokens } from "../utils/theme-pass.ts";

const palette: BrandingPalette = {
  brand: {
    base: "0 84% 58%",
    light: "0 92% 68%",
    dark: "0 76% 48%",
    secondary: "200 96% 52%",
    accent: "350 88% 60%",
  },
  light: {
    background: "0 0% 100%",
    foreground: "224 71.4% 4.1%",
    card: "0 0% 100%",
    cardForeground: "224 71.4% 4.1%",
    popover: "0 0% 100%",
    popoverForeground: "224 71.4% 4.1%",
    primary: "0 84% 58%",
    primaryForeground: "0 0% 100%",
    secondary: "0 68% 95%",
    secondaryForeground: "0 45% 20%",
    muted: "0 5% 96%",
    mutedForeground: "0 5% 45%",
    elevated: "0 72% 10%",
    accent: "350 88% 60%",
    accentForeground: "0 0% 100%",
    destructive: "0 72% 50%",
    destructiveForeground: "0 0% 98%",
    border: "0 10% 89%",
    input: "0 10% 89%",
    ring: "0 84% 58%",
    radius: "0.5rem",
    charts: [
      "14 100% 57%",
      "200 100% 50%",
      "28 87% 67%",
      "340 82% 62%",
      "320 65% 55%",
    ],
  },
  dark: {
    background: "0 5% 6%",
    foreground: "0 5% 98%",
    card: "0 8% 8%",
    cardForeground: "0 5% 98%",
    popover: "0 8% 8%",
    popoverForeground: "0 5% 98%",
    primary: "0 84% 58%",
    primaryForeground: "0 0% 100%",
    secondary: "0 10% 15%",
    secondaryForeground: "0 5% 98%",
    muted: "0 10% 15%",
    mutedForeground: "0 5% 65%",
    elevated: "0 5% 95%",
    accent: "350 88% 60%",
    accentForeground: "0 0% 100%",
    destructive: "0 68% 46%",
    destructiveForeground: "0 5% 98%",
    border: "0 15% 18%",
    input: "0 15% 18%",
    ring: "0 84% 58%",
    radius: "0.5rem",
    charts: [
      "14 100% 57%",
      "200 100% 50%",
      "28 87% 67%",
      "340 82% 62%",
      "320 65% 55%",
    ],
  },
};

const gradients: BrandingGradients = {
  brand:
    "linear-gradient(135deg, hsl(var(--dc-brand)) 0%, hsl(var(--dc-brand-light)) 50%, hsl(var(--dc-brand-dark)) 100%)",
  primary:
    "linear-gradient(135deg, hsl(var(--dc-brand)) 0%, hsl(var(--dc-secondary)) 100%)",
  card:
    "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)/0.1) 100%)",
  hero:
    "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--dc-brand)/0.05) 50%, hsl(var(--background)) 100%)",
  navigation:
    "linear-gradient(135deg, hsl(var(--background)/0.95) 0%, hsl(var(--card)/0.95) 100%)",
  motion: {
    primary:
      "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--dc-brand-light)) 50%, hsl(var(--dc-accent)) 100%)",
    card:
      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.08) 50%, hsl(var(--primary)/0.03) 100%)",
    backgroundLight:
      "radial-gradient(ellipse at top, hsl(var(--primary)/0.15) 0%, transparent 60%), radial-gradient(ellipse at bottom, hsl(var(--dc-brand-light)/0.12) 0%, transparent 60%), linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background)))",
    backgroundDark:
      "radial-gradient(ellipse at top, hsl(var(--primary)/0.2) 0%, transparent 60%), radial-gradient(ellipse at bottom, hsl(var(--dc-brand-light)/0.15) 0%, transparent 60%), linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background)))",
  },
  glass: {
    base: "rgba(255, 255, 255, 0.1)",
    border: "rgba(255, 255, 255, 0.2)",
    shadow: "0 8px 32px rgba(31, 38, 135, 0.37)",
    motionBackground: "hsl(var(--dc-brand) / 0.12)",
    motionBorder: "hsl(var(--dc-brand-light) / 0.25)",
    motionShadow: "0 12px 40px hsl(var(--dc-brand-dark) / 0.4)",
    motionBlur: "blur(24px) saturate(1.8) brightness(1.1)",
    motionBackgroundDark: "hsl(var(--dc-brand) / 0.15)",
    motionBorderDark: "hsl(var(--dc-brand-light) / 0.2)",
    motionShadowDark: "0 12px 40px hsl(var(--dc-brand-dark) / 0.6)",
  },
};

const motion: BrandingMotion = {
  durations: {
    fast: "0.15s",
    normal: "0.3s",
    slow: "0.6s",
  },
  easings: {
    spring: "cubic-bezier(0.16, 1, 0.3, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  shadows: {
    sm: "0 2px 8px rgba(0, 0, 0, 0.04)",
    md: "0 4px 16px rgba(0, 0, 0, 0.08)",
    lg: "0 8px 32px rgba(0, 0, 0, 0.12)",
    xl: "0 16px 64px rgba(0, 0, 0, 0.16)",
    glow: "0 0 32px hsl(var(--primary) / 0.4)",
  },
  scales: {
    sm: "1.02",
    md: "1.05",
    lg: "1.08",
    press: "0.96",
  },
};

type BrandingPrimitiveConfig = {
  palette: BrandingPalette;
  gradients: BrandingGradients;
  motion: BrandingMotion;
};

const PALETTE_TOKEN_MAP: Record<
  Exclude<keyof BrandingThemePalette, "charts">,
  string
> = {
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

function createBrandingTokens(
  primitives: BrandingPrimitiveConfig,
): BrandingTokens {
  return {
    light: createThemeTokens(primitives, primitives.palette.light, "light"),
    dark: createThemeTokens(primitives, primitives.palette.dark, "dark"),
  };
}

function createThemeTokens(
  { palette, gradients, motion }: BrandingPrimitiveConfig,
  themePalette: BrandingThemePalette,
  mode: "light" | "dark",
): BrandingThemeTokens {
  const themeTokens: BrandingThemeTokens = {};

  for (
    const key of Object.keys(PALETTE_TOKEN_MAP) as Array<
      Exclude<keyof BrandingThemePalette, "charts">
    >
  ) {
    const cssVar = PALETTE_TOKEN_MAP[key];
    themeTokens[cssVar] = themePalette[key];
  }

  themePalette.charts.forEach((value, index) => {
    themeTokens[`--chart-${index + 1}`] = value;
  });

  applyBrandTokens(themeTokens, palette.brand);
  applyGradientTokens(themeTokens, gradients, mode);
  applyMotionTokens(themeTokens, motion);

  return themeTokens;
}

function applyBrandTokens(
  target: BrandingThemeTokens,
  brand: BrandingCorePalette,
) {
  target["--dc-brand"] = brand.base;
  target["--dc-brand-light"] = brand.light;
  target["--dc-brand-dark"] = brand.dark;
  target["--dc-secondary"] = brand.secondary;
  target["--dc-accent"] = brand.accent;
}

function applyGradientTokens(
  target: BrandingThemeTokens,
  gradients: BrandingGradients,
  mode: "light" | "dark",
) {
  target["--gradient-brand"] = gradients.brand;
  target["--gradient-primary"] = gradients.primary;
  target["--gradient-card"] = gradients.card;
  target["--gradient-hero"] = gradients.hero;
  target["--gradient-navigation"] = gradients.navigation;
  target["--gradient-motion-primary"] = gradients.motion.primary;
  target["--gradient-motion-card"] = gradients.motion.card;
  target["--gradient-motion-bg"] = mode === "light"
    ? gradients.motion.backgroundLight
    : gradients.motion.backgroundDark;

  target["--glass-motion-bg"] = mode === "light"
    ? gradients.glass.motionBackground
    : gradients.glass.motionBackgroundDark;
  target["--glass-motion-border"] = mode === "light"
    ? gradients.glass.motionBorder
    : gradients.glass.motionBorderDark;
  target["--glass-motion-shadow"] = mode === "light"
    ? gradients.glass.motionShadow
    : gradients.glass.motionShadowDark;
  target["--glass-motion-blur"] = gradients.glass.motionBlur;
}

function applyMotionTokens(
  target: BrandingThemeTokens,
  motion: BrandingMotion,
) {
  target["--motion-duration-fast"] = motion.durations.fast;
  target["--motion-duration-normal"] = motion.durations.normal;
  target["--motion-duration-slow"] = motion.durations.slow;
  target["--motion-ease-spring"] = motion.easings.spring;
  target["--motion-ease-bounce"] = motion.easings.bounce;
  target["--motion-ease-smooth"] = motion.easings.smooth;
  target["--shadow-motion-sm"] = motion.shadows.sm;
  target["--shadow-motion-md"] = motion.shadows.md;
  target["--shadow-motion-lg"] = motion.shadows.lg;
  target["--shadow-motion-xl"] = motion.shadows.xl;
  target["--shadow-motion-glow"] = motion.shadows.glow;
  target["--scale-motion-sm"] = motion.scales.sm;
  target["--scale-motion-md"] = motion.scales.md;
  target["--scale-motion-lg"] = motion.scales.lg;
  target["--scale-motion-press"] = motion.scales.press;
}

const metadata: BrandingMetadata = {
  name: "Dynamic Capital",
  tagline: "Institutional trading intelligence for ambitious operators.",
  description:
    "Dynamic Capital delivers institutional trading intelligence, mentorship, and automation for ambitious operators.",
  keywords: [
    "dynamic capital",
    "algorithmic trading",
    "mentorship",
    "automation",
    "portfolio intelligence",
    "financial education",
  ],
  primaryUrl: "https://dynamic-capital.ondigitalocean.app",
  supportEmail: "support@dynamiccapital.ton",
};

const tokens = createBrandingTokens({ palette, gradients, motion });

const distribution: DynamicBrandingConfig["distribution"] = {
  metadataUri: "https://dao.dynamic.capital/branding/theme-pass.json",
  themePassUri: "https://dao.dynamic.capital/branding/theme-pass.json",
  media: {
    logo: "https://dao.dynamic.capital/branding/media/logo.svg",
    favicon: "https://dao.dynamic.capital/branding/media/favicon.ico",
    appleTouchIcon:
      "https://dao.dynamic.capital/branding/media/apple-touch-icon.png",
    socialPreview:
      "https://dao.dynamic.capital/branding/media/social-preview.png",
  },
};

const dynamicBranding: DynamicBrandingConfig = {
  palette,
  gradients,
  motion,
  tokens,
  metadata,
  assets: {
    logo: "/logo.svg",
    favicon: "/favicon.ico",
    appleTouchIcon: "/logo.svg",
    socialPreview: "/social/social-preview.svg",
  },
  distribution,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, overrides: DynamicBrandingOverrides): T {
  if (!isRecord(overrides)) {
    return JSON.parse(JSON.stringify(base)) as T;
  }
  const result: Record<string, unknown> = JSON.parse(JSON.stringify(base));

  const stack: Array<
    { target: Record<string, unknown>; source: Record<string, unknown> }
  > = [
    { target: result, source: overrides as Record<string, unknown> },
  ];

  while (stack.length > 0) {
    const { target, source } = stack.pop()!;
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue;
      if (isRecord(value) && isRecord(target[key])) {
        stack.push({
          target: target[key] as Record<string, unknown>,
          source: value,
        });
      } else {
        target[key] = value;
      }
    }
  }

  return result as T;
}

export function exportDynamicBranding(): DynamicBrandingConfig {
  return JSON.parse(JSON.stringify(dynamicBranding)) as DynamicBrandingConfig;
}

export function importDynamicBranding(
  overrides: DynamicBrandingOverrides = {},
  themePassOverride?: unknown,
): DynamicBrandingConfig {
  if (!isRecord(overrides)) {
    return exportDynamicBranding();
  }
  const merged = deepMerge(dynamicBranding, overrides);
  const generatedTokens = createBrandingTokens({
    palette: merged.palette,
    gradients: merged.gradients,
    motion: merged.motion,
  });

  const themePassTokens = typeof themePassOverride !== "undefined"
    ? normalizeThemePassTokens(themePassOverride, generatedTokens)
    : null;

  const baseTokens = themePassTokens
    ? {
      light: mergeThemeTokens(
        generatedTokens.light,
        themePassTokens.tokens.light,
      ),
      dark: mergeThemeTokens(generatedTokens.dark, themePassTokens.tokens.dark),
    }
    : generatedTokens;

  merged.tokens = applyTokenOverrides(baseTokens, overrides.tokens);

  return merged;
}

export { dynamicBranding };

function applyTokenOverrides(
  generated: BrandingTokens,
  overrides: DynamicBrandingOverrides["tokens"],
): BrandingTokens {
  if (!isRecord(overrides)) {
    return generated;
  }

  return {
    light: mergeThemeTokens(generated.light, overrides.light),
    dark: mergeThemeTokens(generated.dark, overrides.dark),
  };
}

function mergeThemeTokens(
  base: BrandingThemeTokens,
  overrides: unknown,
): BrandingThemeTokens {
  if (!isRecord(overrides)) {
    return base;
  }

  const merged: BrandingThemeTokens = { ...base };
  for (const [token, value] of Object.entries(overrides)) {
    if (typeof value === "string") {
      merged[token] = value;
    }
  }
  return merged;
}
