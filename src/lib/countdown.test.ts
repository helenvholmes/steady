import { describe, expect, it } from "vitest";
import { DEFAULT_MILESTONE_DAYS, daysLeft, pacePerWeek, reachedMilestones } from "./countdown";

describe("countdown", () => {
  it("counts days to the target date", () => {
    expect(daysLeft("2027-06-30", "2026-10-11")).toBe(262);
    expect(daysLeft("2027-06-30", "2027-07-01")).toBe(0);
  });

  it("lists reached milestones", () => {
    expect(reachedMilestones(DEFAULT_MILESTONE_DAYS, 381)).toEqual([]);
    expect(reachedMilestones(DEFAULT_MILESTONE_DAYS, 365)).toEqual([365]);
    expect(reachedMilestones(DEFAULT_MILESTONE_DAYS, 99)).toEqual([365, 180, 100]);
  });

  it("computes the pace needed", () => {
    expect(pacePerWeek(30, 350)).toBeCloseTo(0.6);
    expect(pacePerWeek(0, 10)).toBe(0);
  });
});

describe("applicable milestones", () => {
  it("drops marks longer than the goal's span", async () => {
    const { applicableMilestones } = await import("./countdown");
    expect(applicableMilestones([365, 180, 100, 30, 7], "2026-10-13", "2027-05-02")).toEqual([180, 100, 30, 7]);
    expect(applicableMilestones([7, 365], "2026-10-13", "2027-12-31")).toEqual([365, 7]);
  });
});
