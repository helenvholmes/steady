import { addDays, daysBetween, formatDay } from "./dates";

type DatedTask = { done: boolean; startDate: string | null; dueDate: string | null };

/** Open tasks in the order a tasks block shows them: past-date and dated soonest first, then undated. */
export function sortOpen<T extends DatedTask & { order: number }>(tasks: T[]): T[] {
  return tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.order - b.order);
}

/** "Today", "Tomorrow", "Fri, Oct 16", "Oct 16 – Nov 14", or "date passed · Oct 10" (neutral, never a warning). */
export function taskWhen(t: DatedTask, today: string): string {
  if (!t.dueDate) return "";
  const short = (d: string) => formatDay(d, { month: "short", day: "numeric" });
  if (!t.done && t.dueDate < today) return `date passed · ${short(t.dueDate)}`;
  if (t.startDate && t.startDate < t.dueDate) return `${short(t.startDate)} – ${short(t.dueDate)}`;
  const diff = daysBetween(today, t.dueDate);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return formatDay(t.dueDate, { weekday: "short", month: "short", day: "numeric" });
  return short(t.dueDate);
}

export type Repeat = "weekly" | "monthly";

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1–12

/** The day after `day` that a repeating task falls on: a week later, or the next month on `repeatDay`. */
function following(day: string, repeat: Repeat, repeatDay: number): string {
  if (repeat === "weekly") return addDays(day, 7);
  const [y, m] = day.split("-").map(Number);
  const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1];
  const d = Math.min(repeatDay, daysInMonth(ny, nm));
  return `${ny}-${String(nm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * The due date of the next task in a repeating series: the next occurrence after this one's due date, skipping
 * any that are already past, so a task checked off late doesn't create one that's already overdue.
 */
export function nextDueDate(dueDate: string, repeat: Repeat, repeatDay: number | null, today: string): string {
  const anchor = repeatDay ?? Number(dueDate.slice(8, 10));
  let next = following(dueDate, repeat, anchor);
  while (next < today) next = following(next, repeat, anchor);
  return next;
}

/** "Repeats weekly" / "Repeats monthly", for the task list's ↻ mark. */
export const repeatLabel = (repeat: Repeat) => `Repeats ${repeat}`;
