import { daysBetween } from "./dates";
import { formatAmount } from "./format";
import { currentValue, planValueAt, type Entry, type MetricShape } from "./metrics";

/**
 * A goal's progress estimate (REQUIREMENTS.md, "Progress estimate"). Pure: the caller loads the data.
 *
 * Inputs: each metric (how far its current value is from start to target), tasks (share done, counting only
 * tasks that are done or have a date), and, when a goal has neither, time (share of the time from start date
 * to target date). The estimate is a weighted average; weights come from AI or the user, else they're equal.
 */

export type ProgressMetric = MetricShape & {
  id: number;
  name: string;
  checkInFrequency: "daily" | "weekly" | "monthly";
  entries: Entry[];
};
export type ProgressTask = { done: boolean; dueDate: string | null };
export type StoredWeight = { inputKey: string; weight: number; reason: string | null; userSet: boolean };

export type ProgressInput = {
  key: string;
  label: string;
  /** Progress of this input, 0–1. */
  fraction: number;
  /** Where the plan expected this input to be today, 0–1. */
  expected: number;
  detail: string;
  /** Newest data for this input, "YYYY-MM-DD". */
  dataDate: string | null;
  /** The data is older than the metric's check-in period. */
  stale: boolean;
};

export type WeightedInput = ProgressInput & { weight: number; reason: string | null; userSet: boolean };

export type Progress = {
  fraction: number;
  expected: number;
  inputs: WeightedInput[];
  /** "ai": AI weights (possibly with user changes); "equal": no AI weights yet, or AI is off. */
  weighting: "ai" | "equal";
  userAdjusted: boolean;
};

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 31 } as const;

function share(m: MetricShape, value: number) {
  const span = m.targetValue - m.startValue;
  return span === 0 ? 1 : clamp01((value - m.startValue) / span);
}

export function progressInputs(
  goal: { startDate: string; targetDate: string | null },
  metrics: ProgressMetric[],
  tasks: ProgressTask[],
  today: string,
): ProgressInput[] {
  const inputs: ProgressInput[] = metrics.map((m) => {
    const current = currentValue(m, m.entries);
    const dataDate = m.entries.length ? m.entries.reduce((a, e) => (e.day > a ? e.day : a), m.entries[0].day) : null;
    return {
      key: `metric:${m.id}`,
      label: m.name,
      fraction: share(m, current),
      expected: share(m, planValueAt(m, today)),
      detail: `${formatAmount(current, m.unit)} now, from ${formatAmount(m.startValue, m.unit)} toward ${formatAmount(m.targetValue, m.unit)}`,
      dataDate,
      stale: !dataDate || daysBetween(dataDate, today) > PERIOD_DAYS[m.checkInFrequency],
    };
  });

  const countable = tasks.filter((t) => t.done || t.dueDate);
  if (countable.length > 0) {
    const done = countable.filter((t) => t.done).length;
    const dueByNow = countable.filter((t) => (t.dueDate ? t.dueDate <= today : t.done)).length;
    inputs.push({
      key: "tasks",
      label: "Tasks",
      fraction: done / countable.length,
      expected: dueByNow / countable.length,
      detail: `${done} of ${countable.length} dated tasks done`,
      dataDate: null,
      stale: false,
    });
  }

  if (inputs.length === 0 && goal.targetDate) {
    const total = daysBetween(goal.startDate, goal.targetDate);
    const passed = daysBetween(goal.startDate, today);
    const fraction = total > 0 ? clamp01(passed / total) : 1;
    inputs.push({
      key: "time",
      label: "Time",
      fraction,
      expected: fraction,
      detail: `${Math.max(0, Math.min(passed, total))} of ${total} days`,
      dataDate: null,
      stale: false,
    });
  }
  return inputs;
}

/**
 * What the AI weights depend on: which inputs exist and each metric's range. Values aren't included,
 * so weights don't change as progress is made.
 */
export function inputSignature(
  metrics: Pick<ProgressMetric, "id" | "startValue" | "targetValue" | "targetDate">[],
  inputKeys: string[],
) {
  const ranges = [...metrics]
    .sort((a, b) => a.id - b.id)
    .map((m) => `${m.id}:${m.startValue}>${m.targetValue}@${m.targetDate}`);
  return [...[...inputKeys].sort(), ...ranges].join("|");
}

/**
 * Weights for the given inputs, summing to 1. User-set weights are kept as they are; the rest share what's
 * left, in proportion to their AI weights, or equally when any of them has no AI weight.
 */
export function resolveWeights(keys: string[], stored: StoredWeight[]) {
  const byKey = new Map(stored.map((w) => [w.inputKey, w]));
  const userKeys = keys.filter((k) => byKey.get(k)?.userSet);
  const otherKeys = keys.filter((k) => !byKey.get(k)?.userSet);
  const aiComplete = otherKeys.length > 0 && otherKeys.every((k) => byKey.has(k));

  const fixed = Math.min(1, userKeys.reduce((s, k) => s + Math.max(0, byKey.get(k)!.weight), 0));
  const base = new Map(otherKeys.map((k) => [k, aiComplete ? Math.max(0, byKey.get(k)!.weight) : 1]));
  const baseSum = [...base.values()].reduce((a, b) => a + b, 0);

  const weights = new Map<string, number>();
  if (otherKeys.length === 0) {
    // Only user-set weights: scale them to sum to 1.
    for (const k of userKeys) weights.set(k, fixed > 0 ? byKey.get(k)!.weight / fixed : 1 / userKeys.length);
  } else {
    for (const k of userKeys) weights.set(k, byKey.get(k)!.weight);
    const left = 1 - fixed;
    for (const k of otherKeys) weights.set(k, baseSum > 0 ? (base.get(k)! / baseSum) * left : left / otherKeys.length);
  }
  return {
    weights,
    weighting: (aiComplete || (otherKeys.length === 0 && userKeys.length > 0) ? "ai" : "equal") as Progress["weighting"],
    userAdjusted: userKeys.length > 0,
  };
}

export function computeProgress(inputs: ProgressInput[], stored: StoredWeight[]): Progress {
  const { weights, weighting, userAdjusted } = resolveWeights(
    inputs.map((i) => i.key),
    stored,
  );
  const byKey = new Map(stored.map((w) => [w.inputKey, w]));
  const weighted = inputs.map((i) => ({
    ...i,
    weight: weights.get(i.key) ?? 0,
    reason: weighting === "ai" || byKey.get(i.key)?.userSet ? (byKey.get(i.key)?.reason ?? null) : null,
    userSet: byKey.get(i.key)?.userSet ?? false,
  }));
  return {
    fraction: clamp01(weighted.reduce((s, i) => s + i.weight * i.fraction, 0)),
    expected: clamp01(weighted.reduce((s, i) => s + i.weight * i.expected, 0)),
    inputs: weighted,
    weighting: inputs.length ? weighting : "equal",
    userAdjusted,
  };
}

const pctOf = (n: number) => `${Math.round(n * 100)}%`;
const listOf = (items: string[]) =>
  items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;

/**
 * The tooltip's one or two sentences on how the bar is calculated. AI's summary when the weights are AI's own;
 * otherwise a plain sentence from the weights. A note is added when some data is older than its check-in period.
 */
export function explainProgress(progress: Progress, aiSummary: string | null): string {
  const { inputs } = progress;
  if (inputs.length === 0) return "Add a metric, tasks with dates, or a target date to estimate progress.";
  let text: string;
  if (inputs.length === 1) {
    const [only] = inputs;
    text =
      only.key === "time"
        ? "Based on how much time has passed toward the target date."
        : only.key === "tasks"
          ? "Based on the share of dated tasks you've done."
          : `Based on ${only.label} alone.`;
  } else if (progress.weighting === "ai" && !progress.userAdjusted && aiSummary) {
    text = aiSummary;
  } else if (progress.weighting === "equal" && !progress.userAdjusted) {
    text = `${listOf(inputs.map((i) => i.label))} each count equally.`;
  } else {
    const [top, ...rest] = [...inputs].sort((a, b) => b.weight - a.weight);
    text = `${top.label} counts most (${pctOf(top.weight)}), then ${listOf(rest.map((i) => `${i.label} (${pctOf(i.weight)})`))}.`;
  }
  return inputs.some((i) => i.stale) ? `${text} Some data is older than its check-in period.` : text;
}
