import React from "react";
import { Flex } from ".";
interface LineProps extends React.ComponentProps<typeof Flex> {
  vert?: boolean;
  style?: React.CSSProperties;
}
declare const Line: React.ForwardRefExoticComponent<
  Omit<LineProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Line };
//# sourceMappingURL=Line.d.ts.map
