"use client";

import { useActionState, useState } from "react";
import { createGoal, type GoalFormState } from "@/app/(app)/actions/goals";

export function NewGoalForm({ initialStatus }: { initialStatus: "active" | "future" }) {
  const [state, action, pending] = useActionState<GoalFormState, FormData>(createGoal, null);
  const [status, setStatus] = useState(initialStatus);
  return (
    <form action={action} className="flex flex-col gap-5">
      <label>
        <span className="label">Name</span>
        <input className="field" name="name" placeholder="e.g. Run a half marathon" autoFocus required maxLength={120} />
      </label>

      <fieldset className="flex gap-2">
        <legend className="label">When</legend>
        {(
          [
            ["active", "Working on it now"],
            ["future", "Later (future goal)"],
          ] as const
        ).map(([value, text]) => (
          <label key={value} className="chip flex-1 justify-center rounded-none py-2 has-checked:border-accent has-checked:bg-accent-soft">
            <input type="radio" name="status" value={value} checked={status === value} onChange={() => setStatus(value)} className="sr-only" />
            {text}
          </label>
        ))}
      </fieldset>

      <label>
        <span className="label">Target date (optional, shows a countdown)</span>
        <input className="field" name="targetDate" type="date" />
      </label>

      {status === "future" && (
        <label>
          <span className="label">Start by (optional)</span>
          <input className="field" name="startByDate" type="date" />
        </label>
      )}

      {state?.error && <p className="bg-warm-soft p-3 text-sm">{state.error}</p>}
      <button className="btn-primary" disabled={pending}>
        Create goal
      </button>
      <p className="text-sm text-muted">It starts with tasks and notes. Add numbers and other blocks on the goal page.</p>
    </form>
  );
}
