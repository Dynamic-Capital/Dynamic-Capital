import { formatIsoDate } from "@/utils/isoFormat";

const MINUTE_IN_MS = 60_000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const WEEK_IN_MS = 7 * DAY_IN_MS;
const MONTH_IN_MS = 30 * DAY_IN_MS;
const YEAR_IN_MS = 365 * DAY_IN_MS;

const RELATIVE_UNITS = [
  { divisor: YEAR_IN_MS, suffix: "y" },
  { divisor: MONTH_IN_MS, suffix: "mo" },
  { divisor: WEEK_IN_MS, suffix: "w" },
  { divisor: DAY_IN_MS, suffix: "d" },
  { divisor: HOUR_IN_MS, suffix: "h" },
  { divisor: MINUTE_IN_MS, suffix: "m" },
] as const;

function normaliseDateInput(rawDate: string): string {
  if (rawDate.includes("T")) {
    return rawDate;
  }
  return `${rawDate}T00:00:00`;
}

function buildRelativeLabel(currentDate: Date, targetDate: Date): string {
  const diffMs = targetDate.getTime() - currentDate.getTime();
  const direction = diffMs >= 0 ? 1 : -1;
  const absMs = Math.abs(diffMs);

  if (absMs < MINUTE_IN_MS) {
    return direction >= 0 ? "in moments" : "just now";
  }

  for (const { divisor, suffix } of RELATIVE_UNITS) {
    if (absMs >= divisor) {
      const amount = Math.floor(absMs / divisor);
      if (amount >= 1) {
        return direction >= 0
          ? `in ${amount}${suffix}`
          : `${amount}${suffix} ago`;
      }
    }
  }

  return direction >= 0 ? "in moments" : "just now";
}

export function formatDate(
  date: string,
  includeRelative = false,
  referenceDate: Date = new Date(),
) {
  const currentDate = new Date(referenceDate.getTime());
  const targetDate = new Date(normaliseDateInput(date));

  if (Number.isNaN(targetDate.getTime())) {
    return "Invalid Date";
  }

  const fullDate = formatIsoDate(targetDate);

  if (!includeRelative) {
    return fullDate;
  }

  const relativeLabel = buildRelativeLabel(currentDate, targetDate);

  return `${fullDate} (${relativeLabel})`;
}
