import React, { ReactNode } from "react";
import { Flex } from "../../";
export interface MenuLink {
  label: ReactNode;
  href: string;
  icon?: string;
  description?: ReactNode;
  selected?: boolean;
}
export interface MenuSection {
  title?: ReactNode;
  links: MenuLink[];
}
export interface MenuGroup {
  id: string;
  label: ReactNode;
  suffixIcon?: string;
  href?: string;
  selected?: boolean;
  sections?: MenuSection[];
}
export interface MegaMenuProps extends React.ComponentProps<typeof Flex> {
  menuGroups: MenuGroup[];
  className?: string;
}
export declare const MegaMenu: React.FC<MegaMenuProps>;
//# sourceMappingURL=MegaMenu.d.ts.map
