import React, { ReactNode } from "react";
import { Flex } from ".";
interface InlineCodeProps extends React.ComponentProps<typeof Flex> {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
declare const InlineCode: React.ForwardRefExoticComponent<
  Omit<InlineCodeProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { InlineCode };
//# sourceMappingURL=InlineCode.d.ts.map
