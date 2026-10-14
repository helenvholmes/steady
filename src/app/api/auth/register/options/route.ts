import { NextResponse, type NextRequest } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { db, schema } from "@/db";
import { RP_NAME, mayRegister, relyingParty, withChallenge } from "@/lib/passkeys";

export async function POST(request: NextRequest) {
  const { setupCode } = (await request.json().catch(() => ({}))) as { setupCode?: string };
  if (!(await mayRegister(request, setupCode))) {
    return NextResponse.json({ error: "Enter the setup code to add a passkey." }, { status: 403 });
  }
  const existing = await db.select({ id: schema.passkeys.id, transports: schema.passkeys.transports }).from(schema.passkeys);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: relyingParty(request).rpID,
    userName: "steady",
    userDisplayName: "Steady",
    userID: new TextEncoder().encode("steady-single-user"),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports ?? undefined })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  return withChallenge(options, options.challenge);
}
