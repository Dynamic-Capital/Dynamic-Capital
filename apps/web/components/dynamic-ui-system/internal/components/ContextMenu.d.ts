import React, { ReactNode } from "react";
import { Placement } from "@floating-ui/react-dom";
export interface ContextMenuProps {
  children: ReactNode;
  dropdown: ReactNode;
  placement?: Placement;
  fillWidth?: boolean;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  style?: React.CSSProperties;
  className?: string;
  onSelect?: (value: string) => void;
  closeAfterClick?: boolean;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  selectedOption?: string;
}
declare const ContextMenu: React.ForwardRefExoticComponent<
  ContextMenuProps & React.RefAttributes<HTMLDivElement>
>;
export { ContextMenu };
//# sourceMappingURL=ContextMenu.d.ts.map
