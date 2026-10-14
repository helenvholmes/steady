import { NextResponse, type NextRequest } from "next/server";
import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { relyingParty, signedIn, takeChallenge } from "@/lib/passkeys";

export async function POST(request: NextRequest) {
  const { response } = (await request.json()) as { response: AuthenticationResponseJSON };
  const challenge = await takeChallenge(request);
  if (!challenge) return NextResponse.json({ error: "The request expired. Try again." }, { status: 400 });

  const passkey = await db.query.passkeys.findFirst({ where: eq(schema.passkeys.id, response.id) });
  if (!passkey) return NextResponse.json({ error: "This passkey isn't registered with Steady." }, { status: 400 });

  const { origin, rpID } = relyingParty(request);
  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: passkey.id,
      publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
      counter: passkey.counter,
      transports: passkey.transports ?? undefined,
    },
  }).catch(() => null);
  if (!result?.verified) return NextResponse.json({ error: "The passkey could not be verified." }, { status: 400 });

  await db.update(schema.passkeys).set({ counter: result.authenticationInfo.newCounter }).where(eq(schema.passkeys.id, passkey.id));
  return signedIn({ ok: true });
}
