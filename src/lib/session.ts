// Signed cookies. Runs in the proxy and in route handlers, so it only uses Web Crypto.

export const SESSION_COOKIE = "steady_session";
export const CHALLENGE_COOKIE = "steady_challenge";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // stay signed in on the Home Screen app
export const CHALLENGE_MAX_AGE = 5 * 60;

function secret() {
  const s = process.env.STEADY_SECRET;
  if (!s) throw new Error("STEADY_SECRET is not set. Run `npm run setup:env`.");
  return s;
}

async function hmac(message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Buffer.from(sig).toString("base64url");
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** "<payload>.<expiresMs>.<sig>". Payload must not contain dots. */
async function sign(purpose: string, payload: string, maxAgeSec: number) {
  const exp = Date.now() + maxAgeSec * 1000;
  return `${payload}.${exp}.${await hmac(`${purpose}:${payload}.${exp}`)}`;
}

async function verify(purpose: string, value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const [payload, exp, sig] = value.split(".");
  if (!payload || !exp || !sig || Number(exp) < Date.now()) return null;
  return safeEqual(sig, await hmac(`${purpose}:${payload}.${exp}`)) ? payload : null;
}

export const createSession = () => sign("session", "1", SESSION_MAX_AGE);
export const isValidSession = async (value: string | undefined) => (await verify("session", value)) !== null;

export const signChallenge = (challenge: string) => sign("challenge", challenge, CHALLENGE_MAX_AGE);
export const readChallenge = (value: string | undefined) => verify("challenge", value);
