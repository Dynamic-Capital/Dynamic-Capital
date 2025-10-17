import {
  DataStyleConfig,
  DisplayConfig,
  EffectsConfig,
  FontsConfig,
  MailchimpConfig,
  ProtectedRoutesConfig,
  RoutesConfig,
  SameAsConfig,
  SchemaConfig,
  SocialSharingConfig,
  StyleConfig,
  SystemUIConfig,
} from "./types";
import { resolveTonSiteUrl } from "../../../shared/ton/site";
import { dynamicBranding } from "./dynamic-branding.config";
import { home } from "./content";
import {
  dynamicDataStyleDefaults,
  dynamicStyleDefaults,
} from "../../../shared/branding/dynamic-ui-tokens";

const brandingMetadata = dynamicBranding.metadata;
const brandingAssets = dynamicBranding.assets;

const baseURL: string = brandingMetadata.primaryUrl;

const routes: RoutesConfig = {
  "/": true,
  "/about": true,
  "/admin": true,
  "/blog": { enabled: true, includeChildren: true },
  "/checkout": true,
  "/gallery": true,
  "/investor": true,
  "/login": true,
  "/miniapp": { enabled: true, includeChildren: true },
  "/payment-status": true,
  "/plans": true,
  "/profile": true,
  "/school": true,
  "/styles": true,
  "/support": true,
  "/telegram": true,
  "/token": true,
  "/tools": { enabled: true, includeChildren: true },
  "/ui/sandbox": true,
  "/wallet": true,
  "/work": { enabled: true, includeChildren: true },
};

const display: DisplayConfig = {
  location: true,
  time: true,
  themeSwitcher: true,
};

const protectedRoutes: ProtectedRoutesConfig = {};

import { Geist } from "next/font/google";
import { Geist_Mono } from "next/font/google";

const heading = Geist({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const body = Geist({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const label = Geist({
  variable: "--font-label",
  subsets: ["latin"],
  display: "swap",
});

const code = Geist_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
});

const fonts: FontsConfig = {
  heading,
  body,
  label,
  code,
};

const style: StyleConfig = dynamicStyleDefaults;

const dataStyle: DataStyleConfig = dynamicDataStyleDefaults;

const effects: EffectsConfig = {
  mask: {
    cursor: false,
    x: 55,
    y: 5,
    radius: 120,
  },
  gradient: {
    display: true,
    opacity: 70,
    x: 45,
    y: 60,
    width: 100,
    height: 48,
    tilt: -8,
    colorStart: "brand-background-strong",
    colorEnd: "page-background",
  },
  dots: {
    display: true,
    opacity: 35,
    size: "2",
    color: "brand-background-strong",
  },
  grid: {
    display: false,
    opacity: 100,
    color: "neutral-alpha-medium",
    width: "0.25rem",
    height: "0.25rem",
  },
  lines: {
    display: true,
    opacity: 40,
    color: "neutral-alpha-weak",
    size: "20",
    thickness: 1,
    angle: 30,
  },
};

const mailchimp: MailchimpConfig = {
  action:
    "https://dynamiccapital.us21.list-manage.com/subscribe/post?u=c1a5a210340eb6c7bff33b2ba&id=0462d244aa",
  effects: {
    mask: {
      cursor: true,
      x: 50,
      y: 0,
      radius: 110,
    },
    gradient: {
      display: true,
      opacity: 85,
      x: 55,
      y: 5,
      width: 50,
      height: 50,
      tilt: -6,
      colorStart: "brand-background-strong",
      colorEnd: "static-transparent",
    },
    dots: {
      display: true,
      opacity: 25,
      size: "2",
      color: "brand-on-background-weak",
    },
    grid: {
      display: false,
      opacity: 100,
      color: "neutral-alpha-medium",
      width: "0.25rem",
      height: "0.25rem",
    },
    lines: {
      display: false,
      opacity: 100,
      color: "neutral-alpha-medium",
      size: "16",
      thickness: 1,
      angle: 90,
    },
  },
};

const schema: SchemaConfig = {
  logo: brandingAssets.logo,
  type: "Organization",
  name: brandingMetadata.name,
  description: home.description,
  email: brandingMetadata.supportEmail,
};

const sameAs: SameAsConfig = {
  discord: "https://discord.gg/XdK96gzur9",
  telegram: "https://t.me/DynamicCapital_Support",
  instagram: "https://www.instagram.com/dynamic.capital",
  facebook: "https://www.facebook.com/dynamic.capital.fb",
  tradingview: "https://www.tradingview.com/u/DynamicCapital-FX/",
  website: resolveTonSiteUrl(),
};

const socialSharing: SocialSharingConfig = {
  display: true,
  platforms: {
    x: true,
    linkedin: true,
    telegram: true,
    facebook: false,
    pinterest: false,
    whatsapp: false,
    reddit: false,
    email: true,
    copyLink: true,
  },
};

const dynamicUI = {
  basics: {
    baseURL,
    display,
    fonts,
    style,
  },
  contexts: {
    routes,
    protectedRoutes,
    schema,
    sameAs,
    socialSharing,
  },
  modules: {
    mailchimp,
  },
  formControls: {
    newsletter: mailchimp,
  },
  components: {
    display,
    fonts,
    style,
  },
  dataViz: {
    dataStyle,
  },
  effects: {
    background: effects,
    newsletter: mailchimp.effects,
  },
} satisfies SystemUIConfig;

export {
  baseURL,
  dataStyle,
  display,
  dynamicUI,
  effects,
  fonts,
  mailchimp,
  protectedRoutes,
  routes,
  sameAs,
  schema,
  socialSharing,
  style,
};
