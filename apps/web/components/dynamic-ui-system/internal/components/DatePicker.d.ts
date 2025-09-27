import React from "react";
import { Flex } from ".";
export interface DatePickerProps
  extends Omit<React.ComponentProps<typeof Flex>, "onChange"> {
  value?: Date;
  onChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  previousMonth?: boolean;
  nextMonth?: boolean;
  timePicker?: boolean;
  defaultDate?: Date;
  defaultTime?: {
    hours: number;
    minutes: number;
  };
  size?: "s" | "m" | "l";
  isNested?: boolean;
  className?: string;
  style?: React.CSSProperties;
  currentMonth?: number;
  currentYear?: number;
  onMonthChange?: (increment: number) => void;
  range?: {
    startDate?: Date;
    endDate?: Date;
  };
  onHover?: (date: Date | null) => void;
  autoFocus?: boolean;
  isOpen?: boolean;
}
declare const DatePicker: React.ForwardRefExoticComponent<
  Omit<DatePickerProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { DatePicker };
//# sourceMappingURL=DatePicker.d.ts.map
