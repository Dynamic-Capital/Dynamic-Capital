import React, { ReactNode } from "react";
import { IconName } from "../icons";
interface CommonProps {
  variant?: "primary" | "secondary" | "tertiary" | "danger";
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
  label?: string;
  weight?: "default" | "strong";
  prefixIcon?: IconName;
  suffixIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fillWidth?: boolean;
  horizontal?: "start" | "center" | "end" | "between";
  children?: ReactNode;
  href?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  arrowIcon?: boolean;
}
export type ButtonProps =
  & CommonProps
  & React.ButtonHTMLAttributes<HTMLButtonElement>;
export type AnchorProps =
  & CommonProps
  & React.AnchorHTMLAttributes<HTMLAnchorElement>;
declare const Button: React.ForwardRefExoticComponent<
  (ButtonProps | AnchorProps) & React.RefAttributes<HTMLButtonElement>
>;
export { Button };
//# sourceMappingURL=Button.d.ts.map
