import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { endpointHash, sendToAll } from "@/lib/push";

const Subscription = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Saves this device's push subscription. */
export async function POST(request: NextRequest) {
  const parsed = Subscription.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  const hash = endpointHash(parsed.data.endpoint);
  await db
    .insert(schema.pushSubscriptions)
    .values({ subscription: parsed.data, endpointHash: hash, createdAt: new Date() })
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpointHash, set: { subscription: parsed.data } });
  return NextResponse.json({ ok: true });
}

/** Removes this device's subscription. */
export async function DELETE(request: NextRequest) {
  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpointHash, endpointHash(endpoint)));
  return NextResponse.json({ ok: true });
}

/** Sends a test notification to every device. */
export async function PUT() {
  const delivered = await sendToAll({ title: "Steady", body: "Notifications are on.", url: "/settings", tag: "test" });
  return NextResponse.json({ delivered });
}
