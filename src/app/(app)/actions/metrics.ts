"use server";

import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { BlockSettings } from "@/db/schema";
import { markReachedMilestones, resetMilestones } from "@/lib/data/goals";
import { formatDay, localDay } from "@/lib/dates";
import { unsafeWeightPlan } from "@/lib/metrics";
import { blankToUndef, dayStr, done, fields, id, optId } from "./form";

const MetricForm = z
  .object({
    id: optId,
    goalId: id,
    blockId: optId,
    name: z.string().trim().min(1, "Give the metric a name.").max(80),
    kind: z.enum(["value", "count"]),
    unit: z.string().trim().min(1, "Add a unit, like a currency code (USD, EUR), lb or kg, or a word like books.").max(20),
    startValue: z.coerce.number(),
    targetValue: z.coerce.number(),
    startDate: dayStr,
    targetDate: dayStr,
    checkInFrequency: z.enum(["daily", "weekly", "monthly"]),
    milestoneStepPct: z.coerce.number().int().min(0).max(100),
  })
  .refine((m) => m.targetDate > m.startDate, { message: "The target date must be after the start date.", path: ["targetDate"] })
  .refine((m) => m.targetValue !== m.startValue, { message: "The target must differ from the start value.", path: ["targetValue"] });

/** On an error, the submitted values come back so the form (which React resets after an action) keeps them. */
export type MetricFormState = { error?: string; earliestDate?: string; values?: Record<string, string> } | null;

export async function saveMetric(_prev: MetricFormState, fd: FormData): Promise<MetricFormState> {
  const raw = fields(fd);
  const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v ?? "")]));
  const parsed = MetricForm.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", values };
  const f = parsed.data;
  const direction = f.targetValue > f.startValue ? ("up" as const) : ("down" as const);

  const unsafe = unsafeWeightPlan({ ...f, direction });
  if (unsafe) {
    return {
      error: `This plan needs ${unsafe.perWeek.toFixed(1)} ${f.unit} a week. Loss of ${f.unit === "kg" ? "0.5–0.9 kg" : "1–2 lb"} a week is more likely to last. Pick a target date on or after ${formatDay(unsafe.earliestDate, { month: "long", day: "numeric", year: "numeric" })}.`,
      earliestDate: unsafe.earliestDate,
      values,
    };
  }

  const row = {
    name: f.name,
    kind: f.kind,
    unit: f.unit,
    startValue: f.startValue,
    targetValue: f.targetValue,
    startDate: f.startDate,
    targetDate: f.targetDate,
    direction,
    checkInFrequency: f.checkInFrequency,
    milestoneStepPct: f.milestoneStepPct,
  };
  let metricId = f.id;
  if (metricId) {
    await db.update(schema.metrics).set(row).where(and(eq(schema.metrics.id, metricId), eq(schema.metrics.goalId, f.goalId)));
  } else {
    [{ id: metricId }] = await db.insert(schema.metrics).values({ ...row, goalId: f.goalId }).returning({ id: schema.metrics.id });
    await attachMetric(f.blockId, f.goalId, metricId);
  }
  const metric = (await db.query.metrics.findFirst({ where: eq(schema.metrics.id, metricId!) }))!;
  await resetMilestones(metric);
  await markReachedMilestones(metric.id);
  done(`/goals/${f.goalId}`);
  return null;
}

/** Shows a new metric in the empty metric block it was created from, or in a new metric block. */
async function attachMetric(blockId: number | undefined, goalId: number, metricId: number) {
  if (blockId) {
    const block = await db.query.blocks.findFirst({ where: and(eq(schema.blocks.id, blockId), eq(schema.blocks.goalId, goalId)) });
    if (block?.type === "metric") {
      const settings: BlockSettings = { ...block.settings, metricId };
      await db.update(schema.blocks).set({ settings }).where(eq(schema.blocks.id, blockId));
      return;
    }
  }
  const [row] = await db.select({ m: max(schema.blocks.order) }).from(schema.blocks).where(eq(schema.blocks.goalId, goalId));
  await db.insert(schema.blocks).values({ goalId, type: "metric", settings: { metricId }, order: (row?.m ?? -1) + 1 });
}

export async function addMetricEntry(fd: FormData) {
  const f = z.object({ metricId: id, day: dayStr, value: z.coerce.number() }).parse(fields(fd));
  await db.insert(schema.metricEntries).values({ metricId: f.metricId, day: f.day, value: f.value, createdAt: new Date() });
  await markReachedMilestones(f.metricId);
  done();
}

export async function addOne(metricId: number) {
  await db.insert(schema.metricEntries).values({ metricId, day: localDay(), value: 1, createdAt: new Date() });
  await markReachedMilestones(metricId);
  done();
}

export async function deleteMetricEntry(entryId: number, metricId: number) {
  await db.delete(schema.metricEntries).where(and(eq(schema.metricEntries.id, entryId), eq(schema.metricEntries.metricId, metricId)));
  done();
}

export async function setHideDaily(metricId: number, hide: boolean) {
  await db.update(schema.metrics).set({ hideDailyValues: hide }).where(eq(schema.metrics.id, metricId));
  done();
}

/** Deletes the metric, its entries, milestones, and weight. Metric blocks that showed it become empty. */
export async function deleteMetric(metricId: number) {
  const metric = await db.query.metrics.findFirst({ where: eq(schema.metrics.id, metricId) });
  if (!metric) return;
  const blocks = await db.select().from(schema.blocks).where(eq(schema.blocks.goalId, metric.goalId));
  for (const b of blocks) {
    const s = b.settings;
    if (s.metricId === metricId || s.metricIds?.includes(metricId)) {
      const settings: BlockSettings = { ...s, metricId: s.metricId === metricId ? null : s.metricId, metricIds: s.metricIds?.filter((m) => m !== metricId) };
      await db.update(schema.blocks).set({ settings }).where(eq(schema.blocks.id, b.id));
    }
  }
  await db
    .delete(schema.progressWeights)
    .where(and(eq(schema.progressWeights.goalId, metric.goalId), eq(schema.progressWeights.inputKey, `metric:${metricId}`)));
  await db.delete(schema.metrics).where(eq(schema.metrics.id, metricId));
  done(`/goals/${metric.goalId}`);
}

// ---------- progress weights ----------

/** The user sets one input's share of the progress bar, in percent. It's kept until reset. */
export async function setWeight(goalId: number, inputKey: string, fd: FormData) {
  const percent = z.preprocess(blankToUndef, z.coerce.number().min(0).max(100)).parse(fd.get("percent"));
  const key = z.string().regex(/^(metric:\d+|tasks|time)$/).parse(inputKey);
  await db
    .insert(schema.progressWeights)
    .values({ goalId, inputKey: key, weight: percent / 100, userSet: true, reason: "Set by you" })
    .onConflictDoUpdate({
      target: [schema.progressWeights.goalId, schema.progressWeights.inputKey],
      set: { weight: percent / 100, userSet: true, reason: "Set by you" },
    });
  done();
}

/** Clears the user's weights and asks AI again. */
export async function resetWeights(goalId: number) {
  await db.delete(schema.progressWeights).where(eq(schema.progressWeights.goalId, goalId));
  await db.update(schema.goals).set({ weightsSignature: null }).where(eq(schema.goals.id, goalId));
  done();
}
