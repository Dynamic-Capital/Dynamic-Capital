import type { CSSProperties } from "react";

export const OPEN_WEB_UI_GRADIENT =
  "linear-gradient(128deg, rgba(86, 163, 255, 0.32) 0%, rgba(24, 52, 108, 0.86) 46%, rgba(5, 14, 38, 0.92) 100%)";

export const OPEN_WEB_UI_ACCENT = "#7dc4ff";
export const OPEN_WEB_UI_ACCENT_SOFT = "rgba(147, 205, 255, 0.35)";
export const OPEN_WEB_UI_SHADOW = "0 24px 48px rgba(7, 22, 51, 0.45)";

export function openWebUiPanelStyle(
  overrides?: CSSProperties,
): CSSProperties {
  return {
    backgroundImage: `radial-gradient(120% 120% at 0% 0%, rgba(104, 190, 255, 0.45), rgba(104, 190, 255, 0) 58%), ${OPEN_WEB_UI_GRADIENT}`,
    border: "1px solid rgba(150, 205, 255, 0.32)",
    borderRadius: "28px",
    boxShadow: OPEN_WEB_UI_SHADOW,
    position: "relative",
    overflow: "hidden",
    ...overrides,
  };
}

export function openWebUiGlowStyle(
  overrides?: CSSProperties,
): CSSProperties {
  return {
    pointerEvents: "none",
    position: "absolute",
    inset: "-30% -10% auto auto",
    width: "320px",
    height: "320px",
    background:
      "radial-gradient(closest-side, rgba(120, 199, 255, 0.45), rgba(120, 199, 255, 0))",
    filter: "blur(0px)",
    opacity: 0.85,
    transform: "rotate(8deg)",
    ...overrides,
  };
}
