import React, { ReactNode } from "react";
import { IconName } from "../icons";
interface CommonProps {
  icon?: IconName;
  id?: string;
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
  tooltip?: string;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  variant?: "primary" | "secondary" | "tertiary" | "danger" | "ghost";
  className?: string;
  style?: React.CSSProperties;
  href?: string;
  children?: ReactNode;
}
export type IconButtonProps =
  & CommonProps
  & React.ButtonHTMLAttributes<HTMLButtonElement>;
type AnchorProps = CommonProps & React.AnchorHTMLAttributes<HTMLAnchorElement>;
declare const IconButton: React.ForwardRefExoticComponent<
  (IconButtonProps | AnchorProps) & React.RefAttributes<HTMLButtonElement>
>;
export { IconButton };
//# sourceMappingURL=IconButton.d.ts.map
