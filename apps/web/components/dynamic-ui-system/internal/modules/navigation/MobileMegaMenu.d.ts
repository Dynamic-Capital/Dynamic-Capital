import React from "react";
import { Flex } from "../../";
interface MenuLink {
  label: React.ReactNode;
  href: string;
  icon?: string;
  description?: React.ReactNode;
  selected?: boolean;
}
interface MenuSection {
  title?: React.ReactNode;
  links: MenuLink[];
}
interface MenuGroup {
  id: string;
  label: React.ReactNode;
  suffixIcon?: string;
  href?: string;
  selected?: boolean;
  sections?: MenuSection[];
}
interface MobileMegaMenuProps extends React.ComponentProps<typeof Flex> {
  menuGroups: MenuGroup[];
  onClose?: () => void;
}
declare const MobileMegaMenu: React.FC<MobileMegaMenuProps>;
export { MobileMegaMenu };
//# sourceMappingURL=MobileMegaMenu.d.ts.map
