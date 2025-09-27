import React from "react";
import { InteractiveDetailsProps } from ".";
interface CheckboxProps
  extends
    Omit<InteractiveDetailsProps, "onClick">,
    React.InputHTMLAttributes<HTMLInputElement> {
  isChecked?: boolean;
  isIndeterminate?: boolean;
  onToggle?: () => void;
}
declare const Checkbox: React.FC<CheckboxProps>;
export { Checkbox };
export type { CheckboxProps };
//# sourceMappingURL=Checkbox.d.ts.map
