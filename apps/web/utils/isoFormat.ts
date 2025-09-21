export type IsoDateInput = string | number | Date;

function toDate(value: IsoDateInput): Date | null {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWithPrecision(date: Date, includeMilliseconds: boolean): string {
  const iso = date.toISOString();
  if (includeMilliseconds) {
    return iso;
  }
  return iso.replace(/\.\d{3}Z$/, "Z");
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
