// Writes .env.local with fresh local secrets. Never overwrites an existing file.
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import webpush from "web-push";

const FILE = ".env.local";
if (existsSync(FILE)) {
  console.log(`${FILE} already exists; leaving it alone.`);
  process.exit(0);
}
const vapid = webpush.generateVAPIDKeys();
const lines = [
  `STEADY_TIME_ZONE=${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
  `STEADY_SECRET=${randomBytes(32).toString("base64url")}`,
  `STEADY_DATA_KEY=${randomBytes(32).toString("base64")}`,
  `STEADY_SETUP_CODE=`,
  `STEADY_DEV_LOGIN=`,
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapid.publicKey}`,
  `VAPID_PRIVATE_KEY=${vapid.privateKey}`,
  `VAPID_SUBJECT=`,
  `CRON_SECRET=${randomBytes(24).toString("base64url")}`,
];
writeFileSync(FILE, lines.join("\n") + "\n", { mode: 0o600 });
console.log(`Wrote ${FILE}. Keep STEADY_DATA_KEY safe: without it the data can't be read.`);
