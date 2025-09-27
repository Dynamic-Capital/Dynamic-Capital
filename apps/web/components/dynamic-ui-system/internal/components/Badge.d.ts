import React from "react";
import { Flex } from ".";
import { IconName } from "../icons";
export interface BadgeProps extends React.ComponentProps<typeof Flex> {
  title?: string;
  icon?: IconName;
  arrow?: boolean;
  children?: React.ReactNode;
  href?: string;
  effect?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}
declare const Badge: React.ForwardRefExoticComponent<
  & Omit<BadgeProps, "ref">
  & React.RefAttributes<HTMLDivElement | HTMLAnchorElement>
>;
export { Badge };
//# sourceMappingURL=Badge.d.ts.map
