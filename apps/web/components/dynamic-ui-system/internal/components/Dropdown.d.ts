import React, { ReactNode } from "react";
import { Row } from ".";
interface DropdownProps
  extends Omit<React.ComponentProps<typeof Row>, "onSelect"> {
  selectedOption?: string;
  children?: ReactNode;
  onEscape?: () => void;
  onSelect?: (event: string) => void;
}
declare const Dropdown: React.ForwardRefExoticComponent<
  Omit<DropdownProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Dropdown };
export type { DropdownProps };
//# sourceMappingURL=Dropdown.d.ts.map
