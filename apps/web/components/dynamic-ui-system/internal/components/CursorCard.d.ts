import React, { ReactNode } from "react";
import { Placement } from "@floating-ui/react-dom";
import { Flex } from ".";
export interface CursorCardProps extends React.ComponentProps<typeof Flex> {
  trigger?: ReactNode;
  overlay?: ReactNode;
  placement?: Placement;
  className?: string;
  style?: React.CSSProperties;
}
declare const CursorCard: React.ForwardRefExoticComponent<
  Omit<CursorCardProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { CursorCard };
//# sourceMappingURL=CursorCard.d.ts.map
