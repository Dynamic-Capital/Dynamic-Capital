import type { Config } from "tailwindcss";
import sharedPreset from "./tailwind.preset";

const config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx,mdx,md}",
    "./components/**/*.{ts,tsx,mdx,md}",
    "./app/**/*.{ts,tsx,mdx,md}",
    "./lib/**/*.{ts,tsx,mdx,md}",
    "./src/**/*.{ts,tsx,mdx,md}",
    "./content/**/*.{mdx,md}",
    "./docs/**/*.{mdx,md}",
  ],
  presets: [sharedPreset],
} satisfies Config;

export default config;
