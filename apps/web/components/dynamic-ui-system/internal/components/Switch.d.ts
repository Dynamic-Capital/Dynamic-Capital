import React from "react";
import { InteractiveDetailsProps } from ".";
interface SwitchProps
  extends
    Omit<InteractiveDetailsProps, "onClick">,
    React.InputHTMLAttributes<HTMLInputElement> {
  style?: React.CSSProperties;
  className?: string;
  isChecked: boolean;
  loading?: boolean;
  name?: string;
  value?: string;
  disabled?: boolean;
  reverse?: boolean;
  ariaLabel?: string;
  onToggle: () => void;
}
declare const Switch: React.FC<SwitchProps>;
export { Switch };
//# sourceMappingURL=Switch.d.ts.map
