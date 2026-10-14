import { NextResponse, type NextRequest } from "next/server";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { db, schema } from "@/db";
import { mayRegister, relyingParty, signedIn, takeChallenge } from "@/lib/passkeys";
import { ensureSeeded } from "@/lib/seed";

export async function POST(request: NextRequest) {
  const { response, setupCode, deviceName } = (await request.json()) as {
    response: RegistrationResponseJSON;
    setupCode?: string;
    deviceName?: string;
  };
  if (!(await mayRegister(request, setupCode))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const challenge = await takeChallenge(request);
  if (!challenge) return NextResponse.json({ error: "The request expired. Try again." }, { status: 400 });

  const { origin, rpID } = relyingParty(request);
  const result = await verifyRegistrationResponse({ response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID }).catch(
    () => null,
  );
  if (!result?.verified) return NextResponse.json({ error: "The passkey could not be verified." }, { status: 400 });

  const { credential } = result.registrationInfo;
  await db.insert(schema.passkeys).values({
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports ?? null,
    deviceName: deviceName?.slice(0, 60) || null,
    createdAt: new Date(),
  });
  await ensureSeeded();
  return signedIn({ ok: true });
}
