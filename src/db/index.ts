import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { dbUrl } from "./url";
import * as schema from "./schema";

/** Locally the SQLite file in data/; deployed, the Turso database in TURSO_DATABASE_URL. */
const client = createClient({ url: dbUrl(), authToken: process.env.TURSO_AUTH_TOKEN });

export const db = drizzle(client, { schema });
export { schema };
