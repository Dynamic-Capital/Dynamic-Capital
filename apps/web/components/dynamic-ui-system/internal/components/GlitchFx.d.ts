import React from "react";
import { Flex } from ".";
interface GlitchFxProps extends React.ComponentProps<typeof Flex> {
  children: React.ReactNode;
  speed?: "slow" | "medium" | "fast";
  interval?: number;
  trigger?: "instant" | "hover" | "custom";
  continuous?: boolean;
}
declare const GlitchFx: React.ForwardRefExoticComponent<
  Omit<GlitchFxProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { GlitchFx };
//# sourceMappingURL=GlitchFx.d.ts.map
