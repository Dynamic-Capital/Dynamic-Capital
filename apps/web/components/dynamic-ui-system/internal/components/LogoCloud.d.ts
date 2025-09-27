import React from "react";
import { Grid, Logo } from ".";
import type { ComponentProps } from "react";
type LogoProps = ComponentProps<typeof Logo>;
interface LogoCloudProps extends React.ComponentProps<typeof Grid> {
  logos: LogoProps[];
  className?: string;
  style?: React.CSSProperties;
  limit?: number;
  rotationInterval?: number;
}
declare const LogoCloud: React.ForwardRefExoticComponent<
  Omit<LogoCloudProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { LogoCloud };
//# sourceMappingURL=LogoCloud.d.ts.map
