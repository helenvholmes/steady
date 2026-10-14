"use server";

import { and, eq, isNull, max } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { addDays, daysBetween, localDay } from "@/lib/dates";
import { nextDueDate } from "@/lib/tasks";
import { checkbox, done, fields, id, optDay, optId, optText, safeReturn } from "./form";

/** Quick add: title and an optional date. */
export async function addTask(goalId: number, fd: FormData) {
  const f = z.object({ title: z.string().trim().max(300), dueDate: optDay }).parse(fields(fd));
  if (!f.title) return;
  const [row] = await db.select({ m: max(schema.tasks.order) }).from(schema.tasks).where(eq(schema.tasks.goalId, goalId));
  await db.insert(schema.tasks).values({
    goalId,
    title: f.title,
    dueDate: f.dueDate ?? null,
    order: (row?.m ?? -1) + 1,
    createdAt: new Date(),
  });
  done();
}

const TaskForm = z
  .object({
    id,
    title: z.string().trim().min(1).max(300),
    notes: optText,
    startDate: optDay,
    dueDate: optDay,
    metricId: optId,
    remindDayBefore: checkbox,
    repeat: z.enum(["", "weekly", "monthly"]).default(""),
    returnTo: z.string().optional(),
  })
  .refine((t) => !t.startDate || !t.dueDate || t.startDate <= t.dueDate, { message: "The start date must be on or before the due date." });

export async function saveTask(fd: FormData) {
  const f = TaskForm.parse(fields(fd));
  const task = await db.query.tasks.findFirst({ where: eq(schema.tasks.id, f.id) });
  if (!task) return;
  // A linked metric must belong to the same goal.
  const metric = f.metricId ? await db.query.metrics.findFirst({ where: eq(schema.metrics.id, f.metricId) }) : undefined;
  const repeat = f.repeat || null;
  // A repeating task needs a date to repeat from; without one it starts today.
  const dueDate = f.dueDate ?? (repeat ? localDay() : null);
  // Monthly tasks keep their day of the month (the 31st stays the 31st after a short month moved it to the 30th).
  const keepDay = task.repeat === "monthly" && task.dueDate === dueDate && task.repeatDay;
  const repeatDay = repeat === "monthly" ? (keepDay || Number(dueDate!.slice(8, 10))) : null;
  await db
    .update(schema.tasks)
    .set({
      title: f.title,
      notes: f.notes ?? null,
      startDate: f.startDate ?? null,
      dueDate,
      metricId: metric?.goalId === task.goalId ? metric.id : null,
      remindDayBefore: f.remindDayBefore,
      repeat,
      repeatDay,
    })
    .where(eq(schema.tasks.id, f.id));
  done(safeReturn(f.returnTo, `/goals/${task.goalId}`));
}

export async function toggleTask(taskId: number) {
  const task = await db.query.tasks.findFirst({ where: eq(schema.tasks.id, taskId) });
  if (!task) return;
  const today = localDay();
  await db
    .update(schema.tasks)
    .set({ done: !task.done, doneDate: task.done ? null : today })
    .where(eq(schema.tasks.id, taskId));
  if (!task.done && task.repeat && task.dueDate && !task.nextTaskId) await createNext(task, today);
  done();
}

/**
 * Checking off a repeating task creates the next one: same title, notes, linked metric, and reminder, on the next
 * date in the series (a start date keeps its distance before the due date). Only once per task.
 */
async function createNext(task: typeof schema.tasks.$inferSelect, today: string) {
  const dueDate = nextDueDate(task.dueDate!, task.repeat!, task.repeatDay, today);
  const lead = task.startDate ? daysBetween(task.startDate, task.dueDate!) : null;
  const [row] = await db.select({ m: max(schema.tasks.order) }).from(schema.tasks).where(eq(schema.tasks.goalId, task.goalId));
  const [next] = await db
    .insert(schema.tasks)
    .values({
      goalId: task.goalId,
      metricId: task.metricId,
      title: task.title,
      notes: task.notes,
      startDate: lead === null ? null : addDays(dueDate, -lead),
      dueDate,
      remindDayBefore: task.remindDayBefore,
      repeat: task.repeat,
      repeatDay: task.repeatDay,
      order: (row?.m ?? -1) + 1,
      createdAt: new Date(),
    })
    .returning({ id: schema.tasks.id });
  // Claimed only if no other request created one first.
  const claimed = await db
    .update(schema.tasks)
    .set({ nextTaskId: next.id })
    .where(and(eq(schema.tasks.id, task.id), isNull(schema.tasks.nextTaskId)))
    .returning({ id: schema.tasks.id });
  if (claimed.length === 0) await db.delete(schema.tasks).where(eq(schema.tasks.id, next.id));
}

export async function deleteTask(taskId: number) {
  const task = await db.query.tasks.findFirst({ where: eq(schema.tasks.id, taskId) });
  if (!task) return;
  await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
  done(`/goals/${task.goalId}`);
}
