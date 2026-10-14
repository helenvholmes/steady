"use server";

import { and, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { BlockType, GoalStatus } from "@/db/schema";
import { DEFAULT_MILESTONE_DAYS } from "@/lib/countdown";
import { localDay } from "@/lib/dates";
import { isGoalDrawing, serializeGoalDrawing, type GoalDrawing } from "@/lib/drawings";
import { done, fields, id, optDay } from "./form";

async function nextOrder(status: GoalStatus) {
  const [row] = await db.select({ m: max(schema.goals.order) }).from(schema.goals).where(eq(schema.goals.status, status));
  return (row?.m ?? -1) + 1;
}

const NewGoal = z.object({
  name: z.string().trim().min(1, "Give the goal a name.").max(120),
  status: z.enum(["active", "future"]),
  targetDate: optDay,
  startByDate: optDay,
});

export type GoalFormState = { error?: string } | null;

export async function createGoal(_prev: GoalFormState, fd: FormData): Promise<GoalFormState> {
  const parsed = NewGoal.safeParse(fields(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const f = parsed.data;
  const [goal] = await db
    .insert(schema.goals)
    .values({
      name: f.name,
      status: f.status,
      targetDate: f.targetDate ?? null,
      startByDate: f.status === "future" ? (f.startByDate ?? null) : null,
      milestoneDays: DEFAULT_MILESTONE_DAYS,
      startDate: localDay(),
      order: await nextOrder(f.status),
      createdAt: new Date(),
    })
    .returning({ id: schema.goals.id });
  // A new goal starts with a tasks block and a notes block, plus a countdown if it has a target date.
  const types: BlockType[] = [...(f.targetDate ? (["countdown"] as const) : []), "tasks", "notes"];
  await db.insert(schema.blocks).values(
    types.map((type, order) => ({ goalId: goal.id, type, order, settings: type === "tasks" ? { showDone: false } : {} })),
  );
  done(`/goals/${goal.id}`);
  return null;
}

export async function renameGoal(goalId: number, fd: FormData) {
  const name = z.string().trim().min(1).max(120).safeParse(fd.get("name"));
  if (!name.success) return;
  await db.update(schema.goals).set({ name: name.data }).where(eq(schema.goals.id, goalId));
  done();
}

const GoalDates = z.object({
  targetDate: optDay,
  startByDate: optDay,
  milestoneDays: z.string().max(200).default(""),
});

export async function updateGoalDates(goalId: number, fd: FormData) {
  const f = GoalDates.parse(fields(fd));
  const milestoneDays = [...new Set(f.milestoneDays.split(",").map((s) => Number(s.trim())))]
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => b - a);
  await db
    .update(schema.goals)
    .set({ targetDate: f.targetDate ?? null, startByDate: f.startByDate ?? null, milestoneDays })
    .where(eq(schema.goals.id, goalId));
  done();
}

const ACTIONS = ["complete", "archive", "start", "pause", "reopen"] as const;

/** Moves a goal between future, active, completed, and archived. */
export async function setGoalStatus(goalId: number, action: (typeof ACTIONS)[number]) {
  z.enum(ACTIONS).parse(action);
  const goal = await db.query.goals.findFirst({ where: eq(schema.goals.id, goalId) });
  if (!goal) return;
  const today = localDay();
  if (action === "complete") {
    await db.update(schema.goals).set({ status: "completed", completedDate: today }).where(eq(schema.goals.id, goalId));
  } else if (action === "archive") {
    await db.update(schema.goals).set({ status: "archived" }).where(eq(schema.goals.id, goalId));
  } else if (action === "pause") {
    await db.update(schema.goals).set({ status: "future", order: await nextOrder("future") }).where(eq(schema.goals.id, goalId));
  } else {
    // start (from future) or reopen (from completed or archived): joins the end of the active grid.
    const set = { status: "active" as const, completedDate: null, order: await nextOrder("active") };
    await db
      .update(schema.goals)
      .set(action === "start" ? { ...set, startDate: today, startByDate: null } : set)
      .where(eq(schema.goals.id, goalId));
  }
  done(`/goals/${goalId}`);
}

/** Saves a new order for the goals in one home screen section (active or future). */
export async function reorderGoals(status: "active" | "future", goalIds: number[]) {
  const ids = z.array(id).max(500).parse(goalIds);
  const rows = await db
    .select({ id: schema.goals.id })
    .from(schema.goals)
    .where(and(eq(schema.goals.status, status), inArray(schema.goals.id, ids)));
  const valid = new Set(rows.map((r) => r.id));
  for (const [order, goalId] of ids.entries()) {
    if (valid.has(goalId)) await db.update(schema.goals).set({ order }).where(eq(schema.goals.id, goalId));
  }
  done();
}

/** Sets the goal's drawing (a person or an icon), or clears it with null. */
export async function setGoalDrawing(goalId: number, drawing: GoalDrawing | null) {
  if (drawing !== null && !isGoalDrawing(drawing)) return;
  await db
    .update(schema.goals)
    .set({ drawing: drawing ? serializeGoalDrawing(drawing) : null })
    .where(eq(schema.goals.id, goalId));
  done();
}
