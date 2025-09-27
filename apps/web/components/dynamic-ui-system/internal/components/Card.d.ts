import React from "react";
import { Flex } from ".";
interface CardProps extends React.ComponentProps<typeof Flex> {
  children?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  fillHeight?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
declare const Card: React.ForwardRefExoticComponent<
  Omit<CardProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Card };
//# sourceMappingURL=Card.d.ts.map
