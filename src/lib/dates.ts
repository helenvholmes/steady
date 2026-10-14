import { TZDate } from "@date-fns/tz";

/**
 * All "today", "this week", and notification times are in the user's time zone: an IANA name such as
 * "America/New_York", set with STEADY_TIME_ZONE. UTC if it's unset or not a valid zone.
 */
export const TZ = validZone(process.env.STEADY_TIME_ZONE) ?? "UTC";

function validZone(zone: string | undefined) {
  if (!zone) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return undefined;
  }
}

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "YYYY-MM-DD" for the instant, in the user's time zone. */
export function localDay(at: Date = new Date()): string {
  return dayFmt.format(at);
}

/** Minutes since local midnight and weekday (0 = Sunday) for the instant. */
export function localClock(at: Date = new Date()): { minutes: number; weekday: number } {
  const parts = Object.fromEntries(partsFmt.formatToParts(at).map((p) => [p.type, p.value]));
  return { minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: WEEKDAYS.indexOf(parts.weekday) };
}

function toUtcDate(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(day: string, n: number): string {
  return new Date(toUtcDate(day) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Whole calendar days from a to b (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtcDate(b) - toUtcDate(a)) / 86_400_000);
}

export function weekdayOf(day: string): number {
  return new Date(toUtcDate(day)).getUTCDay();
}

/** Monday of the week containing the day. */
export function weekStart(day: string): string {
  return addDays(day, -((weekdayOf(day) + 6) % 7));
}

/** The instant of local midnight at the start of the day. */
export function dayStart(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(new TZDate(y, m - 1, d, TZ).getTime());
}

/** The instant for a local day and "HH:MM". */
export function localDateTime(day: string, time: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, TZ).getTime());
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(toUtcDate(day)));
}

export function formatTime(at: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(at);
}

/** "HH:MM" local time for an instant, for <input type="time">. */
export function inputTime(at: Date) {
  const { minutes } = localClock(at);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** "Tuesday, October 13th". */
export function formatDayWithOrdinal(day: string) {
  const n = Number(day.slice(8, 10));
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${formatDay(day, { weekday: "long" })}, ${formatDay(day, { month: "long" })} ${n}${suffix}`;
}
