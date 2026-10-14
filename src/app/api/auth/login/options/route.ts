import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type { NextRequest } from "next/server";
import { relyingParty, withChallenge } from "@/lib/passkeys";

export async function POST(request: NextRequest) {
  // No allowCredentials: the device offers its Steady passkey without the server naming it.
  const options = await generateAuthenticationOptions({ rpID: relyingParty(request).rpID, userVerification: "preferred" });
  return withChallenge(options, options.challenge);
}
