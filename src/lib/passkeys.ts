import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { count } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  CHALLENGE_COOKIE,
  CHALLENGE_MAX_AGE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSession,
  isValidSession,
  readChallenge,
  safeEqual,
  signChallenge,
} from "./session";

export const RP_NAME = "Steady";

/** The site's own origin and RP ID, from the request (the passkey is bound to this host). */
export function relyingParty(request: NextRequest) {
  const origin = request.nextUrl.origin;
  return { origin, rpID: request.nextUrl.hostname };
}

export async function passkeyCount() {
  const [row] = await db.select({ n: count() }).from(schema.passkeys);
  return row.n;
}

/**
 * Who may register a passkey:
 * - someone already signed in (adding a device);
 * - anyone with STEADY_SETUP_CODE (first setup on a deployed host, or recovery);
 * - on a local machine with no setup code configured, the first passkey only.
 */
export async function mayRegister(request: NextRequest, setupCode: string | undefined) {
  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return true;
  const expected = process.env.STEADY_SETUP_CODE;
  if (expected) return !!setupCode && safeEqual(setupCode, expected);
  return !process.env.VERCEL && (await passkeyCount()) === 0;
}

export async function withChallenge(body: unknown, challenge: string) {
  const res = NextResponse.json(body);
  res.cookies.set(CHALLENGE_COOKIE, await signChallenge(challenge), cookieOpts(CHALLENGE_MAX_AGE));
  return res;
}

export async function takeChallenge(request: NextRequest) {
  return readChallenge(request.cookies.get(CHALLENGE_COOKIE)?.value);
}

export async function signedIn(body: unknown) {
  const res = NextResponse.json(body);
  res.cookies.set(SESSION_COOKIE, await createSession(), cookieOpts(SESSION_MAX_AGE));
  res.cookies.delete(CHALLENGE_COOKIE);
  return res;
}

function cookieOpts(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}
