export type ThemePassRequirement =
  | { type: "default"; note?: string }
  | { type: "nft"; collections: string[]; note?: string }
  | { type: "dct"; minBalance: number; note?: string };

export interface ThemePassMetadata {
  accentColor?: string;
  previewImage?: string;
  backgroundImage?: string;
}

export interface ThemePassDefinition {
  id: string;
  label: string;
  description: string;
  priority: number;
  requirements: ThemePassRequirement[];
  metadata?: ThemePassMetadata;
  brandingOverrides?: Record<string, unknown>;
}

export const DEFAULT_THEME_PASS_ID = "dynamic-core";

export const THEME_PASS_DEFINITIONS: ThemePassDefinition[] = [
  {
    id: "dynamic-core",
    label: "Dynamic Core",
    description:
      "Primary Dynamic Capital experience with the signature crimson brand palette.",
    priority: 10,
    requirements: [
      {
        type: "default",
        note: "Available to all authenticated members.",
      },
    ],
    metadata: {
      accentColor: "#EE3A3A",
      previewImage: "/branding/theme-pass/core.png",
    },
  },
  {
    id: "founders-glass",
    label: "Founders Glass",
    description:
      "Glassmorphism treatment reserved for Founders Theme Pass NFT holders.",
    priority: 100,
    requirements: [
      {
        type: "nft",
        collections: ["EQF-2HMDumZqcO_xzrEwyY7JTOz9GBxWzyaasRtayL-OQAFA"],
        note: "Requires Founders Theme Pass NFT.",
      },
    ],
    metadata: {
      accentColor: "#F5C65E",
      previewImage: "/branding/theme-pass/founders.png",
    },
    brandingOverrides: {
      palette: {
        brand: {
          base: "40 84% 60%",
          light: "40 92% 72%",
          dark: "40 70% 38%",
          secondary: "210 72% 46%",
          accent: "42 96% 68%",
        },
      },
    },
  },
  {
    id: "nightfall-carbon",
    label: "Nightfall Carbon",
    description:
      "High-contrast night mode for traders holding 500+ DCT across vaults.",
    priority: 85,
    requirements: [
      {
        type: "dct",
        minBalance: 500,
        note: "Requires 500 DCT or more in wallet holdings.",
      },
    ],
    metadata: {
      accentColor: "#4DD0E1",
      previewImage: "/branding/theme-pass/nightfall.png",
    },
    brandingOverrides: {
      palette: {
        brand: {
          base: "188 82% 46%",
          light: "188 100% 64%",
          dark: "188 65% 32%",
          secondary: "222 40% 20%",
          accent: "188 88% 58%",
        },
        dark: {
          background: "200 12% 6%",
          card: "200 14% 9%",
          accent: "188 88% 58%",
          accentForeground: "0 0% 100%",
          primary: "188 72% 52%",
          ring: "188 80% 56%",
        },
      },
    },
  },
  {
    id: "vanguard-aurora",
    label: "Vanguard Aurora",
    description:
      "Iridescent gradients unlocked by the Vanguard Collector NFT set.",
    priority: 90,
    requirements: [
      {
        type: "nft",
        collections: ["EQJ7pj6B7USYBkxxyavtdGSava49Nrys_cE_g6Rvnbu1j9qw"],
        note: "Requires Vanguard Aurora Theme NFT.",
      },
      {
        type: "dct",
        minBalance: 250,
        note: "Requires 250+ DCT staked or liquid.",
      },
    ],
    metadata: {
      accentColor: "#8B5CF6",
      previewImage: "/branding/theme-pass/vanguard.png",
    },
    brandingOverrides: {
      palette: {
        brand: {
          base: "265 82% 64%",
          light: "268 88% 76%",
          dark: "262 70% 40%",
          secondary: "190 72% 46%",
          accent: "296 82% 72%",
        },
        light: {
          accent: "296 82% 72%",
          accentForeground: "0 0% 100%",
          primary: "265 80% 60%",
          secondary: "190 65% 92%",
        },
        dark: {
          accent: "296 72% 70%",
          accentForeground: "0 0% 100%",
          primary: "265 84% 62%",
          secondary: "190 52% 18%",
        },
      },
      gradients: {
        brand:
          "linear-gradient(135deg, hsl(265 82% 64%) 0%, hsl(296 72% 70%) 50%, hsl(188 82% 46%) 100%)",
      },
    },
  },
];

export function getThemePassById(
  id: string | null | undefined,
): ThemePassDefinition | undefined {
  if (!id) return undefined;
  return THEME_PASS_DEFINITIONS.find((pass) => pass.id === id);
}

export function isThemePassId(id: unknown): id is string {
  return typeof id === "string" &&
    THEME_PASS_DEFINITIONS.some((pass) => pass.id === id);
}
