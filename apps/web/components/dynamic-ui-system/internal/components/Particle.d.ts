import React from "react";
import { SpacingToken } from "../types";
import { DisplayProps } from "../interfaces";
import { Flex } from ".";
interface ParticleProps extends React.ComponentProps<typeof Flex> {
  density?: number;
  color?: string;
  size?: SpacingToken;
  speed?: number;
  interactive?: boolean;
  interactionRadius?: number;
  opacity?: DisplayProps["opacity"];
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
declare const Particle: React.ForwardRefExoticComponent<
  Omit<ParticleProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Particle };
//# sourceMappingURL=Particle.d.ts.map
