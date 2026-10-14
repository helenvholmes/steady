import { localClock, localDay, timeToMinutes } from "./dates";

/**
 * Decides which notifications are due on one scheduler tick. Pure: the caller passes in what was already
 * sent and today's counts, and sends what this returns.
 *
 * Rules (REQUIREMENTS.md, "Notifications"):
 * - At most 5 a day. Priority: morning digest, task reminders, countdown milestones. (Reminders, money reminders,
 *   and check-ins arrive in later phases.)
 * - Nothing during quiet hours.
 * - Each type has its own on/off switch.
 * - Each fires once per occurrence. A missed time (server down, quiet hours) is sent late only within
 *   LATE_WINDOW_MIN, then skipped for that day, so a stale reminder never arrives hours later.
 * - Copy carries counts and times only: no task titles, amounts, notes, or goal names.
 */

export const MAX_PER_DAY = 5;
export const LATE_WINDOW_MIN = 90;

const PRIORITY = { morningDigest: 1, taskReminder: 2, countdownMilestone: 3 } as const;
export type NotificationType = keyof typeof PRIORITY;

export type Planned = { key: string; type: NotificationType; title: string; body: string; url: string };

export type PlanInput = {
  now: Date;
  settings: {
    taskDueTime: string;
    quietStart: string;
    quietEnd: string;
    notify: Record<NotificationType, boolean>;
  };
  /** Keys already in the notification log. */
  sentKeys: Set<string>;
  sentToday: number;
  /** Open tasks due today, on active goals. */
  tasksDueToday: number;
  /** Future goals whose start-by date is today. */
  futureGoalsReady: number;
  /** Open tasks due tomorrow that asked for a reminder the day before. */
  remindersForTomorrow: number;
  /** When everything in the digest is on one goal, tapping the notification opens that goal; otherwise home. */
  digestGoalId?: number | null;
  /** Likewise for the day-before reminders. */
  remindersGoalId?: number | null;
  /** Countdown milestones reached today or yesterday (a missed tick), e.g. [{ goalId: 1, mark: 365 }]. */
  countdownMilestones: { goalId: number; mark: number }[];
};

export function inQuietHours(minutes: number, quietStart: string, quietEnd: string) {
  const start = timeToMinutes(quietStart);
  const end = timeToMinutes(quietEnd);
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function dueAt(minutes: number, time: string) {
  const at = timeToMinutes(time);
  return minutes >= at && minutes < at + LATE_WINDOW_MIN;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The morning digest's one line, or null when there's nothing to say. "2 tasks are due today.",
 * "1 future goal is ready to start.", or both: "3 tasks due today · 1 future goal ready to start".
 */
export function digestBody(tasks: number, futureGoals: number): string | null {
  if (tasks > 0 && futureGoals > 0) {
    return `${plural(tasks, "task", "tasks")} due today · ${plural(futureGoals, "future goal", "future goals")} ready to start`;
  }
  if (tasks > 0) return `${plural(tasks, "task is", "tasks are")} due today.`;
  if (futureGoals > 0) return `${plural(futureGoals, "future goal is", "future goals are")} ready to start.`;
  return null;
}

export function planNotifications(input: PlanInput): Planned[] {
  const { now, settings, sentKeys, sentToday } = input;
  const { minutes } = localClock(now);
  if (inQuietHours(minutes, settings.quietStart, settings.quietEnd)) return [];
  const today = localDay(now);
  const due: Planned[] = [];
  const atTaskTime = dueAt(minutes, settings.taskDueTime);

  const digest = digestBody(input.tasksDueToday, input.futureGoalsReady);
  if (settings.notify.morningDigest && atTaskTime && digest) {
    due.push({
      key: `morningDigest:${today}`,
      type: "morningDigest",
      title: "Steady",
      body: digest,
      url: input.digestGoalId ? `/goals/${input.digestGoalId}` : "/",
    });
  }
  if (settings.notify.taskReminder && atTaskTime && input.remindersForTomorrow > 0) {
    due.push({
      key: `taskReminder:${today}`,
      type: "taskReminder",
      title: "Steady",
      body: `${plural(input.remindersForTomorrow, "task is", "tasks are")} due tomorrow.`,
      url: input.remindersGoalId ? `/goals/${input.remindersGoalId}` : "/",
    });
  }
  if (settings.notify.countdownMilestone && minutes >= 9 * 60) {
    for (const { goalId, mark } of input.countdownMilestones) {
      due.push({
        key: `countdownMilestone:${goalId}:${mark}`,
        type: "countdownMilestone",
        title: "Steady",
        body: `${mark} days left on one of your goals.`,
        url: `/goals/${goalId}`,
      });
    }
  }

  return due
    .filter((n) => !sentKeys.has(n.key))
    .sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type])
    .slice(0, Math.max(0, MAX_PER_DAY - sentToday));
}
