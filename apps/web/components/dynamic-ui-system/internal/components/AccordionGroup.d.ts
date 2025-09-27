import React from "react";
import { Flex } from ".";
export type AccordionItem = {
  title: React.ReactNode;
  content: React.ReactNode;
};
export interface AccordionGroupProps extends React.ComponentProps<typeof Flex> {
  items: AccordionItem[];
  size?: "s" | "m" | "l";
  autoCollapse?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
declare const AccordionGroup: React.FC<AccordionGroupProps>;
export { AccordionGroup };
//# sourceMappingURL=AccordionGroup.d.ts.map
