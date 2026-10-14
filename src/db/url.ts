import { mkdirSync } from "node:fs";
import path from "node:path";

export function dbUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const dir = path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR ?? "data");
  mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, "steady.db")}`;
}
