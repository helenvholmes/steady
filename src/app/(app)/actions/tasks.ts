"use server";

import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { localDay } from "@/lib/dates";
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
    returnTo: z.string().optional(),
  })
  .refine((t) => !t.startDate || !t.dueDate || t.startDate <= t.dueDate, { message: "The start date must be on or before the due date." });

export async function saveTask(fd: FormData) {
  const f = TaskForm.parse(fields(fd));
  const task = await db.query.tasks.findFirst({ where: eq(schema.tasks.id, f.id) });
  if (!task) return;
  // A linked metric must belong to the same goal.
  const metric = f.metricId ? await db.query.metrics.findFirst({ where: eq(schema.metrics.id, f.metricId) }) : undefined;
  await db
    .update(schema.tasks)
    .set({
      title: f.title,
      notes: f.notes ?? null,
      startDate: f.startDate ?? null,
      dueDate: f.dueDate ?? null,
      metricId: metric?.goalId === task.goalId ? metric.id : null,
      remindDayBefore: f.remindDayBefore,
    })
    .where(eq(schema.tasks.id, f.id));
  done(safeReturn(f.returnTo, `/goals/${task.goalId}`));
}

export async function toggleTask(taskId: number) {
  const task = await db.query.tasks.findFirst({ where: eq(schema.tasks.id, taskId) });
  if (!task) return;
  await db
    .update(schema.tasks)
    .set({ done: !task.done, doneDate: task.done ? null : localDay() })
    .where(eq(schema.tasks.id, taskId));
  done();
}

export async function deleteTask(taskId: number) {
  const task = await db.query.tasks.findFirst({ where: eq(schema.tasks.id, taskId) });
  if (!task) return;
  await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
  done(`/goals/${task.goalId}`);
}
