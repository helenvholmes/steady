import { describe, expect, it } from "vitest";
import { inQuietHours, planNotifications, type PlanInput } from "./notify-plan";

const settings: PlanInput["settings"] = {
  taskDueTime: "08:00",
  quietStart: "22:00",
  quietEnd: "07:00",
  notify: { tasksDue: true, taskReminder: true, countdownMilestone: true },
};
// Monday Oct 12 2026; the test zone is UTC-6 in October.
const at = (hhmm: string) => new Date(`2026-10-12T${hhmm}:00-06:00`);
const base: Omit<PlanInput, "now"> = {
  settings,
  sentKeys: new Set<string>(),
  sentToday: 0,
  tasksDueToday: 2,
  remindersForTomorrow: 0,
  countdownMilestones: [],
};

describe("notification planner", () => {
  it("sends the tasks-due count at its time, once", () => {
    expect(planNotifications({ ...base, now: at("07:55") })).toEqual([]);
    const [n] = planNotifications({ ...base, now: at("08:05") });
    expect(n).toMatchObject({ key: "tasksDue:2026-10-12", body: "2 tasks are due today.", url: "/" });
    expect(planNotifications({ ...base, tasksDueGoalId: 7, now: at("08:05") })[0].url).toBe("/goals/7");
    expect(planNotifications({ ...base, now: at("08:10"), sentKeys: new Set(["tasksDue:2026-10-12"]) })).toEqual([]);
  });

  it("sends nothing when no tasks are due", () => {
    expect(planNotifications({ ...base, tasksDueToday: 0, now: at("08:05") })).toEqual([]);
  });

  it("does not send late beyond the window or in quiet hours", () => {
    expect(planNotifications({ ...base, now: at("09:45") })).toEqual([]);
    expect(planNotifications({ ...base, settings: { ...settings, taskDueTime: "06:30" }, now: at("06:35") })).toEqual([]);
  });

  it("sends day-before reminders with a count only", () => {
    const due = planNotifications({ ...base, tasksDueToday: 0, remindersForTomorrow: 1, now: at("08:00") });
    expect(due.map((n) => n.body)).toEqual(["1 task is due tomorrow."]);
  });

  it("respects switches and the daily cap, in priority order", () => {
    const busy = { ...base, remindersForTomorrow: 1, countdownMilestones: [{ goalId: 1, mark: 365 }] };
    const all = planNotifications({ ...busy, now: at("09:00") });
    expect(all.map((n) => n.type)).toEqual(["tasksDue", "taskReminder", "countdownMilestone"]);
    expect(planNotifications({ ...busy, sentToday: 4, now: at("09:00") }).map((n) => n.type)).toEqual(["tasksDue"]);
    const off = { ...settings, notify: { ...settings.notify, tasksDue: false } };
    expect(planNotifications({ ...busy, settings: off, now: at("09:00") }).map((n) => n.type)).toEqual([
      "taskReminder",
      "countdownMilestone",
    ]);
  });

  it("keeps goal names out of countdown copy", () => {
    const [n] = planNotifications({ ...base, tasksDueToday: 0, countdownMilestones: [{ goalId: 3, mark: 100 }], now: at("10:00") });
    expect(n).toMatchObject({ body: "100 days left on one of your goals.", url: "/goals/3" });
  });

  it("handles quiet hours that cross midnight", () => {
    expect(inQuietHours(23 * 60, "22:00", "07:00")).toBe(true);
    expect(inQuietHours(6 * 60, "22:00", "07:00")).toBe(true);
    expect(inQuietHours(7 * 60, "22:00", "07:00")).toBe(false);
    expect(inQuietHours(13 * 60, "12:00", "14:00")).toBe(true);
  });
});
