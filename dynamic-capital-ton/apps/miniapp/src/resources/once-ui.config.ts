import { Geist, Geist_Mono } from "next/font/google";

const baseURL = "https://dynamic.capital/miniapp";

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

const fonts = {
  heading,
  body,
  label,
  code,
};

const style = {
  theme: "system",
  neutral: "slate",
  brand: "cyan",
  accent: "indigo",
  solid: "contrast",
  solidStyle: "flat",
  border: "playful",
  surface: "filled",
  transition: "all",
  scaling: "100",
};

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
};

const effects = {
  mask: {
    cursor: false,
    x: 44,
    y: 0,
    radius: 90,
  },
  gradient: {
    display: true,
    x: 52,
    y: 12,
    width: 120,
    height: 120,
    tilt: 32,
    colorStart: "brand-background-strong",
    colorEnd: "static-transparent",
    opacity: 40,
  },
  dots: {
    display: true,
    size: "2",
    color: "brand-on-background-weak",
    opacity: 32,
  },
  lines: {
    display: false,
    color: "neutral-alpha-weak",
    opacity: 60,
    thickness: 1,
    angle: 45,
    size: "8",
  },
  grid: {
    display: false,
    color: "neutral-alpha-weak",
    opacity: 60,
    width: "3",
    height: "3",
  },
};

const meta = {
  home: {
    path: "/",
    title: "Dynamic Capital Mini App",
    description:
      "TON-powered subscriptions with live trading intel, desk automation, and theme-aware personalization.",
    image: "/images/og/miniapp.jpg",
    canonical: "https://dynamic.capital/miniapp",
    robots: "index,follow",
    alternates: [{ href: "https://dynamic.capital/miniapp", hrefLang: "en" }],
  },
};

const schema = {
  logo: "/trademarks/miniapp.svg",
  type: "Organization",
  name: "Dynamic Capital",
  description: meta.home.description,
  email: "ops@dynamic.capital",
};

const social = {
  twitter: "https://twitter.com/dynamic_cap",
  telegram: "https://t.me/dynamiccapital",
  docs: "https://docs.dynamic.capital",
};

export { baseURL, fonts, style, meta, schema, social, effects, dataStyle };
