import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { db, schema } from "@/db";

let configured = false;
function configure() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error("VAPID keys and VAPID_SUBJECT must be set to send push.");
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export const endpointHash = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");

/** Sends to every subscribed device. Drops subscriptions the push service says are gone. Returns devices reached. */
export async function sendToAll(payload: { title: string; body: string; url: string; tag?: string }) {
  configure();
  const subs = await db.select().from(schema.pushSubscriptions);
  let delivered = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify(payload), { TTL: 60 * 60, urgency: "normal" });
      delivered++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, sub.id));
      else console.error("push failed", status);
    }
  }
  return delivered;
}
