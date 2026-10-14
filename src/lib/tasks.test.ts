import { describe, expect, it } from "vitest";
import { sortOpen, taskWhen } from "./tasks";

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
