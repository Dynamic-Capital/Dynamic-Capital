import React from "react";
import { DropdownWrapperProps, UserProps } from ".";
import { Placement } from "@floating-ui/react-dom";
interface UserMenuProps
  extends
    UserProps,
    Pick<DropdownWrapperProps, "minHeight" | "minWidth" | "maxWidth"> {
  selected?: boolean;
  placement?: Placement;
  dropdown?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
declare const UserMenu: React.FC<UserMenuProps>;
export { UserMenu };
//# sourceMappingURL=UserMenu.d.ts.map
