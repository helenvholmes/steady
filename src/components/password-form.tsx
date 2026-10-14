"use client";

import { useActionState, useRef, useState } from "react";
import { removePassword, setPassword, type PasswordState } from "@/app/(app)/actions/settings";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";
import { ConfirmDialog } from "./confirm-dialog";

/** Set, change, or remove the sign-in password. */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(setPassword, null);
  const [removeState, remove, removing] = useActionState<PasswordState, FormData>(removePassword, null);
  const result = removeState ?? state;
  const removeForm = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-col gap-3">
        {hasPassword && (
          <label>
            <span className="label">Current password</span>
            <input className="field" type="password" name="current" autoComplete="current-password" required />
          </label>
        )}
        <label>
          <span className="label">{hasPassword ? "New password" : "Password"}</span>
          <input className="field" type="password" name="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
        </label>
        <label>
          <span className="label">Confirm</span>
          <input className="field" type="password" name="confirm" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
        </label>
        <p className="text-xs text-muted">
          At least {MIN_PASSWORD_LENGTH} characters. A password works alongside your passkey; after 10 wrong tries in 15 minutes, password sign-in
          pauses.
        </p>
        <button className="btn self-start" disabled={pending}>
          {hasPassword ? "Change password" : "Set password"}
        </button>
      </form>
      {hasPassword && (
        <form ref={removeForm} action={remove} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <label className="min-w-0 flex-1">
            <span className="label">Remove the password (current password)</span>
            <input className="field" type="password" name="current" autoComplete="current-password" required />
          </label>
          {/* Checks the field first, then asks before submitting. */}
          <button type="button" className="btn text-muted" disabled={removing} onClick={() => removeForm.current?.reportValidity() && setConfirming(true)}>
            Remove password
          </button>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Remove your password?"
            description="You'll sign in with your passkey only. You can set a new password here at any time."
            confirmLabel="Remove password"
            onConfirm={() => removeForm.current?.requestSubmit()}
          />
        </form>
      )}
      {result?.error && <p className="text-sm text-warm">{result.error}</p>}
      {result?.message && <p className="text-sm text-accent">{result.message}</p>}
    </div>
  );
}
