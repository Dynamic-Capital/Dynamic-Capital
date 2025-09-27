import React from "react";
import { DateRange, Input } from ".";
interface DateRangeInputProps
  extends
    Omit<React.ComponentProps<typeof Input>, "onChange" | "value" | "label"> {
  id: string;
  startLabel: string;
  endLabel: string;
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  minHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}
export declare const DateRangeInput: React.FC<DateRangeInputProps>;
export {};
//# sourceMappingURL=DateRangeInput.d.ts.map
