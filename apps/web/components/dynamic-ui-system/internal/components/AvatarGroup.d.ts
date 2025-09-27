import React from "react";
import { AvatarProps, Flex } from ".";
interface AvatarGroupProps extends React.ComponentProps<typeof Flex> {
  avatars: AvatarProps[];
  size?: "xs" | "s" | "m" | "l" | "xl";
  reverse?: boolean;
  limit?: number;
  className?: string;
  style?: React.CSSProperties;
}
declare const AvatarGroup: React.ForwardRefExoticComponent<
  Omit<AvatarGroupProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { AvatarGroup };
export type { AvatarGroupProps };
//# sourceMappingURL=AvatarGroup.d.ts.map
