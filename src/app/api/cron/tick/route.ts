import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { syncCountdownMilestones } from "@/lib/data/goals";
import { addDays, localDay } from "@/lib/dates";
import { planNotifications } from "@/lib/notify-plan";
import { sendToAll } from "@/lib/push";
import { safeEqual } from "@/lib/session";
import { getSettings } from "@/lib/settings";

/** Called every 5 minutes by cron-job.org with "Authorization: Bearer <CRON_SECRET>". */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!expected || !safeEqual(given, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const today = localDay(now);
  const tomorrow = addDays(today, 1);
  const [settings, todaysLog, allKeys, countdownMilestones, openTasks, futureGoals] = await Promise.all([
    getSettings(),
    db.select({ key: schema.notificationLog.key }).from(schema.notificationLog).where(eq(schema.notificationLog.day, today)),
    db.select({ key: schema.notificationLog.key }).from(schema.notificationLog),
    syncCountdownMilestones(today),
    // Tasks on active goals only: future goals are quiet.
    db
      .select({ goalId: schema.tasks.goalId, dueDate: schema.tasks.dueDate, remindDayBefore: schema.tasks.remindDayBefore })
      .from(schema.tasks)
      .innerJoin(schema.goals, eq(schema.goals.id, schema.tasks.goalId))
      .where(and(eq(schema.tasks.done, false), eq(schema.goals.status, "active"))),
    // Future goals reaching their start-by date today; each is counted once, in that morning's digest.
    db
      .select({ id: schema.goals.id })
      .from(schema.goals)
      .where(and(eq(schema.goals.status, "future"), eq(schema.goals.startByDate, today))),
  ]);

  const dueToday = openTasks.filter((t) => t.dueDate === today);
  const reminders = openTasks.filter((t) => t.dueDate === tomorrow && t.remindDayBefore);
  const onlyGoal = (ids: number[]) => (new Set(ids).size === 1 ? ids[0] : null);

  const due = planNotifications({
    now,
    settings,
    sentKeys: new Set(allKeys.map((r) => r.key)),
    sentToday: todaysLog.length,
    tasksDueToday: dueToday.length,
    futureGoalsReady: futureGoals.length,
    remindersForTomorrow: reminders.length,
    digestGoalId: onlyGoal([...dueToday.map((t) => t.goalId), ...futureGoals.map((g) => g.id)]),
    remindersGoalId: onlyGoal(reminders.map((t) => t.goalId)),
    countdownMilestones,
  });

  const sent: string[] = [];
  for (const n of due) {
    // Log first: if two ticks overlap, the unique key stops the second one from sending again.
    const inserted = await db
      .insert(schema.notificationLog)
      .values({ key: n.key, type: n.type, day: today, sentAt: now })
      .onConflictDoNothing()
      .returning({ id: schema.notificationLog.id });
    if (inserted.length === 0) continue;
    await sendToAll({ title: n.title, body: n.body, url: n.url, tag: n.type });
    sent.push(n.type);
  }
  return NextResponse.json({ sent });
}
