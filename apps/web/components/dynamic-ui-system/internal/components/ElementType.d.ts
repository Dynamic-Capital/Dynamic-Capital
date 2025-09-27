import React, { ReactNode } from "react";
interface ElementTypeProps {
  href?: string;
  onClick?: () => void;
  onLinkClick?: () => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  type?: "button" | "submit" | "reset";
  [key: string]: any;
}
declare const ElementType: React.ForwardRefExoticComponent<
  Omit<ElementTypeProps, "ref"> & React.RefAttributes<HTMLElement>
>;
export { ElementType };
//# sourceMappingURL=ElementType.d.ts.map
