import { describe, expect, it } from "vitest";
import {
  currentValue,
  metricStatus,
  milestoneValues,
  neededPerWeek,
  planValueAt,
  progressSeries,
  unsafeWeightPlan,
  type MetricShape,
} from "./metrics";

const savings: MetricShape = {
  kind: "value",
  unit: "USD",
  startValue: 0,
  targetValue: 10000,
  startDate: "2026-01-01",
  targetDate: "2027-01-01",
  direction: "up",
  milestoneStepPct: 10,
};

const weight: MetricShape = {
  kind: "value",
  unit: "lb",
  startValue: 200,
  targetValue: 180,
  startDate: "2026-10-01",
  targetDate: "2027-02-18", // 20 weeks → 1 lb/week
  direction: "down",
  milestoneStepPct: 25,
};

describe("plan line", () => {
  it("runs straight from start to target and clamps", () => {
    expect(planValueAt(savings, "2026-01-01")).toBe(0);
    expect(planValueAt(savings, "2027-01-01")).toBe(10000);
    expect(planValueAt(savings, "2028-01-01")).toBe(10000);
    expect(planValueAt(savings, "2025-06-01")).toBe(0);
    expect(planValueAt(weight, "2026-12-10")).toBeCloseTo(190, 0);
  });
});

describe("status", () => {
  const mid = "2026-07-02"; // ~half way: plan ≈ 5000
  it("is ahead, on plan, or behind relative to direction", () => {
    expect(metricStatus(savings, [{ day: mid, value: 7000 }], mid)).toBe("ahead");
    expect(metricStatus(savings, [{ day: mid, value: 5050 }], mid)).toBe("on plan");
    expect(metricStatus(savings, [{ day: mid, value: 3000 }], mid)).toBe("behind");
  });

  it("uses the weekly average for weight, so one heavy day doesn't flip it", () => {
    const entries = [
      { day: "2026-10-20", value: 197 },
      { day: "2026-10-21", value: 197 },
      { day: "2026-10-22", value: 201 },
    ];
    expect(currentValue(weight, entries)).toBeCloseTo(198.33, 1);
    // Plan on Oct 22 = 200 - 3 = 197. Average 198.3 is 1.3 lb behind.
    expect(metricStatus(weight, entries, "2026-10-22")).toBe("behind");
  });

  it("shows the new rate needed instead of a penalty", () => {
    const rate = neededPerWeek(savings, [{ day: "2026-07-02", value: 3000 }], "2026-07-02");
    expect(rate).toBeCloseTo(7000 / (183 / 7), 5);
    expect(neededPerWeek(savings, [], "2027-02-01")).toBeNull();
  });
});

describe("count goals", () => {
  it("adds entries to a running total", () => {
    const books: MetricShape = { ...savings, kind: "count", unit: "books", startValue: 0, targetValue: 24 };
    const entries = [
      { day: "2026-02-01", value: 1 },
      { day: "2026-01-10", value: 1 },
      { day: "2026-02-01", value: 1 },
    ];
    expect(progressSeries(books, entries)).toEqual([
      { day: "2026-01-10", value: 1 },
      { day: "2026-02-01", value: 3 },
    ]);
    expect(currentValue(books, entries)).toBe(3);
  });
});

describe("safe weight targets", () => {
  it("allows up to 2 lb per week", () => {
    expect(unsafeWeightPlan(weight)).toBeNull();
    expect(unsafeWeightPlan({ ...weight, targetDate: "2026-12-10" })).toBeNull(); // 20 lb in 10 weeks = exactly 2
  });

  it("blocks faster plans and suggests the earliest safe date", () => {
    const fast = { ...weight, targetDate: "2026-11-01" }; // 20 lb in ~4.4 weeks
    const result = unsafeWeightPlan(fast);
    expect(result?.perWeek).toBeGreaterThan(2);
    expect(result?.earliestDate).toBe("2026-12-10"); // 10 weeks after start
    expect(unsafeWeightPlan({ ...fast, targetDate: result!.earliestDate })).toBeNull();
  });

  it("ignores gain goals and non-weight units", () => {
    expect(unsafeWeightPlan({ ...weight, direction: "up", targetValue: 220, targetDate: "2026-10-08" })).toBeNull();
    expect(unsafeWeightPlan({ ...weight, unit: "places", targetDate: "2026-10-08" })).toBeNull();
  });
});

describe("milestones", () => {
  it("steps from start to target", () => {
    expect(milestoneValues(weight)).toEqual([195, 190, 185, 180]);
    expect(milestoneValues({ ...savings, milestoneStepPct: 30 })).toEqual([3000, 6000, 9000, 10000]);
    expect(milestoneValues({ ...savings, milestoneStepPct: 0 })).toEqual([]);
  });
});
