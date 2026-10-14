"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";

export function AccountActions() {
  const [message, setMessage] = useState("");

  async function addPasskey() {
    setMessage("");
    try {
      const options = await fetch("/api/auth/register/options", { method: "POST", body: "{}" }).then((r) => r.json());
      const response = await startRegistration({ optionsJSON: options });
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, deviceName: navigator.platform }),
      });
      setMessage(res.ok ? "Passkey added." : "That passkey couldn't be added.");
    } catch (e) {
      if ((e as Error).name !== "NotAllowedError") setMessage((e as Error).message);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn" onClick={addPasskey}>
        Add a passkey
      </button>
      <button type="button" className="btn text-muted" onClick={signOut}>
        Sign out
      </button>
      {message && <p className="w-full text-sm text-muted">{message}</p>}
    </div>
  );
}
