import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import typography from "@tailwindcss/typography";
import animate from "tailwindcss-animate";

const sharedPreset = {
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      typography: () => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": "hsl(var(--foreground) / 0.82)",
            "--tw-prose-headings": "hsl(var(--foreground))",
            "--tw-prose-links": "hsl(var(--primary))",
            "--tw-prose-bold": "hsl(var(--foreground))",
            "--tw-prose-quotes": "hsl(var(--foreground))",
            "--tw-prose-code": "hsl(var(--primary))",
            "--tw-prose-pre-bg": "hsl(var(--muted))",
            color: "hsl(var(--foreground))",
            maxWidth: "72ch",
            p: {
              color: "inherit",
              marginTop: "0",
              marginBottom: "var(--space-sm)",
              lineHeight: "1.7",
            },
            a: {
              color: "hsl(var(--primary))",
              fontWeight: "600",
              textDecoration: "none",
            },
            "a:hover": {
              color: "hsl(var(--primary) / 0.85)",
            },
            strong: {
              color: "inherit",
              fontWeight: "600",
            },
            h1: {
              color: "inherit",
              fontSize: "var(--text-title)",
              lineHeight: "1.2",
              marginBottom: "var(--space-base)",
            },
            h2: {
              color: "inherit",
              fontSize: "var(--text-heading)",
              lineHeight: "1.3",
              marginBottom: "var(--space-base)",
            },
            h3: {
              color: "inherit",
              fontSize: "var(--text-subheading)",
              lineHeight: "1.4",
              marginBottom: "var(--space-base)",
            },
            h4: {
              color: "inherit",
              fontSize: "var(--text-body-lg)",
              lineHeight: "1.5",
              marginBottom: "var(--space-base)",
            },
            "h5, h6": {
              color: "inherit",
              fontSize: "var(--text-body)",
              marginBottom: "var(--space-base)",
            },
            ul: {
              paddingLeft: "var(--space-base)",
              marginBottom: "var(--space-sm)",
            },
            ol: {
              paddingLeft: "var(--space-base)",
              marginBottom: "var(--space-sm)",
            },
            "li::marker": {
              color: "hsl(var(--muted-foreground))",
            },
            li: {
              marginTop: "var(--space-xs)",
              marginBottom: "var(--space-xs)",
            },
            hr: {
              borderColor: "hsl(var(--border))",
            },
            blockquote: {
              color: "inherit",
              borderLeftColor: "hsl(var(--primary))",
              paddingLeft: "var(--space-base)",
            },
            code: {
              backgroundColor: "hsl(var(--muted))",
              borderRadius: "0.375rem",
              color: "hsl(var(--primary))",
              fontFamily:
                "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace)",
              fontSize: "0.875rem",
              fontWeight: "500",
              padding: "var(--space-xs)",
            },
            pre: {
              backgroundColor: "hsl(var(--muted))",
              borderRadius: "var(--rounded-lg)",
              padding: "var(--space-base)",
            },
            "pre code": {
              backgroundColor: "transparent",
              padding: "0",
            },
          },
        },
        invert: {
          css: {
            "--tw-prose-body": "hsl(var(--foreground) / 0.78)",
            "--tw-prose-headings": "hsl(var(--foreground))",
            "--tw-prose-links": "hsl(var(--primary))",
            "--tw-prose-bold": "hsl(var(--foreground))",
            color: "hsl(var(--foreground))",
            blockquote: {
              borderLeftColor: "hsl(var(--primary))",
            },
            hr: {
              borderColor: "hsl(var(--border))",
            },
            code: {
              backgroundColor: "hsl(var(--muted))",
              color: "hsl(var(--primary))",
            },
            pre: {
              backgroundColor: "hsl(var(--muted))",
            },
          },
        },
      }),
      fontFamily: {
        sans: [
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
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
        display: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        body: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        inter: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        poppins: ["Poppins", "system-ui", "-apple-system", "sans-serif"],
        "sf-pro": ["SF Pro Text", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.5" }],
        sm: ["0.875rem", { lineHeight: "1.6" }],
        base: ["1rem", { lineHeight: "1.7" }],
        lg: ["1.125rem", { lineHeight: "1.6" }],
        xl: ["1.25rem", { lineHeight: "1.5" }],
        "2xl": ["1.5rem", { lineHeight: "1.4" }],
        "3xl": ["1.875rem", { lineHeight: "1.3" }],
        "4xl": ["2.25rem", { lineHeight: "1.2" }],
        "5xl": ["3rem", { lineHeight: "1.1" }],
        "6xl": ["3.75rem", { lineHeight: "1" }],
      },
      spacing: {
        xs: "0.25rem",
        sm: "0.5rem",
        base: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "3rem",
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
          foreground: "hsl(var(--telegram-foreground))",
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
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
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
        "motion-primary": "var(--gradient-motion-primary)",
        "motion-card": "var(--gradient-motion-card)",
        "motion-background": "var(--gradient-motion-bg)",
        "glass-motion": "var(--glass-motion-bg)",
      },
      boxShadow: {
        telegram: "var(--shadow-telegram)",
        primary: "var(--shadow-primary)",
        elegant: "var(--shadow-lg)",
        "motion-sm": "var(--shadow-motion-sm)",
        "motion-md": "var(--shadow-motion-md)",
        "motion-lg": "var(--shadow-motion-lg)",
        "motion-xl": "var(--shadow-motion-xl)",
        "motion-glow": "var(--shadow-motion-glow)",
        "glass-motion": "var(--glass-motion-shadow)",
      },
      transitionTimingFunction: {
        smooth: "var(--motion-ease-smooth)",
        spring: "var(--motion-ease-spring)",
        bounce: "var(--motion-ease-bounce)",
      },
      transitionDuration: {
        DEFAULT: "var(--motion-duration-normal)",
        fast: "var(--motion-duration-fast)",
        normal: "var(--motion-duration-normal)",
        slow: "var(--motion-duration-slow)",
      },
      scale: {
        sm: "var(--scale-motion-sm)",
        md: "var(--scale-motion-md)",
        lg: "var(--scale-motion-lg)",
        press: "var(--scale-motion-press)",
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
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        glow: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.02)" },
        },
        float: {
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
        reflection: {
          "0%": { transform: "translateX(-100%) skewX(-15deg)" },
          "100%": { transform: "translateX(200%) skewX(-15deg)" },
        },
        attention: {
          "0%, 100%": { transform: "scale(1)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "scale(1.05)" },
          "20%, 40%, 60%, 80%": { transform: "scale(0.98)" },
        },
        "wave-move": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 20px" },
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
        shimmer: "shimmer 2s infinite",
        glow: "glow 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        reflection: "reflection 3s ease-in-out infinite",
        attention: "attention 2s ease-in-out infinite",
        wave: "wave-move 3s linear infinite",
      },
    },
  },
  plugins: [
    animate,
    typography,
    plugin(({ addUtilities, addComponents }) => {
      addUtilities({
        ".will-change-transform": {
          willChange: "transform",
        },
        ".bg-gradient-brand": {
          backgroundImage: "var(--gradient-brand)",
        },
        ".text-gradient-brand": {
          backgroundImage: "var(--gradient-brand)",
          color: "transparent",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
        },
      });

      const glassMotionStyles = {
        backgroundImage: "var(--glass-motion-bg)",
        borderColor: "var(--glass-motion-border)",
        backdropFilter: "var(--glass-motion-blur)",
        WebkitBackdropFilter: "var(--glass-motion-blur)",
        boxShadow: "var(--glass-motion-shadow)",
        borderWidth: "1px",
        borderStyle: "solid",
      } as const;

      const motionCardStyles = {
        position: "relative",
        overflow: "hidden",
        backgroundImage: "var(--gradient-motion-card)",
        boxShadow: "var(--shadow-motion-md)",
        borderColor: "hsl(var(--border) / 0.5)",
        borderWidth: "1px",
        borderStyle: "solid",
        backdropFilter: "var(--glass-motion-blur)",
        WebkitBackdropFilter: "var(--glass-motion-blur)",
        transitionProperty: "transform, box-shadow, border-color",
        transitionDuration: "var(--motion-duration-normal)",
        transitionTimingFunction: "var(--motion-ease-smooth)",
      } as const;

      const motionButtonStyles = {
        position: "relative",
        overflow: "hidden",
        transitionProperty:
          "transform, box-shadow, background-color, border-color, color",
        transitionDuration: "var(--motion-duration-normal)",
        transitionTimingFunction: "var(--motion-ease-spring)",
      } as const;

      addComponents({
        ".surface-glass": glassMotionStyles,
        ".surface-glass-muted": {
          backgroundImage: "var(--gradient-card)",
          borderColor: "hsl(var(--border) / 0.55)",
          boxShadow: "var(--shadow-motion-md)",
          borderWidth: "1px",
          borderStyle: "solid",
        },
      });

      addUtilities(
        {
          ".glass-motion": glassMotionStyles,
          ".motion-card": motionCardStyles,
          ".motion-button": motionButtonStyles,
        },
        {
          variants: ["responsive"],
        },
      );
    }),
  ],
} satisfies Config;

export default sharedPreset;
