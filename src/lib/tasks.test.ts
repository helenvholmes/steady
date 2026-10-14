import { describe, expect, it } from "vitest";
import { nextDueDate, sortOpen, taskWhen } from "./tasks";

const t = (dueDate: string | null, extra: Partial<{ done: boolean; startDate: string | null; order: number }> = {}) => ({
  done: false,
  startDate: null,
  order: 0,
  dueDate,
  ...extra,
});

describe("tasks", () => {
  const today = "2026-10-13";

  it("orders open tasks by date, undated last", () => {
    expect(sortOpen([t(null, { order: 1 }), t("2026-11-01"), t("2026-10-01")]).map((x) => x.dueDate)).toEqual([
      "2026-10-01",
      "2026-11-01",
      null,
    ]);
  });

  it("labels dates in neutral words", () => {
    expect(taskWhen(t("2026-10-13"), today)).toBe("Today");
    expect(taskWhen(t("2026-10-14"), today)).toBe("Tomorrow");
    expect(taskWhen(t("2026-10-16"), today)).toBe("Fri, Oct 16");
    expect(taskWhen(t("2026-10-10"), today)).toBe("date passed · Oct 10");
    expect(taskWhen(t("2026-11-14", { startDate: "2026-10-16" }), today)).toBe("Oct 16 – Nov 14");
    expect(taskWhen(t(null), today)).toBe("");
  });
});

describe("repeating tasks", () => {
  it("moves weekly tasks a week on", () => {
    expect(nextDueDate("2026-10-12", "weekly", null, "2026-10-12")).toBe("2026-10-19");
  });

  it("keeps monthly tasks on their day, using the last day of short months", () => {
    expect(nextDueDate("2026-10-15", "monthly", 15, "2026-10-15")).toBe("2026-11-15");
    expect(nextDueDate("2027-01-31", "monthly", 31, "2027-01-31")).toBe("2027-02-28");
    expect(nextDueDate("2027-02-28", "monthly", 31, "2027-02-28")).toBe("2027-03-31");
    expect(nextDueDate("2026-12-01", "monthly", 1, "2026-12-01")).toBe("2027-01-01");
  });

  it("skips occurrences already past when checked off late", () => {
    expect(nextDueDate("2026-09-01", "monthly", 1, "2026-10-14")).toBe("2026-11-01");
    expect(nextDueDate("2026-09-28", "weekly", null, "2026-10-14")).toBe("2026-10-19");
  });
});
