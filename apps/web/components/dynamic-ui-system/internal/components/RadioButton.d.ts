import React from "react";
import { InteractiveDetailsProps } from ".";
interface RadioButtonProps
  extends
    Omit<InteractiveDetailsProps, "onClick">,
    React.InputHTMLAttributes<HTMLInputElement> {
  style?: React.CSSProperties;
  className?: string;
  isChecked?: boolean;
  name?: string;
  value?: string;
  disabled?: boolean;
  onToggle?: () => void;
}
declare const RadioButton: React.FC<RadioButtonProps>;
export { RadioButton };
export type { RadioButtonProps };
//# sourceMappingURL=RadioButton.d.ts.map
