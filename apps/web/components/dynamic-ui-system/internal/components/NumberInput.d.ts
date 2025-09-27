import React from "react";
import { Input } from ".";
interface NumberInputProps
  extends
    Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  padStart?: number;
}
declare const NumberInput: React.ForwardRefExoticComponent<
  Omit<NumberInputProps, "ref"> & React.RefAttributes<HTMLInputElement>
>;
export { NumberInput };
//# sourceMappingURL=NumberInput.d.ts.map
