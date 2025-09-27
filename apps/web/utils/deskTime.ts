import { person } from "@/resources";

const DEFAULT_TIME_ZONE = "UTC";
const DEFAULT_SUFFIX = "UTC";
const DEFAULT_LOCALE = "en-US";

export const DESK_TIME_ZONE = person.location ?? DEFAULT_TIME_ZONE;

function deriveTimeZoneName(
  timeZone: string,
  locale: string,
  date: Date,
): string {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(date);
    const timeZoneName = parts.find((part) => part.type === "timeZoneName")
      ?.value;
    if (!timeZoneName) {
      return DEFAULT_SUFFIX;
    }
    if (timeZoneName.startsWith("GMT")) {
      return timeZoneName.replace("GMT", "UTC");
    }
    return timeZoneName;
  } catch {
    return DEFAULT_SUFFIX;
  }
}

export function getDeskTimeSuffix({
  locale = DEFAULT_LOCALE,
  date = new Date(),
}: {
  locale?: string;
  date?: Date;
} = {}): string {
  return deriveTimeZoneName(DESK_TIME_ZONE, locale, date);
}

export function formatWithDeskTimezone(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: DESK_TIME_ZONE,
  }).format(date);
}
