import React from "react";
import { Flex } from ".";
interface NavIconProps extends React.ComponentProps<typeof Flex> {
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  isActive: boolean;
}
declare const NavIcon: React.ForwardRefExoticComponent<
  Omit<Partial<NavIconProps>, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { NavIcon };
//# sourceMappingURL=NavIcon.d.ts.map
