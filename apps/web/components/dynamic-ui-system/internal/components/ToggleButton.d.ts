import React, { ReactNode } from "react";
import { IconName } from "../icons";
interface CommonProps {
  label?: ReactNode;
  selected?: boolean;
  variant?: "ghost" | "outline";
  size?: "s" | "m" | "l";
  radius?:
    | "none"
    | "top"
    | "right"
    | "bottom"
    | "left"
    | "top-left"
    | "top-right"
    | "bottom-right"
    | "bottom-left";
  horizontal?: "start" | "center" | "end" | "between";
  fillWidth?: boolean;
  weight?: "default" | "strong";
  truncate?: boolean;
  prefixIcon?: IconName;
  suffixIcon?: IconName;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  href?: string;
}
export type ToggleButtonProps =
  & CommonProps
  & React.ButtonHTMLAttributes<HTMLButtonElement>;
declare const ToggleButton: React.ForwardRefExoticComponent<
  & CommonProps
  & React.ButtonHTMLAttributes<HTMLButtonElement>
  & React.RefAttributes<HTMLElement>
>;
export { ToggleButton };
//# sourceMappingURL=ToggleButton.d.ts.map
