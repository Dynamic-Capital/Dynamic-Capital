import React from "react";
import { Flex } from ".";
export interface DateRange {
  startDate: Date | undefined;
  endDate: Date | undefined;
}
export interface DateRangePickerProps
  extends Omit<React.ComponentProps<typeof Flex>, "onChange"> {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  minDate?: Date;
  maxDate?: Date;
  dual?: boolean;
  size?: "s" | "m" | "l";
}
declare const DateRangePicker: React.FC<DateRangePickerProps>;
export { DateRangePicker };
//# sourceMappingURL=DateRangePicker.d.ts.map
