"use server";

import { asc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { BLOCK_TYPES, type BlockSettings, type BlockType } from "@/db/schema";
import { done, id } from "./form";

const DEFAULT_SETTINGS: Record<BlockType, BlockSettings> = {
  countdown: {},
  metric: { metricId: null },
  metric_summary: { metricIds: [] },
  tasks: { showDone: false },
  notes: {},
};

export async function addBlock(goalId: number, type: BlockType) {
  z.enum(BLOCK_TYPES).parse(type);
  const [row] = await db.select({ m: max(schema.blocks.order) }).from(schema.blocks).where(eq(schema.blocks.goalId, goalId));
  await db.insert(schema.blocks).values({ goalId, type, settings: DEFAULT_SETTINGS[type], order: (row?.m ?? -1) + 1 });
  done();
}

/** Moves a block one place up (-1) or down (1). */
export async function moveBlock(blockId: number, direction: -1 | 1) {
  const block = await db.query.blocks.findFirst({ where: eq(schema.blocks.id, blockId) });
  if (!block) return;
  const all = await db
    .select({ id: schema.blocks.id })
    .from(schema.blocks)
    .where(eq(schema.blocks.goalId, block.goalId))
    .orderBy(asc(schema.blocks.order), asc(schema.blocks.id));
  const ids = all.map((b) => b.id);
  const from = ids.indexOf(blockId);
  const to = from + direction;
  if (to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  for (const [order, bid] of ids.entries()) await db.update(schema.blocks).set({ order }).where(eq(schema.blocks.id, bid));
  done();
}

/** Removes the block only. A metric it showed stays on the goal. */
export async function removeBlock(blockId: number) {
  await db.delete(schema.blocks).where(eq(schema.blocks.id, blockId));
  done();
}

async function updateSettings(blockId: number, patch: BlockSettings) {
  const block = await db.query.blocks.findFirst({ where: eq(schema.blocks.id, blockId) });
  if (!block) return;
  await db.update(schema.blocks).set({ settings: { ...block.settings, ...patch } }).where(eq(schema.blocks.id, blockId));
}

export async function setBlockMetric(blockId: number, fd: FormData) {
  const metricId = id.parse(fd.get("metricId"));
  const block = await db.query.blocks.findFirst({ where: eq(schema.blocks.id, blockId) });
  const metric = await db.query.metrics.findFirst({ where: eq(schema.metrics.id, metricId) });
  if (!block || !metric || metric.goalId !== block.goalId) return;
  await updateSettings(blockId, { metricId });
  done();
}

export async function setSummaryMetrics(blockId: number, fd: FormData) {
  const metricIds = z.array(id).parse(fd.getAll("metricIds"));
  await updateSettings(blockId, { metricIds });
  done();
}

export async function setShowDone(blockId: number, showDone: boolean) {
  await updateSettings(blockId, { showDone });
  done();
}

