import type {
  DataStyleConfig,
  StyleConfig,
} from "../../apps/web/resources/types";

export const dynamicStyleDefaults: StyleConfig = {
  theme: "system",
  neutral: "gray",
  brand: "blue",
  accent: "cyan",
  solid: "contrast",
  solidStyle: "flat",
  border: "playful",
  surface: "translucent",
  transition: "all",
  scaling: "100",
};

export const dynamicDataStyleDefaults: DataStyleConfig = {
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
