export type ThemeMintPlan = {
  index: number;
  name: string;
  description: string;
  defaultPriority: number;
  contentUri: string;
  launchWindow: string;
  supply: string;
  accent: string;
  accentSoft: string;
  glow: string;
};

export const THEME_MINT_PLANS: ThemeMintPlan[] = [
  {
    index: 0,
    name: "Genesis Theme Pass",
    description:
      "Founding supporters unlock the launch palette and priority desk routing for the first mint window.",
    defaultPriority: 100,
    contentUri: "ipfs://dynamic-capital/theme/genesis.json",
    launchWindow: "Opens Mar 18 • 18:00 UTC",
    supply: "Supply 500",
    accent: "#61d1ff",
    accentSoft: "rgba(97, 209, 255, 0.16)",
    glow: "rgba(97, 209, 255, 0.42)",
  },
  {
    index: 1,
    name: "Growth Theme Pass",
    description:
      "Expands the desk's toolkit with growth partner themes and unlocks co-branded surfaces across the mini app.",
    defaultPriority: 80,
    contentUri: "ipfs://dynamic-capital/theme/growth.json",
    launchWindow: "Opens Apr 02 • 16:00 UTC",
    supply: "Supply 750",
    accent: "#facc15",
    accentSoft: "rgba(250, 204, 21, 0.18)",
    glow: "rgba(250, 204, 21, 0.35)",
  },
  {
    index: 2,
    name: "Community Theme Pass",
    description:
      "Celebrates collector milestones with community-driven art updates and grants priority access to social drops.",
    defaultPriority: 60,
    contentUri: "ipfs://dynamic-capital/theme/community.json",
    launchWindow: "Opens Apr 19 • 20:00 UTC",
    supply: "Supply 900",
    accent: "#a855f7",
    accentSoft: "rgba(168, 85, 247, 0.18)",
    glow: "rgba(168, 85, 247, 0.32)",
  },
];
