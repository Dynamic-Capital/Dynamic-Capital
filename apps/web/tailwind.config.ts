import type { Config } from "tailwindcss";
import sharedPreset from "../../tailwind.preset";

const config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx,mdx,md}",
    "./pages/**/*.{ts,tsx,mdx,md}",
    "./components/**/*.{ts,tsx,mdx,md}",
    "./lib/**/*.{ts,tsx,mdx,md}",
    "./providers/**/*.{ts,tsx,mdx,md}",
    "./context/**/*.{ts,tsx,mdx,md}",
    "./hooks/**/*.{ts,tsx,mdx,md}",
    "./integrations/**/*.{ts,tsx,mdx,md}",
    "./services/**/*.{ts,tsx,mdx,md}",
    "./utils/**/*.{ts,tsx,mdx,md}",
    "./data/**/*.{ts,tsx,mdx,md}",
    "./styles/**/*.{ts,tsx,mdx,md}",
    "./content/**/*.{mdx,md}",
    "./config/**/*.{ts,tsx,mdx,md}",
  ],
  presets: [sharedPreset],
} satisfies Config;

export default config;
