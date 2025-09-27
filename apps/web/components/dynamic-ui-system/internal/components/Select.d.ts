import React, { ReactNode } from "react";
import { DropdownWrapperProps, InputProps, OptionProps } from ".";
import { Placement } from "@floating-ui/react-dom";
type SelectOptionType = Omit<OptionProps, "selected">;
interface SelectProps
  extends
    Omit<InputProps, "onSelect" | "value">,
    Pick<DropdownWrapperProps, "minHeight" | "minWidth" | "maxWidth"> {
  options: SelectOptionType[];
  value?: string | string[];
  emptyState?: ReactNode;
  onSelect?: (value: any) => void;
  placement?: Placement;
  searchable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  fillWidth?: boolean;
  multiple?: boolean;
}
declare const Select: React.ForwardRefExoticComponent<
  SelectProps & React.RefAttributes<HTMLDivElement>
>;
export { Select };
//# sourceMappingURL=Select.d.ts.map
