import "server-only";
import { count } from "drizzle-orm";
import { db, schema } from "@/db";
import { DEFAULT_SETTINGS } from "./settings";

/** First-run data: settings only. Goals are the user's own (starting data comes from scripts/import-plan.mts). */
export async function ensureSeeded() {
  const [{ n }] = await db.select({ n: count() }).from(schema.settings);
  if (n === 0) await db.insert(schema.settings).values({ id: 1, value: DEFAULT_SETTINGS }).onConflictDoNothing();
}
