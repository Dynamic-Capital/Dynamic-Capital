import React, { ReactNode } from "react";
import { Placement } from "@floating-ui/react-dom";
import { NavigationLayout } from "../hooks/useArrowNavigation";
export interface DropdownWrapperProps {
  fillWidth?: boolean;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  placement?: Placement;
  trigger: ReactNode;
  dropdown: ReactNode;
  selectedOption?: string;
  style?: React.CSSProperties;
  className?: string;
  onSelect?: (value: string) => void;
  closeAfterClick?: boolean;
  handleArrowNavigation?: boolean;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  isNested?: boolean;
  navigationLayout?: NavigationLayout;
  columns?: number | string;
  optionsCount?: number;
  dropdownId?: string;
  disableTriggerClick?: boolean;
}
declare const DropdownWrapper: React.ForwardRefExoticComponent<
  DropdownWrapperProps & React.RefAttributes<HTMLDivElement>
>;
export { DropdownWrapper };
//# sourceMappingURL=DropdownWrapper.d.ts.map
