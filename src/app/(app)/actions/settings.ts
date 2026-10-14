"use server";

import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "@/lib/password-hash";
import { FRAME_COLORS } from "@/lib/frame";
import { resetMilestones } from "@/lib/data/goals";
import { getSettings, saveSettings } from "@/lib/settings";
import { CURRENCIES, convertWeight, isCurrency, weightUnit } from "@/lib/units";
import { done, fields, timeStr } from "./form";

const SettingsForm = z.object({
  userName: z.string().trim().max(60).default(""),
  frameColor: z.enum(FRAME_COLORS.map((c) => c.id) as [string, ...string[]]).default("sage"),
  taskDueTime: timeStr,
  quietStart: timeStr,
  quietEnd: timeStr,
  currency: z.enum(CURRENCIES).default("USD"),
  unitSystem: z.enum(["imperial", "metric"]).default("imperial"),
});

export async function saveSettingsForm(fd: FormData) {
  const f = SettingsForm.parse(fields(fd));
  const on = (k: string) => fd.get(k) === "on";
  const before = await getSettings();
  if (f.currency !== before.currency) await relabelMoney(f.currency);
  if (f.unitSystem !== before.unitSystem) await convertWeights(weightUnit(f.unitSystem));
  await saveSettings({
    ...f,
    frameAnimated: on("frameAnimated"),
    notify: { tasksDue: on("notify.tasksDue"), taskReminder: on("notify.taskReminder"), countdownMilestone: on("notify.countdownMilestone") },
    ai: { weights: on("ai.weights"), highlights: on("ai.highlights"), highlightsIncludeNotes: on("ai.highlightsIncludeNotes") },
  });
  done("/settings?saved=1");
}

// ---------- units ----------

/** Money metrics take the new currency code. Only the label changes: amounts aren't converted. */
async function relabelMoney(currency: string) {
  const rows = await db.select({ id: schema.metrics.id, unit: schema.metrics.unit }).from(schema.metrics);
  const ids = rows.filter((r) => isCurrency(r.unit) && r.unit !== currency).map((r) => r.id);
  if (ids.length) await db.update(schema.metrics).set({ unit: currency }).where(inArray(schema.metrics.id, ids));
}

/**
 * Weight metrics are converted to the new unit, with their entries and reached milestones, so what's stored is
 * what's shown. Milestones not yet reached are made again from the converted range.
 */
async function convertWeights(to: "lb" | "kg") {
  const from = to === "kg" ? "lb" : "kg";
  const metrics = await db.select().from(schema.metrics).where(eq(schema.metrics.unit, from));
  if (metrics.length === 0) return;
  const ids = metrics.map((m) => m.id);
  const entries = await db.select().from(schema.metricEntries).where(inArray(schema.metricEntries.metricId, ids));
  const reached = await db.select().from(schema.milestones).where(inArray(schema.milestones.metricId, ids));
  const round = (n: number) => Math.round(n * 100) / 100;
  await db.transaction(async (tx) => {
    for (const m of metrics) {
      await tx
        .update(schema.metrics)
        .set({ unit: to, startValue: convertWeight(m.startValue, from, to), targetValue: convertWeight(m.targetValue, from, to) })
        .where(eq(schema.metrics.id, m.id));
    }
    for (const e of entries) {
      await tx.update(schema.metricEntries).set({ value: convertWeight(e.value, from, to) }).where(eq(schema.metricEntries.id, e.id));
    }
    for (const m of reached) {
      if (m.reachedDate) await tx.update(schema.milestones).set({ value: round(convertWeight(m.value, from, to)) }).where(eq(schema.milestones.id, m.id));
    }
  });
  for (const m of await db.select().from(schema.metrics).where(inArray(schema.metrics.id, ids))) await resetMilestones(m);
}

// ---------- password ----------

export type PasswordState = { error?: string; message?: string } | null;

/** Sets or changes the sign-in password. Changing it requires the current one. */
export async function setPassword(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const existing = await db.query.password.findFirst({ where: eq(schema.password.id, 1) });
  if (existing && !(await verifyPassword(current, existing.hash))) return { error: "Your current password isn't right." };
  if (next.length < MIN_PASSWORD_LENGTH) return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (next.length > 1000) return { error: "That password is too long." };
  if (next !== confirm) return { error: "The two passwords don't match." };
  const hash = await hashPassword(next);
  await db
    .insert(schema.password)
    .values({ id: 1, hash, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.password.id, set: { hash, updatedAt: new Date() } });
  done();
  return { message: existing ? "Password changed." : "Password set. You can sign in with it or your passkey." };
}

/** Removes the password, leaving passkey sign-in. Requires the current password. */
export async function removePassword(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const existing = await db.query.password.findFirst({ where: eq(schema.password.id, 1) });
  if (!existing) return null;
  if (!(await verifyPassword(String(fd.get("current") ?? ""), existing.hash))) return { error: "Your current password isn't right." };
  await db.delete(schema.password).where(eq(schema.password.id, 1));
  done();
  return { message: "Password removed. Sign in with your passkey." };
}
