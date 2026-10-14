"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

export function LoginForm({
  hasPasskey,
  hasPassword,
  needsCode,
  devLogin,
  next,
}: {
  hasPasskey: boolean;
  hasPassword: boolean;
  needsCode: boolean;
  devLogin: boolean;
  next: string;
}) {
  const [mode, setMode] = useState<"signin" | "register">(hasPasskey || hasPassword ? "signin" : "register");
  const [password, setPassword] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      window.location.replace(next);
    } catch (e) {
      // NotAllowedError: the person cancelled the passkey sheet. Not worth a message.
      if ((e as Error).name !== "NotAllowedError") setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const signIn = () =>
    run(async () => {
      const optionsJSON = await post("/api/auth/login/options", {});
      await post("/api/auth/login/verify", { response: await startAuthentication({ optionsJSON }) });
    });

  const register = () =>
    run(async () => {
      const optionsJSON = await post("/api/auth/register/options", { setupCode });
      const response = await startRegistration({ optionsJSON });
      await post("/api/auth/register/verify", { response, setupCode, deviceName: navigator.platform });
    });

  return (
    <div className="flex flex-col gap-3">
      {mode === "signin" ? (
        <>
          {hasPassword && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => post("/api/auth/password", { password }));
              }}
            >
              <label>
                <span className="label">Password</span>
                <input
                  className="field"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <button className="btn-primary" disabled={busy || !password}>
                Sign in
              </button>
            </form>
          )}
          {hasPasskey && (
            <button className={hasPassword ? "btn" : "btn-primary"} onClick={signIn} disabled={busy}>
              Sign in with passkey
            </button>
          )}
          <button className="text-sm text-muted underline" onClick={() => setMode("register")}>
            Add this device with the setup code
          </button>
        </>
      ) : (
        <>
          {needsCode && (
            <label>
              <span className="label">Setup code</span>
              <input className="field" type="password" autoComplete="off" value={setupCode} onChange={(e) => setSetupCode(e.target.value)} />
            </label>
          )}
          <button className="btn-primary" onClick={register} disabled={busy || (needsCode && !setupCode)}>
            Create passkey
          </button>
          {hasPasskey && (
            <button className="text-sm text-muted underline" onClick={() => setMode("signin")}>
              Back to sign in
            </button>
          )}
        </>
      )}
      {devLogin && (
        <button className="text-sm text-muted underline" onClick={() => run(() => post("/api/auth/dev", {}))} disabled={busy}>
          Sign in without passkey (local dev)
        </button>
      )}
      {error && <p className="text-sm text-warm">{error}</p>}
    </div>
  );
}
