import { addDays, daysBetween } from "./dates";
import { isWeightUnit, maxSafeLossPerWeek, weightNoise } from "./units";

/** Pure metric math. No database access, so it can be tested and reused on any screen. */

export type MetricShape = {
  kind: "value" | "count";
  unit: string;
  startValue: number;
  targetValue: number;
  startDate: string;
  targetDate: string;
  direction: "up" | "down";
  milestoneStepPct: number;
};
export type Entry = { day: string; value: number };
export type Status = "ahead" | "on plan" | "behind";

export function isWeightMetric(g: Pick<MetricShape, "unit">) {
  return isWeightUnit(g.unit);
}

/** The straight plan line from start to target, clamped to the goal's dates. */
export function planValueAt(g: MetricShape, day: string): number {
  const total = daysBetween(g.startDate, g.targetDate);
  if (total <= 0) return g.targetValue;
  const t = Math.min(1, Math.max(0, daysBetween(g.startDate, day) / total));
  return g.startValue + (g.targetValue - g.startValue) * t;
}

/** Entries sorted by day. Count goals become a running total from the start value; value goals stay readings. */
export function progressSeries(g: MetricShape, entries: Entry[]): Entry[] {
  const sorted = [...entries].sort((a, b) => a.day.localeCompare(b.day));
  if (g.kind === "value") return sorted;
  let total = g.startValue;
  const byDay = new Map<string, number>();
  for (const e of sorted) {
    total += e.value;
    byDay.set(e.day, total);
  }
  return [...byDay].map(([day, value]) => ({ day, value }));
}

/** Average of each 7-day window ending on a reading day. Used for weight, where daily values vary. */
export function weeklyAverages(series: Entry[]): Entry[] {
  return series.map((e) => {
    const from = addDays(e.day, -6);
    const window = series.filter((x) => x.day >= from && x.day <= e.day);
    return { day: e.day, value: window.reduce((s, x) => s + x.value, 0) / window.length };
  });
}

/** The value status is judged on: latest reading (weight: latest 7-day average); start value if no entries. */
export function currentValue(g: MetricShape, entries: Entry[]): number {
  const series = progressSeries(g, entries);
  if (series.length === 0) return g.startValue;
  const smoothed = isWeightMetric(g) && g.kind === "value" ? weeklyAverages(series) : series;
  return smoothed[smoothed.length - 1].value;
}

/**
 * Ahead, on plan, or behind the plan line today. Within 2% of the total change counts as on plan
 * (for weight, at least 0.5 lb or 0.25 kg), so day-to-day noise doesn't flip the status.
 */
export function metricStatus(g: MetricShape, entries: Entry[], today: string): Status {
  const current = currentValue(g, entries);
  const plan = planValueAt(g, today);
  const span = Math.abs(g.targetValue - g.startValue);
  const tolerance = Math.max(span * 0.02, isWeightMetric(g) ? weightNoise(g.unit) : 0);
  const diff = (current - plan) * (g.direction === "up" ? 1 : -1);
  if (Math.abs(diff) <= tolerance) return "on plan";
  return diff > 0 ? "ahead" : "behind";
}

/** Change per week needed from today's value to reach the target on time. null once the date has passed. */
export function neededPerWeek(g: MetricShape, entries: Entry[], today: string): number | null {
  const days = daysBetween(today, g.targetDate);
  if (days <= 0) return null;
  return (g.targetValue - currentValue(g, entries)) / (days / 7);
}

export function isReached(g: MetricShape, value: number) {
  return g.direction === "up" ? value >= g.targetValue : value <= g.targetValue;
}

/**
 * Weight-loss plans faster than 2 lb (0.9 kg) a week are blocked. Returns the earliest safe target date,
 * or null when the plan is fine (or isn't a weight-loss plan).
 */
export function unsafeWeightPlan(
  g: Pick<MetricShape, "unit" | "direction" | "startValue" | "targetValue" | "startDate" | "targetDate">,
): { perWeek: number; earliestDate: string } | null {
  if (!isWeightMetric(g) || g.direction !== "down") return null;
  const loss = g.startValue - g.targetValue;
  if (loss <= 0) return null;
  const days = daysBetween(g.startDate, g.targetDate);
  const perWeek = days > 0 ? loss / (days / 7) : Infinity;
  const max = maxSafeLossPerWeek(g.unit);
  if (perWeek <= max) return null;
  return { perWeek, earliestDate: addDays(g.startDate, Math.ceil((loss / max) * 7)) };
}

/** Milestone values every stepPct of the way from start to target, excluding the start, including the target. */
export function milestoneValues(g: MetricShape): number[] {
  if (g.milestoneStepPct <= 0 || g.milestoneStepPct > 100) return [];
  const out: number[] = [];
  for (let pct = g.milestoneStepPct; pct < 100 - 1e-9; pct += g.milestoneStepPct) {
    out.push(round(g.startValue + ((g.targetValue - g.startValue) * pct) / 100));
  }
  // The last milestone is the target itself, unrounded, so it reads the same as the target everywhere.
  out.push(g.targetValue);
  return out;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
