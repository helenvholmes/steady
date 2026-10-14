import { daysBetween, formatDay } from "./dates";

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
