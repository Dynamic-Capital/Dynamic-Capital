import React, { ReactNode } from "react";
import { IconName } from "../icons";
interface CommonProps {
  prefixIcon?: IconName;
  suffixIcon?: IconName;
  fillWidth?: boolean;
  iconSize?: "xs" | "s" | "m" | "l" | "xl";
  selected?: boolean;
  unstyled?: boolean;
  children: ReactNode;
  href?: string;
  style?: React.CSSProperties;
  className?: string;
}
export type SmartLinkProps =
  & CommonProps
  & React.AnchorHTMLAttributes<HTMLAnchorElement>;
declare const SmartLink: React.ForwardRefExoticComponent<
  & CommonProps
  & React.AnchorHTMLAttributes<HTMLAnchorElement>
  & React.RefAttributes<HTMLAnchorElement>
>;
export { SmartLink };
//# sourceMappingURL=SmartLink.d.ts.map
