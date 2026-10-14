// Passwordless sign-in for local development only, so the Claude browser pane (which can't reach
// the Keychain passkey) can open signed-in pages. Off unless every condition holds.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

type Env = Record<string, string | undefined>;

/** Turned on in this environment: `next dev`, not on Vercel, and STEADY_DEV_LOGIN=1 in .env.local. */
export function devLoginEnabled(env: Env = process.env) {
  return env.NODE_ENV === "development" && !env.VERCEL && env.STEADY_DEV_LOGIN === "1";
}

/** Enabled, and the request is addressed to this machine. */
export function devLoginAllowed(hostname: string, env: Env = process.env) {
  return devLoginEnabled(env) && LOCAL_HOSTS.has(hostname);
}
