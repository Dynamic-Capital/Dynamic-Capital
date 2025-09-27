import { ReactNode } from "react";
import { Row } from ".";
import { ColorScheme, CondensedTShirtSizes } from "../types";
interface PulseProps extends React.ComponentProps<typeof Row> {
  variant?: ColorScheme;
  size?: CondensedTShirtSizes;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
declare const Pulse: import("react").ForwardRefExoticComponent<
  Omit<PulseProps, "ref"> & import("react").RefAttributes<HTMLDivElement>
>;
export { Pulse };
//# sourceMappingURL=Pulse.d.ts.map
