import type { CSSProperties, HTMLAttributes } from "react";

import { OPEN_WEB_UI_ACCENT, OPEN_WEB_UI_ACCENT_SOFT } from "./theme";

const BADGE_BASE_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.35rem 0.85rem",
  borderRadius: "999px",
  fontSize: "0.62rem",
  fontWeight: 700,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: "#ecf6ff",
  background:
    "linear-gradient(120deg, rgba(120, 198, 255, 0.65), rgba(58, 128, 214, 0.45) 45%, rgba(12, 36, 80, 0.8))",
  border: "1px solid rgba(168, 216, 255, 0.55)",
  boxShadow: "0 10px 24px rgba(8, 36, 84, 0.32)",
  whiteSpace: "nowrap",
};

const ICON_STYLE: CSSProperties = {
  width: "0.65rem",
  height: "0.65rem",
  flexShrink: 0,
  borderRadius: "999px",
  background:
    "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.1) 58%)",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.38), 0 0 12px rgba(125, 196, 255, 0.65)",
};

export type OpenWebUiBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string;
  showPulse?: boolean;
};

export function OpenWebUiBadge({
  label = "Optimized for Open WebUI",
  className,
  style,
  showPulse = true,
  ...props
}: OpenWebUiBadgeProps) {
  const composedStyle: CSSProperties = {
    ...BADGE_BASE_STYLE,
    ...(style ?? {}),
  };

  return (
    <span
      aria-label={props["aria-label"] ?? label}
      {...props}
      className={className ? `open-webui-badge ${className}` : "open-webui-badge"}
      style={composedStyle}
    >
      <span
        aria-hidden
        style={{
          ...ICON_STYLE,
          boxShadow: showPulse
            ? `${ICON_STYLE.boxShadow}, 0 0 18px ${OPEN_WEB_UI_ACCENT_SOFT}`
            : ICON_STYLE.boxShadow,
          background:
            showPulse
              ? `radial-gradient(circle at 30% 30%, #fff, ${OPEN_WEB_UI_ACCENT} 52%, rgba(30,67,115,0.68))`
              : ICON_STYLE.background,
        }}
      />
      <span style={{ letterSpacing: "inherit" }}>{label}</span>
    </span>
  );
}
