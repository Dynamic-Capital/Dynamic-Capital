# Theme Pass Specification

Partners can ship a "Theme Pass" JSON document to customize Dynamic Capital
surfaces without touching the codebase. A Theme Pass mirrors the structure of
the primitives used by `createBrandingTokens` and is validated via
[`ThemePassSchema`](../apps/web/resources/types/theme-pass.ts). After
validation, the payload is normalized into CSS variables through
[`normalizeThemePassTokens`](../apps/web/utils/theme-pass.ts) and merged with
the base token set inside
[`importDynamicBranding`](../apps/web/resources/dynamic-branding.config.ts).

## Top-Level Structure

A Theme Pass is a JSON object with the following optional sections:

| Key          | Description                                                                           |
| ------------ | ------------------------------------------------------------------------------------- |
| `version`    | String identifier for the published revision.                                         |
| `metadata`   | Display name, description, release window, and contrast guarantees.                   |
| `assets`     | Hosted brand assets (logo, favicon, hero art, etc.).                                  |
| `colors`     | Brand palette, light/dark surface colors, and gradients.                              |
| `typography` | Font families, weights, sizes, and rhythm adjustments.                                |
| `effects`    | Motion primitives (durations, easings, shadows, scales) plus optional overlay tokens. |
| `sounds`     | Map of UI sound identifiers to hosted media files.                                    |
| `tokens`     | Escape hatch for direct CSS custom property overrides (must start with `--`).         |

Each section is optional. Missing values fall back to the defaults from
[`dynamicBranding.tokens`](../apps/web/resources/dynamic-branding.config.ts),
ensuring partial payloads remain safe to apply.

## Colors and Gradients

### Brand Palette

```jsonc
"colors": {
  "brand": {
    "base": "0 84% 58%",
    "light": "0 92% 68%",
    "dark": "0 76% 48%",
    "secondary": "200 96% 52%",
    "accent": "350 88% 60%"
  }
}
```

_Keys:_ `base`, `light`, `dark`, `secondary`, and `accent` map to the generated
`--dc-*` CSS variables.

### Mode Palettes

Provide light and/or dark overrides using hue-saturation-lightness strings.
Charts accept up to 12 entries and map to `--chart-1` … `--chart-12`.

```jsonc
"colors": {
  "light": {
    "background": "0 0% 100%",
    "foreground": "224 71.4% 4.1%",
    "primary": "0 84% 58%",
    "radius": "0.75rem",
    "charts": [
      "14 100% 57%",
      "200 100% 50%"
    ],
    "tokens": {
      "--custom-card-border": "0 12% 80%"
    }
  }
}
```

### Gradients & Glass Tokens

Gradients support the base set (`brand`, `primary`, `card`, `hero`,
`navigation`). Motion and glass entries mirror the primitives inside
`BrandingGradients`.

```jsonc
"colors": {
  "gradients": {
    "brand": "linear-gradient(135deg, hsl(var(--dc-brand)) 0%, hsl(var(--dc-brand-light)) 50%, hsl(var(--dc-brand-dark)) 100%)",
    "motion": {
      "primary": "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--dc-brand-light)) 50%, hsl(var(--dc-accent)) 100%)",
      "backgroundLight": "radial-gradient(circle, hsl(var(--primary)/0.12) 0%, transparent 65%)"
    }
  }
}
```

## Typography

Font-related overrides allow partners to supply font stacks or metrics. Each key
is normalized into a CSS variable prefixed with `--font-`, `--font-weight-`,
`--font-size-`, `--line-height-`, or `--letter-spacing-`.

```jsonc
"typography": {
  "families": {
    "heading": "\"Suisse Int\", -apple-system, BlinkMacSystemFont, sans-serif",
    "body": "\"Inter\", system-ui, sans-serif"
  },
  "weights": {
    "heading": "600"
  },
  "sizes": {
    "lg": "1.25rem"
  }
}
```

## Effects and Motion

Durations, easings, shadows, and scales map to `--motion-duration-*`,
`--motion-ease-*`, `--shadow-motion-*`, and `--scale-motion-*`. Overlay tokens
are copied verbatim when prefixed with `--`.

```jsonc
"effects": {
  "motion": {
    "durations": {
      "fast": "0.18s",
      "slow": "0.65s"
    },
    "easings": {
      "spring": "cubic-bezier(0.2, 1, 0.36, 1)"
    }
  }
}
```

## Sounds

Sound identifiers are converted to CSS custom properties with the prefix
`--sound-`. Use camelCase or snake_case names; the normalizer slugifies them
(e.g. `interactionTap` → `--sound-interaction-tap`).

```jsonc
"sounds": {
  "interactionTap": "https://dao.dynamic.capital/branding/audio/interaction-tap.mp3",
  "success": "ipfs://bafy.../success.wav"
}
```

## Asset Delivery & Distribution Tracking

Finalized metadata and media must be hosted on IPFS/IPNS or a DAO-controlled
HTTPS endpoint. The repository tracks authoritative URIs inside
[`dynamicBranding.distribution`](../apps/web/resources/dynamic-branding.config.ts),
ensuring collection deployment automation references immutable payloads. The
default configuration points to:

- Metadata JSON / Theme Pass:
  `https://dao.dynamic.capital/branding/theme-pass.json`
- Media root assets: `https://dao.dynamic.capital/branding/media/`

Partners should mirror this pattern and update the URIs when assets are
reissued.

## Accessibility & Contrast Requirements

- **Minimum contrast:** 4.5:1 between foreground and background for body copy.
- **Interactive states:** Ensure hover/focus/pressed states reach 3:1 against
  their immediate background.
- **Charts:** Provide palettes that maintain at least 3:1 contrast on both light
  and dark plots.

The `metadata.contrast` object can document audited ratios (`minimum`,
`recommended`) for compliance reporting.

## Asset Size Limits

- **Logos / Wordmarks:** ≤ 500 KB (SVG preferred, otherwise optimized PNG).
- **Favicons / Touch Icons:** ≤ 100 KB per rendition.
- **Audio cues:** ≤ 250 KB per clip (MP3, OGG, or WAV).
- **Video / Motion loops:** ≤ 2 MB, H.264 MP4 or WebM.

Large files should be optimized before uploading to minimize load penalties when
tokens are consumed in production.

## Example Payload

```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "Dynamic Capital Crimson",
    "description": "High-contrast crimson accent profile for institutional decks",
    "contrast": {
      "minimum": 4.5,
      "recommended": 7
    }
  },
  "assets": {
    "logo": "https://dao.dynamic.capital/branding/media/logo.svg",
    "socialPreview": "ipfs://bafy.../social-preview.png"
  },
  "colors": {
    "brand": {
      "base": "0 84% 58%",
      "accent": "350 88% 60%"
    },
    "light": {
      "primary": "0 84% 58%"
    }
  },
  "effects": {
    "motion": {
      "durations": {
        "fast": "0.2s"
      }
    }
  },
  "sounds": {
    "interactionTap": "https://dao.dynamic.capital/branding/audio/interaction-tap.mp3"
  }
}
```

This payload only overrides a handful of primitives; the normalizer fills in
every missing token with safe defaults.
