import React from "react";
import { InputProps } from ".";
interface ColorInputProps extends Omit<InputProps, "onChange" | "value"> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
declare const ColorInput: React.ForwardRefExoticComponent<
  ColorInputProps & React.RefAttributes<HTMLInputElement>
>;
export { ColorInput };
//# sourceMappingURL=ColorInput.d.ts.map
