import { z } from "zod";

const ColorValueSchema = z.string().min(1, "Color values cannot be empty");

const ThemePassBrandAssetsSchema = z.object({
  logo: z.string().url().optional(),
  wordmark: z.string().url().optional(),
  icon: z.string().url().optional(),
  favicon: z.string().url().optional(),
  appleTouchIcon: z.string().url().optional(),
  banner: z.string().url().optional(),
  background: z.string().url().optional(),
  animation: z.string().url().optional(),
}).partial();

const ThemePassBrandPaletteSchema = z.object({
  base: ColorValueSchema.optional(),
  light: ColorValueSchema.optional(),
  dark: ColorValueSchema.optional(),
  secondary: ColorValueSchema.optional(),
  accent: ColorValueSchema.optional(),
});

const ThemePassModeTokensSchema = z.record(z.string().min(1)).optional();

const ThemePassModePaletteSchema = z.object({
  background: ColorValueSchema.optional(),
  foreground: ColorValueSchema.optional(),
  card: ColorValueSchema.optional(),
  cardForeground: ColorValueSchema.optional(),
  popover: ColorValueSchema.optional(),
  popoverForeground: ColorValueSchema.optional(),
  primary: ColorValueSchema.optional(),
  primaryForeground: ColorValueSchema.optional(),
  secondary: ColorValueSchema.optional(),
  secondaryForeground: ColorValueSchema.optional(),
  muted: ColorValueSchema.optional(),
  mutedForeground: ColorValueSchema.optional(),
  elevated: ColorValueSchema.optional(),
  accent: ColorValueSchema.optional(),
  accentForeground: ColorValueSchema.optional(),
  destructive: ColorValueSchema.optional(),
  destructiveForeground: ColorValueSchema.optional(),
  border: ColorValueSchema.optional(),
  input: ColorValueSchema.optional(),
  ring: ColorValueSchema.optional(),
  radius: z.string().optional(),
  charts: z.array(ColorValueSchema).min(1).max(12).optional(),
  tokens: ThemePassModeTokensSchema,
});

const ThemePassGradientsSchema = z.object({
  brand: z.string().optional(),
  primary: z.string().optional(),
  card: z.string().optional(),
  hero: z.string().optional(),
  navigation: z.string().optional(),
  motion: z.object({
    primary: z.string().optional(),
    card: z.string().optional(),
    backgroundLight: z.string().optional(),
    backgroundDark: z.string().optional(),
  }).partial().optional(),
  glass: z.object({
    base: z.string().optional(),
    border: z.string().optional(),
    shadow: z.string().optional(),
    motionBackground: z.string().optional(),
    motionBorder: z.string().optional(),
    motionShadow: z.string().optional(),
    motionBlur: z.string().optional(),
    motionBackgroundDark: z.string().optional(),
    motionBorderDark: z.string().optional(),
    motionShadowDark: z.string().optional(),
  }).partial().optional(),
}).partial();

const ThemePassColorsSchema = z.object({
  brand: ThemePassBrandPaletteSchema.optional(),
  light: ThemePassModePaletteSchema.optional(),
  dark: ThemePassModePaletteSchema.optional(),
  gradients: ThemePassGradientsSchema.optional(),
});

const ThemePassTypographySchema = z.object({
  families: z.object({
    heading: z.string().optional(),
    body: z.string().optional(),
    mono: z.string().optional(),
    display: z.string().optional(),
  }).partial().optional(),
  weights: z.object({
    heading: z.string().optional(),
    body: z.string().optional(),
    mono: z.string().optional(),
  }).partial().optional(),
  sizes: z.object({
    xs: z.string().optional(),
    sm: z.string().optional(),
    md: z.string().optional(),
    lg: z.string().optional(),
    xl: z.string().optional(),
    "2xl": z.string().optional(),
    "3xl": z.string().optional(),
  }).partial().optional(),
  lineHeight: z.object({
    heading: z.string().optional(),
    body: z.string().optional(),
  }).partial().optional(),
  letterSpacing: z.object({
    heading: z.string().optional(),
    body: z.string().optional(),
  }).partial().optional(),
}).partial();

const ThemePassMotionSchema = z.object({
  durations: z.record(z.string().min(1)).optional(),
  easings: z.record(z.string().min(1)).optional(),
  shadows: z.record(z.string().min(1)).optional(),
  scales: z.record(z.string().min(1)).optional(),
});

const ThemePassEffectsSchema = z.object({
  motion: ThemePassMotionSchema.optional(),
  overlays: z.object({
    glow: z.string().optional(),
    vignette: z.string().optional(),
    noise: z.string().optional(),
  }).partial().optional(),
  tokens: z.record(z.string().min(1)).optional(),
}).partial();

const ThemePassSoundsSchema = z.record(z.string().min(1)).optional();

const ThemePassMetadataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  release: z.string().optional(),
  contrast: z.object({
    minimum: z.number().min(1).optional(),
    recommended: z.number().min(1).optional(),
  }).partial().optional(),
  tags: z.array(z.string()).optional(),
}).partial();

const ThemePassCustomTokensSchema = z.record(z.string().min(1)).optional();

export const ThemePassSchema = z.object({
  version: z.string().optional(),
  metadata: ThemePassMetadataSchema.optional(),
  assets: ThemePassBrandAssetsSchema.optional(),
  colors: ThemePassColorsSchema.optional(),
  typography: ThemePassTypographySchema.optional(),
  effects: ThemePassEffectsSchema.optional(),
  sounds: ThemePassSoundsSchema,
  tokens: ThemePassCustomTokensSchema,
});

export type ThemePass = z.infer<typeof ThemePassSchema>;
export type ThemePassColors = z.infer<typeof ThemePassColorsSchema>;
export type ThemePassTypography = z.infer<typeof ThemePassTypographySchema>;
export type ThemePassEffects = z.infer<typeof ThemePassEffectsSchema>;
export type ThemePassSounds = z.infer<typeof ThemePassSoundsSchema>;
export type ThemePassBrandAssets = z.infer<typeof ThemePassBrandAssetsSchema>;
export type ThemePassBrandPalette = z.infer<typeof ThemePassBrandPaletteSchema>;
export type ThemePassModePalette = z.infer<typeof ThemePassModePaletteSchema>;
