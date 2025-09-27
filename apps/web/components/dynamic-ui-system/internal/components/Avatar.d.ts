import React from "react";
import { Flex } from ".";
interface AvatarProps extends React.ComponentProps<typeof Flex> {
  size?: "xs" | "s" | "m" | "l" | "xl" | number;
  value?: string;
  src?: string;
  loading?: boolean;
  empty?: boolean;
  statusIndicator?: {
    color: "green" | "yellow" | "red" | "gray";
  };
  style?: React.CSSProperties;
  className?: string;
}
declare const Avatar: React.ForwardRefExoticComponent<
  Omit<AvatarProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Avatar };
export type { AvatarProps };
//# sourceMappingURL=Avatar.d.ts.map
