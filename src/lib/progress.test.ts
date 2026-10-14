import { describe, expect, it } from "vitest";
import { computeProgress, explainProgress, inputSignature, progressInputs, resolveWeights, type ProgressMetric } from "./progress";

const car: ProgressMetric = {
  id: 1,
  name: "Pay off loan",
  kind: "value",
  unit: "USD",
  startValue: 36000,
  targetValue: 0,
  startDate: "2026-10-01",
  targetDate: "2027-10-01",
  direction: "down",
  milestoneStepPct: 10,
  checkInFrequency: "monthly",
  entries: [{ day: "2026-10-01", value: 36000 }],
};
const fund: ProgressMetric = {
  ...car,
  id: 2,
  name: "Savings",
  startValue: 0,
  targetValue: 10000,
  direction: "up",
  entries: [{ day: "2026-10-10", value: 9800 }],
};
const goal = { startDate: "2026-10-01", targetDate: "2027-10-01" };

describe("progress inputs", () => {
  it("measures metrics from start toward target, in either direction", () => {
    const [c, f] = progressInputs(goal, [{ ...car, entries: [{ day: "2026-10-05", value: 27000 }] }, fund], [], "2026-10-10");
    expect(c.fraction).toBeCloseTo(0.25);
    expect(f.fraction).toBeCloseTo(0.98);
    expect(f.detail).toBe("$9,800 now, from $0 toward $10,000");
    expect(c.expected).toBeGreaterThan(0);
  });

  it("counts only tasks that are done or dated", () => {
    const inputs = progressInputs(
      goal,
      [],
      [
        { done: true, dueDate: null },
        { done: false, dueDate: "2026-10-05" },
        { done: false, dueDate: "2026-12-01" },
        { done: false, dueDate: null },
      ],
      "2026-10-10",
    );
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({ key: "tasks", fraction: 1 / 3, expected: 2 / 3 });
  });

  it("falls back to time for a goal with only a target date", () => {
    const [t] = progressInputs(goal, [], [{ done: false, dueDate: null }], "2027-04-01");
    expect(t.key).toBe("time");
    expect(t.fraction).toBeCloseTo(182 / 365, 2);
    expect(progressInputs({ ...goal, targetDate: null }, [], [], "2027-04-01")).toEqual([]);
  });

  it("marks data older than the check-in period", () => {
    const [f] = progressInputs(goal, [fund], [], "2026-12-01");
    expect(f.stale).toBe(true);
    expect(progressInputs(goal, [fund], [], "2026-10-20")[0].stale).toBe(false);
  });
});

describe("weights", () => {
  const keys = ["metric:1", "metric:2", "tasks"];

  it("is equal without AI weights", () => {
    const r = resolveWeights(keys, []);
    expect(r.weighting).toBe("equal");
    expect([...r.weights.values()].every((w) => Math.abs(w - 1 / 3) < 1e-9)).toBe(true);
  });

  it("uses AI weights, normalized", () => {
    const r = resolveWeights(keys, [
      { inputKey: "metric:1", weight: 5, reason: "big", userSet: false },
      { inputKey: "metric:2", weight: 2, reason: null, userSet: false },
      { inputKey: "tasks", weight: 3, reason: null, userSet: false },
    ]);
    expect(r.weighting).toBe("ai");
    expect(r.weights.get("metric:1")).toBeCloseTo(0.5);
  });

  it("keeps a user-set weight and rescales the rest around it", () => {
    const r = resolveWeights(keys, [
      { inputKey: "metric:1", weight: 0.6, reason: null, userSet: true },
      { inputKey: "metric:2", weight: 1, reason: null, userSet: false },
      { inputKey: "tasks", weight: 1, reason: null, userSet: false },
    ]);
    expect(r.weights.get("metric:1")).toBeCloseTo(0.6);
    expect(r.weights.get("metric:2")).toBeCloseTo(0.2);
    expect(r.weights.get("tasks")).toBeCloseTo(0.2);
    expect(r.userAdjusted).toBe(true);
  });

  it("goes back to equal for the rest when a new input has no AI weight yet", () => {
    const r = resolveWeights(keys, [{ inputKey: "metric:1", weight: 5, reason: null, userSet: false }]);
    expect(r.weighting).toBe("equal");
  });
});

describe("computeProgress", () => {
  it("combines inputs by weight", () => {
    const inputs = progressInputs(goal, [car, fund], [], "2026-10-10");
    const equal = computeProgress(inputs, []);
    expect(equal.fraction).toBeCloseTo((0 + 0.98) / 2);
    const weighted = computeProgress(inputs, [
      { inputKey: "metric:1", weight: 0.8, reason: "largest", userSet: false },
      { inputKey: "metric:2", weight: 0.2, reason: "nearly done", userSet: false },
    ]);
    expect(weighted.fraction).toBeCloseTo(0.196);
    expect(weighted.inputs[0].reason).toBe("largest");
  });

  it("has a stable signature that ignores values", () => {
    const a = inputSignature([car, fund], ["metric:1", "metric:2"]);
    const b = inputSignature([fund, { ...car, entries: [] }], ["metric:2", "metric:1"]);
    expect(a).toBe(b);
    expect(inputSignature([{ ...car, targetValue: 1000 }, fund], ["metric:1", "metric:2"])).not.toBe(a);
  });
});

describe("explainProgress", () => {
  const inputs = progressInputs(goal, [car, fund], [], "2026-10-10");
  const ai = [
    { inputKey: "metric:1", weight: 0.8, reason: null, userSet: false },
    { inputKey: "metric:2", weight: 0.2, reason: null, userSet: false },
  ];

  it("uses AI's summary for AI weights", () => {
    expect(explainProgress(computeProgress(inputs, ai), "The loan counts most.")).toBe("The loan counts most.");
  });

  it("describes the weights itself without a summary, or once the user changed one", () => {
    expect(explainProgress(computeProgress(inputs, ai), null)).toBe("Pay off loan counts most (80%), then Savings (20%).");
    const adjusted = computeProgress(inputs, [{ ...ai[0], userSet: true }, ai[1]]);
    expect(explainProgress(adjusted, "The loan counts most.")).toBe("Pay off loan counts most (80%), then Savings (20%).");
    expect(explainProgress(computeProgress(inputs, []), null)).toBe("Pay off loan and Savings each count equally.");
  });

  it("covers a single input, no inputs, and stale data", () => {
    const time = computeProgress(progressInputs(goal, [], [], "2027-04-01"), []);
    expect(explainProgress(time, null)).toBe("Based on how much time has passed toward the target date.");
    expect(explainProgress(computeProgress([], []), null)).toMatch(/^Add a metric/);
    const stale = computeProgress(progressInputs(goal, [fund], [], "2026-12-01"), []);
    expect(explainProgress(stale, null)).toBe("Based on Savings alone. Some data is older than its check-in period.");
  });
});
