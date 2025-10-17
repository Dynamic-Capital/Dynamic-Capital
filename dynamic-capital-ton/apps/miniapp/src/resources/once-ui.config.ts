import { Inter } from "next/font/google";
import { Space_Grotesk } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dynamiccapital.ton";

const heading = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const label = Inter({
  variable: "--font-label",
  subsets: ["latin"],
  display: "swap",
});

const code = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
});

const fonts = {
  heading,
  body,
  label,
  code,
} as const;

const style = {
  theme: "system",
  neutral: "slate",
  brand: "cyan",
  accent: "blue",
  solid: "contrast",
  solidStyle: "flat",
  border: "playful",
  surface: "filled",
  transition: "all",
  scaling: "100",
} as const;

const dataStyle = {
  variant: "gradient",
  mode: "categorical",
  height: 24,
  axis: {
    stroke: "var(--neutral-alpha-weak)",
  },
  tick: {
    fill: "var(--neutral-on-background-weak)",
    fontSize: 11,
    line: false,
  },
} as const;

const effects = {
  mask: {
    cursor: false,
    x: 48,
    y: 0,
    radius: 96,
  },
  gradient: {
    display: true,
    x: 52,
    y: -8,
    width: 120,
    height: 120,
    tilt: 12,
    colorStart: "brand-background-strong",
    colorEnd: "static-transparent",
    opacity: 60,
  },
  dots: {
    display: true,
    size: "2",
    color: "brand-on-background-weak",
    opacity: 35,
  },
  lines: {
    display: false,
    color: "neutral-alpha-weak",
    opacity: 100,
    thickness: 1,
    angle: 45,
    size: "8",
  },
  grid: {
    display: false,
    color: "neutral-alpha-weak",
    opacity: 100,
    width: "2",
    height: "2",
  },
} as const;

const meta = {
  home: {
    path: "/",
    title: "Dynamic Capital Mini App",
    description:
      "TON-powered subscriptions with auto-invest and burn, delivered inside the Dynamic Capital Telegram experience.",
    canonical: baseURL,
    robots: "index,follow",
    alternates: [
      { href: baseURL, hrefLang: "en" },
      {
        href: "https://ton.site/dynamiccapital.ton",
        hrefLang: "x-ton-gateway",
      },
    ],
  },
} as const;

const schema = {
  logo: "https://dynamiccapital.ton/icon-mark.svg",
  type: "Organization",
  name: "Dynamic Capital",
  description: meta.home.description,
  email: "hello@dynamic.capital",
} as const;

const social = {
  twitter: "https://x.com/dynamiccapital",
  linkedin: "https://www.linkedin.com/company/dynamic-capital",
  discord: "https://t.me/dynamiccapital",
} as const;

export { baseURL, fonts, style, meta, schema, social, effects, dataStyle };
