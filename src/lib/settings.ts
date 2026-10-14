import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Settings } from "@/db/schema";

/** Defaults from REQUIREMENTS.md. All editable in Settings. */
export const DEFAULT_SETTINGS: Settings = {
  userName: "",
  frameColor: "sage",
  frameAnimated: false,
  currency: "USD",
  unitSystem: "imperial",
  taskDueTime: "08:00",
  quietStart: "22:00",
  quietEnd: "07:00",
  notify: { tasksDue: true, taskReminder: true, countdownMilestone: true },
  ai: { weights: true, highlights: true, highlightsIncludeNotes: false },
};

export async function getSettings(): Promise<Settings> {
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.id, 1) });
  const stored = (row?.value ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    notify: { ...DEFAULT_SETTINGS.notify, ...stored.notify },
    ai: { ...DEFAULT_SETTINGS.ai, ...stored.ai },
  };
}

export async function saveSettings(patch: Partial<Settings>) {
  const value = { ...(await getSettings()), ...patch };
  await db.insert(schema.settings).values({ id: 1, value }).onConflictDoUpdate({ target: schema.settings.id, set: { value } });
}
