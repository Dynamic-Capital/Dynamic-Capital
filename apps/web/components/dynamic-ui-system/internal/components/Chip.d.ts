import React, { MouseEventHandler, ReactNode } from "react";
import { Flex, IconButtonProps } from ".";
import { IconName } from "../icons";
interface ChipProps extends React.ComponentProps<typeof Flex> {
  label: string;
  selected?: boolean;
  prefixIcon?: IconName;
  onRemove?: () => void;
  onClick?: MouseEventHandler<HTMLDivElement>;
  children?: ReactNode;
  iconButtonProps?: Partial<IconButtonProps>;
  style?: React.CSSProperties;
  className?: string;
}
declare const Chip: React.FC<ChipProps>;
export { Chip };
//# sourceMappingURL=Chip.d.ts.map
