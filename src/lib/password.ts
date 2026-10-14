import "server-only";
import { count, eq, gte, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { verifyPassword } from "./password-hash";

/** 10 wrong passwords in 15 minutes locks password sign-in until the oldest one ages out. Passkeys still work. */
export const MAX_FAILURES = 10;
export const WINDOW_MS = 15 * 60 * 1000;

export async function hasPassword() {
  return !!(await db.query.password.findFirst({ where: eq(schema.password.id, 1) }));
}

export async function lockedOut(now = Date.now()) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.loginFailures)
    .where(gte(schema.loginFailures.at, new Date(now - WINDOW_MS)));
  return n >= MAX_FAILURES;
}

/** Checks the password, counting a wrong one toward the limit. */
export async function checkPassword(attempt: string): Promise<"ok" | "wrong" | "locked" | "none"> {
  const row = await db.query.password.findFirst({ where: eq(schema.password.id, 1) });
  if (!row) return "none";
  if (await lockedOut()) return "locked";
  if (await verifyPassword(attempt, row.hash)) return "ok";
  await db.insert(schema.loginFailures).values({ at: new Date() });
  // Old failures aren't needed once they're outside the window.
  await db.delete(schema.loginFailures).where(lt(schema.loginFailures.at, new Date(Date.now() - WINDOW_MS)));
  return "wrong";
}
