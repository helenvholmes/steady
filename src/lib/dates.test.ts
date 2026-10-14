import { describe, expect, it } from "vitest";
import { addDays, dayStart, daysBetween, formatDayWithOrdinal, localClock, localDateTime, localDay, weekStart } from "./dates";

describe("dates in the configured zone (America/Boise in tests)", () => {
  it("uses the local day, not UTC", () => {
    // 8:30 PM Oct 11 local time is already Oct 12 in UTC.
    expect(localDay(new Date("2026-10-12T02:30:00Z"))).toBe("2026-10-11");
  });

  it("reads local clock time and weekday", () => {
    expect(localClock(new Date("2026-10-12T03:00:00Z"))).toEqual({ minutes: 21 * 60, weekday: 0 });
  });

  it("finds local midnight across daylight saving time", () => {
    expect(dayStart("2026-07-01").toISOString()).toBe("2026-07-01T06:00:00.000Z");
    expect(dayStart("2026-12-01").toISOString()).toBe("2026-12-01T07:00:00.000Z");
    expect(localDateTime("2026-12-01", "21:00").toISOString()).toBe("2026-12-02T04:00:00.000Z");
  });

  it("does calendar-day arithmetic", () => {
    expect(daysBetween("2026-10-11", "2027-06-30")).toBe(262);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekStart("2026-10-11")).toBe("2026-10-05"); // Sunday → previous Monday
    expect(weekStart("2026-10-12")).toBe("2026-10-12");
  });
});

describe("formatDayWithOrdinal", () => {
  it("spells out the weekday and month with an ordinal day", () => {
    expect(formatDayWithOrdinal("2026-10-13")).toBe("Tuesday, October 13th");
    expect(formatDayWithOrdinal("2026-10-01")).toBe("Thursday, October 1st");
    expect(formatDayWithOrdinal("2026-10-22")).toBe("Thursday, October 22nd");
    expect(formatDayWithOrdinal("2026-10-23")).toBe("Friday, October 23rd");
    expect(formatDayWithOrdinal("2026-10-11")).toBe("Sunday, October 11th");
  });
});
