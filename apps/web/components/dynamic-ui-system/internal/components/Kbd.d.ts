import React, { ReactNode } from "react";
import { Flex } from ".";
interface KbdProps extends React.ComponentProps<typeof Flex> {
  label?: string;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
declare const Kbd: React.ForwardRefExoticComponent<
  Omit<KbdProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Kbd };
export type { KbdProps };
//# sourceMappingURL=Kbd.d.ts.map
