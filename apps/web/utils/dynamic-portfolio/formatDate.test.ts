import { beforeEach, describe, expect, it, vi } from "vitest";

const formatIsoDateMock = vi.fn((value: Date) => {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
});

vi.mock("@/utils/isoFormat", () => ({
  formatIsoDate: formatIsoDateMock,
}));

import { formatDate } from "./formatDate";

const REFERENCE_DATE = new Date("2024-03-10T12:00:00Z");

describe("formatDate", () => {
  beforeEach(() => {
    formatIsoDateMock.mockClear();
  });

  it("returns the ISO formatted date when relative label is disabled", () => {
    expect(formatDate("2024-03-05", false, REFERENCE_DATE)).toBe("2024-03-05");
    expect(formatIsoDateMock).toHaveBeenCalledTimes(1);
  });

  it("includes a past relative label when requested", () => {
    expect(formatDate("2024-03-05", true, REFERENCE_DATE)).toBe(
      "2024-03-05 (5d ago)",
    );
  });

  it("includes a future relative label when the date is ahead of the reference", () => {
    expect(formatDate("2024-03-13", true, REFERENCE_DATE)).toBe(
      "2024-03-13 (in 2d)",
    );
  });

  it("falls back to a human-friendly label for near-future timestamps", () => {
    expect(formatDate("2024-03-10T12:00:20Z", true, REFERENCE_DATE)).toBe(
      "2024-03-10 (in moments)",
    );
  });

  it("returns an invalid date marker when parsing fails", () => {
    expect(formatDate("not-a-real-date", true, REFERENCE_DATE)).toBe(
      "Invalid Date",
    );
    expect(formatIsoDateMock).not.toHaveBeenCalled();
  });
});
