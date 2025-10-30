import {
  BorderStyle,
  ChartMode,
  ChartVariant,
  NeutralColor,
  ScalingSize,
  Schemes,
  SolidStyle,
  SolidType,
  SurfaceStyle,
  Theme,
  TransitionStyle,
} from "../../components/dynamic-ui-system";
type NextFontWithVariable = {
  className: string;
  variable: string;
  style: {
    fontFamily: string;
    fontWeight?: number;
    fontStyle?: string;
  };
};

/**
 * Display configuration for UI elements.
 */
export type DisplayConfig = {
  location: boolean;
  time: boolean;
  themeSwitcher: boolean;
};

/**
 * Route configuration value for a single path.
 */
export type RouteConfigValue =
  | boolean
  | {
    enabled: boolean;
    includeChildren?: boolean;
  };

/**
 * Route configuration for enabled/disabled routes.
 */
export type RoutesConfig = Record<`/${string}`, RouteConfigValue>;

/**
 * Normalized route definition.
 */
export type NormalizedRouteDefinition = {
  path: `/${string}`;
  enabled: boolean;
  includeChildren: boolean;
};

/**
 * Protected route configuration.
 */
export type ProtectedRoutesConfig = Record<`/${string}`, boolean>;

/**
 * Font configuration for each variant.
 */
export type FontsConfig = {
  heading: NextFontWithVariable;
  body: NextFontWithVariable;
  label: NextFontWithVariable;
  code: NextFontWithVariable;
};

/**
 * Style customization for main layout.
 */
export type StyleConfig = {
  theme: Theme;
  neutral: NeutralColor;
  brand: Schemes;
  accent: Schemes;
  solid: SolidType;
  solidStyle: SolidStyle;
  border: BorderStyle;
  surface: SurfaceStyle;
  transition: TransitionStyle;
  scaling: ScalingSize;
};

/**
 * Data style configuration for charts.
 */
export type DataStyleConfig = {
  variant: ChartVariant;
  mode: ChartMode;
  height: number;
  axis: {
    stroke: string;
  };
  tick: {
    fill: string;
    fontSize: number;
    line: boolean;
  };
};

/**
 * Effects configuration for UI visuals.
 */
export type EffectsConfig = {
  mask: {
    cursor: boolean;
    x: number;
    y: number;
    radius: number;
  };
  gradient: {
    display: boolean;
    opacity: number;
    x: number;
    y: number;
    width: number;
    height: number;
    tilt: number;
    colorStart: string;
    colorEnd: string;
  };
  dots: {
    display: boolean;
    opacity: number;
    size: string;
    color: string;
  };
  grid: {
    display: boolean;
    opacity: number;
    color: string;
    width: string;
    height: string;
  };
  lines: {
    display: boolean;
    opacity: number;
    color: string;
    size: string;
    thickness: number;
    angle: number;
  };
};

/**
 * Mailchimp configuration for newsletter forms.
 */
export type MailchimpConfig = {
  action: string;
  effects: EffectsConfig;
};

/**
 * Schema data for SEO/meta tags.
 */
export type SchemaConfig = {
  logo: string;
  type: string;
  name: string;
  description: string;
  email: string;
};

/**
 * Social links for organization.
 */
export type SameAsConfig = {
  threads?: string;
  linkedin?: string;
  discord?: string;
  x?: string;
  telegram?: string;
  telegramCommunity?: string;
  telegramResults?: string;
  instagram?: string;
  facebook?: string;
  tradingview?: string;
  website?: string;
};

/**
 * Social sharing configuration for blog posts.
 */
export type SocialSharingConfig = {
  display: boolean;
  platforms: {
    x: boolean;
    linkedin: boolean;
    facebook: boolean;
    pinterest: boolean;
    whatsapp: boolean;
    reddit: boolean;
    telegram: boolean;
    email: boolean;
    copyLink: boolean;
  };
};

/**
 * High-level Dynamic UI primitives used to configure global surfaces.
 */
export type SystemUIBasicsConfig = {
  baseURL: string;
  display: DisplayConfig;
  fonts: FontsConfig;
  style: StyleConfig;
};

/**
 * Routing, schema, and metadata contexts required by the UI system.
 */
export type SystemUIContextsConfig = {
  routes: RoutesConfig;
  protectedRoutes: ProtectedRoutesConfig;
  schema: SchemaConfig;
  sameAs: SameAsConfig;
  socialSharing: SocialSharingConfig;
};

/**
 * Modular feature blocks that can be toggled independently.
 */
export type SystemUIModulesConfig = {
  mailchimp: MailchimpConfig;
};

/**
 * Form-oriented configuration shared across newsletter and lead capture flows.
 */
export type SystemUIFormControlsConfig = {
  newsletter: MailchimpConfig;
};

/**
 * Core component tokens exposed to consuming surfaces.
 */
export type SystemUIComponentsConfig = {
  display: DisplayConfig;
  fonts: FontsConfig;
  style: StyleConfig;
};

/**
 * Data visualisation primitives for charts and analytics widgets.
 */
export type SystemUIDataVizConfig = {
  dataStyle: DataStyleConfig;
};

/**
 * Effect layers used across hero backgrounds and form modules.
 */
export type SystemUIEffectsConfig = {
  background: EffectsConfig;
  newsletter: EffectsConfig;
};

/**
 * Aggregate view of the system UI building blocks.
 */
export type SystemUIConfig = {
  basics: SystemUIBasicsConfig;
  contexts: SystemUIContextsConfig;
  modules: SystemUIModulesConfig;
  formControls: SystemUIFormControlsConfig;
  components: SystemUIComponentsConfig;
  dataViz: SystemUIDataVizConfig;
  effects: SystemUIEffectsConfig;
};

/**
 * Top-level config types for dynamic-ui.config.ts
 */
export type DynamicUIConfig = {
  display: DisplayConfig;
  mailchimp: MailchimpConfig;
  routes: RoutesConfig;
  protectedRoutes: ProtectedRoutesConfig;
  baseURL: string;
  fonts: FontsConfig;
  style: StyleConfig;
  schema: SchemaConfig;
  sameAs: SameAsConfig;
  socialSharing: SocialSharingConfig;
  effects: EffectsConfig;
  dataStyle: DataStyleConfig;
};

export type {
  BrandingCorePalette,
  BrandingGradients,
  BrandingMetadata,
  BrandingMotion,
  BrandingPalette,
  BrandingThemePalette,
  BrandingThemeTokens,
  BrandingTokens,
  DeepPartial,
  DynamicBrandingConfig,
  DynamicBrandingOverrides,
} from "./branding.types";
