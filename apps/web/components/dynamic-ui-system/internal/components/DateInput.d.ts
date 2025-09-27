import React from "react";
import { Input } from ".";
interface DateInputProps
  extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  id: string;
  label?: string;
  placeholder?: string;
  value?: Date;
  onChange?: (date: Date) => void;
  minHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  timePicker?: boolean;
  minDate?: Date;
  maxDate?: Date;
}
export declare const DateInput: React.FC<DateInputProps>;
export {};
//# sourceMappingURL=DateInput.d.ts.map
