"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/** Turns web push on or off for this device. On iPhone this only works from the Home Screen app. */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<"loading" | "unsupported" | "off" | "on" | "denied">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setMessage("");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
    setState(res.ok ? "on" : "off");
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
  }

  async function test() {
    const res = await fetch("/api/push", { method: "PUT" });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? `Sent to ${data.delivered} device(s).` : "Couldn't send. Check the VAPID settings.");
  }

  if (!publicKey) return <p className="text-sm text-muted">Push keys aren&apos;t set on the server yet.</p>;
  if (state === "loading") return null;
  if (state === "unsupported")
    return <p className="text-sm text-muted">On iPhone, add Steady to the Home Screen and open it from there to turn on notifications.</p>;
  if (state === "denied") return <p className="text-sm text-muted">Notifications are blocked for Steady in system settings.</p>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === "on" ? (
        <>
          <span className="text-sm">On for this device.</span>
          <button type="button" className="btn" onClick={test}>
            Send a test
          </button>
          <button type="button" className="btn text-muted" onClick={disable}>
            Turn off
          </button>
        </>
      ) : (
        <button type="button" className="btn-primary" onClick={enable}>
          Turn on notifications
        </button>
      )}
      {message && <p className="w-full text-sm text-muted">{message}</p>}
    </div>
  );
}
