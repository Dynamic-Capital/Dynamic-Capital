import { DESK_TIME_ZONE, getDeskTimeSuffix } from "@/utils/deskTime";

export type IsoDateInput = string | number | Date;

const LOCALE = "en-GB";

function toDate(value: IsoDateInput): Date | null {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWithPrecision(date: Date, includeMilliseconds: boolean): string {
  const formatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone: DESK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }

  const year = lookup.year ?? "0000";
  const month = lookup.month ?? "00";
  const day = lookup.day ?? "00";
  const hour = lookup.hour ?? "00";
  const minute = lookup.minute ?? "00";
  const second = lookup.second ?? "00";
  const milliseconds = includeMilliseconds
    ? `.${String(date.getMilliseconds()).padStart(3, "0")}`
    : "";

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${milliseconds} (${
    getDeskTimeSuffix({ locale: LOCALE, date })
  })`;
}

export function formatIsoDateTime(
  value: IsoDateInput,
  { includeMilliseconds = false }: { includeMilliseconds?: boolean } = {},
): string {
  const date = toDate(value);
  if (!date) {
    return "Invalid Date";
  }
  return formatWithPrecision(date, includeMilliseconds);
}

export function formatIsoDate(value: IsoDateInput): string {
  const isoDateTime = formatIsoDateTime(value);
  if (isoDateTime === "Invalid Date") {
    return isoDateTime;
  }
  return isoDateTime.split("T")[0];
}

export function formatIsoTime(
  value: IsoDateInput,
  { includeMilliseconds = false }: { includeMilliseconds?: boolean } = {},
): string {
  const isoDateTime = formatIsoDateTime(value, { includeMilliseconds });
  if (isoDateTime === "Invalid Date") {
    return isoDateTime;
  }
  return isoDateTime.split("T")[1];
}
