import React, { ReactNode } from "react";
import { Flex } from ".";
import { IconName } from "../icons";
import { ColorScheme } from "@/types";
interface TagProps extends React.ComponentProps<typeof Flex> {
  variant?: ColorScheme | "gradient";
  size?: "s" | "m" | "l";
  label?: string;
  prefixIcon?: IconName;
  suffixIcon?: IconName;
  children?: ReactNode;
}
declare const Tag: React.ForwardRefExoticComponent<
  Omit<TagProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Tag };
export type { TagProps };
//# sourceMappingURL=Tag.d.ts.map
