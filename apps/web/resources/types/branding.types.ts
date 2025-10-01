/**
 * The primary brand palette values shared across light and dark themes.
 */
export type BrandingCorePalette = {
  base: string;
  light: string;
  dark: string;
  secondary: string;
  accent: string;
};

/**
 * Palette tokens that change between light and dark surfaces.
 */
export type BrandingThemePalette = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  elevated: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
  charts: [string, string, string, string, string];
};

/**
 * Aggregate theme palette including core brand colors.
 */
export type BrandingPalette = {
  brand: BrandingCorePalette;
  light: BrandingThemePalette;
  dark: BrandingThemePalette;
};

/**
 * Gradient tokens used across backgrounds and effects.
 */
export type BrandingGradients = {
  brand: string;
  primary: string;
  card: string;
  hero: string;
  navigation: string;
  motion: {
    primary: string;
    card: string;
    backgroundLight: string;
    backgroundDark: string;
  };
  glass: {
    base: string;
    border: string;
    shadow: string;
    motionBackground: string;
    motionBorder: string;
    motionShadow: string;
    motionBlur: string;
    motionBackgroundDark: string;
    motionBorderDark: string;
    motionShadowDark: string;
  };
};

/**
 * Motion timing, easing, and elevation primitives.
 */
export type BrandingMotion = {
  durations: Record<"fast" | "normal" | "slow", string>;
  easings: Record<"spring" | "bounce" | "smooth", string>;
  shadows: Record<"sm" | "md" | "lg" | "xl" | "glow", string>;
  scales: Record<"sm" | "md" | "lg" | "press", string>;
};

/**
 * Metadata associated with brand surfaces.
 */
export type BrandingMetadata = {
  name: string;
  tagline: string;
  description: string;
  keywords: string[];
  primaryUrl: string;
  inquiriesEmail: string;
  supportEmail: string;
  marketingEmail: string;
};

/**
 * Theme token mapping keyed by CSS custom property name.
 */
export type BrandingThemeTokens = Record<string, string>;

/**
 * Token sets for light and dark modes.
 */
export type BrandingTokens = {
  light: BrandingThemeTokens;
  dark: BrandingThemeTokens;
};

/**
 * Distributed metadata references for publishing theme assets.
 */
export type BrandingDistribution = {
  metadataUri: string;
  themePassUri?: string;
  media: {
    logo: string;
    favicon: string;
    appleTouchIcon: string;
    socialPreview: string;
    [key: string]: string;
  };
};

/**
 * Deep partial utility for nested configuration objects.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U> ? Array<DeepPartial<U>>
    : T[P] extends Record<string, unknown> ? DeepPartial<T[P]>
    : T[P];
};

/**
 * Exported representation of the Dynamic Branding system.
 */
export type DynamicBrandingConfig = {
  palette: BrandingPalette;
  gradients: BrandingGradients;
  motion: BrandingMotion;
  metadata: BrandingMetadata;
  tokens: BrandingTokens;
  assets: {
    logo: string;
    favicon: string;
    appleTouchIcon: string;
    socialPreview: string;
  };
  distribution: BrandingDistribution;
};

/**
 * Helper type that allows partial overrides when importing branding config.
 */
export type DynamicBrandingOverrides = DeepPartial<DynamicBrandingConfig>;
