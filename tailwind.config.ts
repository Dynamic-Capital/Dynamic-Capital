import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        "sans": [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        "mono": [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
        "display": ["Inter", "system-ui", "-apple-system", "sans-serif"],
        "body": ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "xs": ["0.75rem", { lineHeight: "1.5" }], // 12px
        "sm": ["0.875rem", { lineHeight: "1.6" }], // 14px
        "base": ["1rem", { lineHeight: "1.7" }], // 16px
        "lg": ["1.125rem", { lineHeight: "1.6" }], // 18px
        "xl": ["1.25rem", { lineHeight: "1.5" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "1.4" }], // 24px
        "3xl": ["1.875rem", { lineHeight: "1.3" }], // 30px
        "4xl": ["2.25rem", { lineHeight: "1.2" }], // 36px
        "5xl": ["3rem", { lineHeight: "1.1" }], // 48px
        "6xl": ["3.75rem", { lineHeight: "1" }], // 60px
      },
      spacing: {
        "xs": "0.25rem", // 4px
        "sm": "0.5rem", // 8px
        "base": "1rem", // 16px
        "lg": "1.5rem", // 24px
        "xl": "2rem", // 32px
        "2xl": "3rem", // 48px
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        "dc-brand": {
          DEFAULT: "hsl(var(--dc-brand))",
          light: "hsl(var(--dc-brand-light))",
          dark: "hsl(var(--dc-brand-dark))",
        },
        "dc-secondary": "hsl(var(--dc-secondary))",
        "dc-accent": "hsl(var(--dc-accent))",
        telegram: {
          DEFAULT: "hsl(var(--telegram))",
          light: "hsl(var(--telegram-light))",
          dark: "hsl(var(--telegram-dark))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--status-success))",
          foreground: "hsl(var(--status-success-foreground))",
          muted: "hsl(var(--status-success-muted))",
          border: "hsl(var(--status-success-border))",
        },
        warning: {
          DEFAULT: "hsl(var(--status-warning))",
          foreground: "hsl(var(--status-warning-foreground))",
          muted: "hsl(var(--status-warning-muted))",
          border: "hsl(var(--status-warning-border))",
        },
        info: {
          DEFAULT: "hsl(var(--status-info))",
          foreground: "hsl(var(--status-info-foreground))",
          muted: "hsl(var(--status-info-muted))",
          border: "hsl(var(--status-info-border))",
        },
        error: {
          DEFAULT: "hsl(var(--status-error))",
          foreground: "hsl(var(--status-error-foreground))",
          muted: "hsl(var(--status-error-muted))",
          border: "hsl(var(--status-error-border))",
        },
        market: {
          bull: "hsl(var(--market-bull))",
          bear: "hsl(var(--market-bear))",
          neutral: "hsl(var(--market-neutral))",
          volatile: "hsl(var(--market-volatile))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-brand": "var(--gradient-brand)",
        "gradient-telegram": "var(--gradient-telegram)",
        "gradient-card": "var(--gradient-card)",
        "gradient-hero": "var(--gradient-hero)",
        "gradient-navigation": "var(--gradient-navigation)",
        "gradient-success": "var(--gradient-success)",
        "gradient-warning": "var(--gradient-warning)",
        "gradient-info": "var(--gradient-info)",
        "gradient-error": "var(--gradient-error)",
      },
      boxShadow: {
        "telegram": "var(--shadow-telegram)",
        "primary": "var(--shadow-primary)",
        "elegant": "var(--shadow-lg)",
      },
      transitionTimingFunction: {
        "smooth": "var(--transition-base)",
        "fast": "var(--transition-fast)",
        "slow": "var(--transition-slow)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Fade animations
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-10px)" },
        },
        // Scale animations
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "60%": { opacity: "1", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Slide animations
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-100%)" },
        },
        // Glass effect animations
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "glow": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.02)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "pulse-glow": {
          "0%, 100%": {
            opacity: "1",
            transform: "scale(1)",
            boxShadow: "0 0 20px hsl(var(--primary) / 0.3)",
          },
          "50%": {
            opacity: "0.9",
            transform: "scale(1.02)",
            boxShadow: "0 0 40px hsl(var(--primary) / 0.6)",
          },
        },
        // Reflection animations
        "reflection": {
          "0%": { transform: "translateX(-100%) skewX(-15deg)" },
          "100%": { transform: "translateX(200%) skewX(-15deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "fade-out": "fade-out 0.3s ease-out forwards",
        "scale-in": "scale-in 0.2s ease-out forwards",
        "scale-out": "scale-out 0.2s ease-out forwards",
        "bounce-in": "bounce-in 0.8s ease-out forwards",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-out-left": "slide-out-left 0.3s ease-out",
        "shimmer": "shimmer 2s infinite",
        "glow": "glow 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "reflection": "reflection 3s ease-in-out infinite",
      },
    },
  },
  plugins: [
    animate,
    function ({ addUtilities }) {
      addUtilities({
        ".will-change-transform": {
          willChange: "transform",
        },
      });
    },
  ],
} satisfies Config;
