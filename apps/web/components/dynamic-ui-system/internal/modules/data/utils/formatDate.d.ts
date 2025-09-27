import { DateConfig } from "../interfaces";
/**
 * Formats a value as a date if it's a valid date and a format is provided
 * Otherwise returns the original value or label if available
 *
 * @param value - The value to format (could be a date, string, or any other value)
 * @param dateConfig - Optional date configuration with format string
 * @param dataPoint - Optional data point object that might contain a label property
 * @returns Formatted date string or original value
 */
export declare function formatDate(
  value: any,
  dateConfig?: DateConfig,
  dataPoint?: Record<string, any>,
): string;
//# sourceMappingURL=formatDate.d.ts.map
