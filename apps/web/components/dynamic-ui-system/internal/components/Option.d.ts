import { Row } from ".";
import React from "react";
export interface OptionProps
  extends Omit<React.ComponentProps<typeof Row>, "onClick"> {
  label?: React.ReactNode;
  href?: string;
  value: string;
  hasPrefix?: React.ReactNode;
  hasSuffix?: React.ReactNode;
  description?: React.ReactNode;
  danger?: boolean;
  selected?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  tabIndex?: number;
  children?: React.ReactNode;
  onClick?: (value: string) => void;
  onLinkClick?: () => void;
}
declare const Option: React.ForwardRefExoticComponent<
  Omit<OptionProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Option };
//# sourceMappingURL=Option.d.ts.map
