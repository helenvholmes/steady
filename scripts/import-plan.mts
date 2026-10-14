// Imports a goal with its metrics, tasks, notes, and block layout from a JSON file (kept in data/, which git
// ignores, so personal figures never enter the repo). Values are encrypted by the schema's enc* columns like
// any app write. Safe to rerun: an existing goal, metric (by name), task (by title), or note (by text) is skipped.
//
//   npx tsx scripts/import-plan.mts data/my-goal.json
//
// Runs against data/steady.db, or Turso when TURSO_DATABASE_URL is set.
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { and, eq, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { z } from "zod";
import * as schema from "../src/db/schema";
import { dbUrl } from "../src/db/url";
import { milestoneValues, type MetricShape } from "../src/lib/metrics";

try {
  process.loadEnvFile(".env.local");
} catch {}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Note = z.object({ day, text: z.string().min(1).max(5000) });
const Plan = z.object({
  goal: z.object({
    name: z.string().min(1),
    drawing: z.string().nullable().default(null),
    targetDate: day.nullable().default(null),
    startDate: day,
    milestoneDays: z.array(z.number().int().positive()).default([365, 180, 100, 30, 7]),
  }),
  notes: z.array(Note).default([]),
  metrics: z
    .array(
      z.object({
        name: z.string(),
        kind: z.enum(["value", "count"]),
        unit: z.string(),
        startValue: z.number(),
        targetValue: z.number(),
        startDate: day,
        targetDate: day,
        checkInFrequency: z.enum(["daily", "weekly", "monthly"]),
        milestoneStepPct: z.number().int().min(0).max(100),
        entries: z.array(z.object({ day, value: z.number() })).default([]),
        notes: z.array(Note).default([]),
      }),
    )
    .default([]),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(300),
        startDate: day.nullable().default(null),
        dueDate: day.nullable().default(null),
        metric: z.string().nullable().default(null),
        notes: z.string().nullable().default(null),
        doneDate: day.nullable().default(null),
      }),
    )
    .default([]),
  /** Block layout for a newly created goal: { type, metric? } where metric names a metric above. */
  blocks: z.array(z.object({ type: z.enum(schema.BLOCK_TYPES), metric: z.string().optional() })).default([]),
});

const file = process.argv[2];
if (!file) throw new Error("Usage: npx tsx scripts/import-plan.mts <plan.json>");
const plan = Plan.parse(JSON.parse(readFileSync(file, "utf8")));

const client = createClient({ url: dbUrl(), authToken: process.env.TURSO_AUTH_TOKEN });
const db = drizzle(client, { schema });

async function addNotes(parentType: "goal" | "metric", parentId: number, notes: z.infer<typeof Note>[]) {
  const existing = await db
    .select({ text: schema.notes.text })
    .from(schema.notes)
    .where(and(eq(schema.notes.parentType, parentType), eq(schema.notes.parentId, parentId)));
  const have = new Set(existing.map((n) => n.text));
  let added = 0;
  for (const n of notes) {
    if (have.has(n.text)) continue;
    await db.insert(schema.notes).values({ parentType, parentId, day: n.day, text: n.text, updatedAt: new Date() });
    added++;
  }
  return added;
}

// Goal
let goal = (await db.select().from(schema.goals)).find((g) => g.name === plan.goal.name);
const createdGoal = !goal;
if (!goal) {
  const [row] = await db.select({ m: max(schema.goals.order) }).from(schema.goals).where(eq(schema.goals.status, "active"));
  [goal] = await db
    .insert(schema.goals)
    .values({ ...plan.goal, status: "active", order: (row?.m ?? -1) + 1, createdAt: new Date() })
    .returning();
}
console.log(`Goal "${goal.name}": ${createdGoal ? "created" : "already exists"}; ${await addNotes("goal", goal.id, plan.notes)} notes added`);

// Metrics
const existingMetrics = await db.select().from(schema.metrics).where(eq(schema.metrics.goalId, goal.id));
const metricIds = new Map(existingMetrics.map((m) => [m.name, m.id]));
for (const m of plan.metrics) {
  let metricId = metricIds.get(m.name);
  if (metricId) {
    console.log(`Metric "${m.name}": already exists, entries left as they are`);
  } else {
    const direction = m.targetValue > m.startValue ? "up" : "down";
    const { name, kind, unit, startValue, targetValue, startDate, targetDate, checkInFrequency, milestoneStepPct, entries } = m;
    [{ id: metricId }] = await db
      .insert(schema.metrics)
      .values({ name, kind, unit, startValue, targetValue, startDate, targetDate, checkInFrequency, milestoneStepPct, direction, goalId: goal.id })
      .returning({ id: schema.metrics.id });
    metricIds.set(m.name, metricId);
    const values = milestoneValues({ ...m, direction } as MetricShape);
    if (values.length) await db.insert(schema.milestones).values(values.map((value) => ({ metricId, value })));
    for (const e of entries) await db.insert(schema.metricEntries).values({ metricId, day: e.day, value: e.value, createdAt: new Date() });
    console.log(`Metric "${m.name}": created with ${values.length} milestones, ${entries.length} entries`);
  }
  console.log(`  ${await addNotes("metric", metricId, m.notes)} notes added`);
}

// Tasks
const existingTasks = new Set((await db.select({ title: schema.tasks.title }).from(schema.tasks).where(eq(schema.tasks.goalId, goal.id))).map((t) => t.title));
let order = existingTasks.size;
let tasksAdded = 0;
for (const t of plan.tasks) {
  if (existingTasks.has(t.title)) continue;
  await db.insert(schema.tasks).values({
    goalId: goal.id,
    title: t.title,
    startDate: t.startDate,
    dueDate: t.dueDate,
    notes: t.notes,
    done: t.doneDate !== null,
    doneDate: t.doneDate,
    metricId: t.metric ? (metricIds.get(t.metric) ?? null) : null,
    order: order++,
    createdAt: new Date(),
  });
  tasksAdded++;
}
console.log(`Tasks: ${tasksAdded} added`);

// Blocks, for a new goal only (the user's own layout is never changed)
if (createdGoal) {
  for (const [i, b] of plan.blocks.entries()) {
    const settings: schema.BlockSettings =
      b.type === "metric" ? { metricId: (b.metric && metricIds.get(b.metric)) || null } : b.type === "tasks" ? { showDone: false } : b.type === "metric_summary" ? { metricIds: [] } : {};
    await db.insert(schema.blocks).values({ goalId: goal.id, type: b.type, settings, order: i });
  }
  console.log(`Blocks: ${plan.blocks.length} added`);
}
client.close();
