// Applies the SQL migrations in drizzle/ to the local file or Turso database. Runs before every build.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { dbUrl } from "../src/db/url";

process.loadEnvFile?.(".env.local");

const url = dbUrl();
if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL is required on Vercel.");
}
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
await migrate(drizzle(client), { migrationsFolder: "drizzle" });
console.log(`Migrated ${url.startsWith("file:") ? url : "Turso database"}`);
client.close();
