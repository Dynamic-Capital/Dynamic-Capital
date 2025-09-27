import React from "react";
import { Flex } from ".";
export interface AccordionHandle extends HTMLDivElement {
  toggle: () => void;
  open: () => void;
  close: () => void;
}
interface AccordionProps
  extends Omit<React.ComponentProps<typeof Flex>, "title"> {
  title: React.ReactNode;
  children: React.ReactNode;
  icon?: string;
  iconRotation?: number;
  size?: "s" | "m" | "l";
  radius?: "xs" | "s" | "m" | "l" | "xl" | "full";
  open?: boolean;
  onToggle?: () => void;
  className?: string;
  style?: React.CSSProperties;
}
declare const Accordion: React.ForwardRefExoticComponent<
  Omit<AccordionProps, "ref"> & React.RefAttributes<AccordionHandle>
>;
export { Accordion };
//# sourceMappingURL=Accordion.d.ts.map
