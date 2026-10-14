import { daysBetween } from "./dates";

/** `day` plus whole months, with the day clamped to the month's length (Jan 31 + 1 month = Feb 28). */
function addMonths(day: string, months: number) {
  const [y, m, d] = day.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
}

/** "1 year, 2 months, 4 days" between two "YYYY-MM-DD" days, counting calendar months. */
export function durationText(from: string, to: string): string {
  if (to <= from) return "0 days";
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1);
  while (months > 0 && addMonths(from, months) > to) months--;
  const days = daysBetween(addMonths(from, months), to);
  const years = Math.floor(months / 12);
  const parts = [
    [years, "year"],
    [months % 12, "month"],
    [days, "day"],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, w]) => `${n} ${w}${n === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "0 days";
}
