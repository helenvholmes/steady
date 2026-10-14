"use client";

import { useActionState, useRef } from "react";
import { saveMetric, type MetricFormState } from "@/app/(app)/actions/metrics";

export type MetricValues = {
  id?: number;
  goalId: number;
  blockId?: number;
  name: string;
  kind: "value" | "count";
  unit: string;
  startValue: number | "";
  targetValue: number | "";
  startDate: string;
  targetDate: string;
  checkInFrequency: "daily" | "weekly" | "monthly";
  milestoneStepPct: number;
};

/** `units`: suggestions for the unit field, from Settings (currency, lb or kg, then counts). */
export function MetricForm({ metric: initial, units }: { metric: MetricValues; units: string[] }) {
  const [state, action, pending] = useActionState<MetricFormState, FormData>(saveMetric, null);
  const targetDate = useRef<HTMLInputElement>(null);
  // After a refused save, show what was typed (React resets the form to these defaults).
  const goal = state?.values ? ({ ...initial, ...state.values } as unknown as MetricValues) : initial;

  return (
    <form action={action} className="flex flex-col gap-4">
      {goal.id && <input type="hidden" name="id" value={goal.id} />}
      <input type="hidden" name="goalId" value={goal.goalId} />
      {goal.blockId && <input type="hidden" name="blockId" value={goal.blockId} />}
      <label>
        <span className="label">Name</span>
        <input className="field" name="name" defaultValue={goal.name} placeholder="e.g. Savings" required />
      </label>

      <fieldset className="flex gap-2">
        <legend className="label">Kind</legend>
        {(
          [
            ["value", "A number I check (balance, weight)"],
            ["count", "A count that goes up (places, books)"],
          ] as const
        ).map(([k, text]) => (
          <label key={k} className="chip flex-1 rounded-none py-2 has-checked:border-accent has-checked:bg-accent-soft">
            <input type="radio" name="kind" value={k} defaultChecked={goal.kind === k} className="sr-only" />
            {text}
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-3 gap-3">
        <label>
          <span className="label">Unit</span>
          <input className="field" name="unit" list="units" defaultValue={goal.unit} required />
          <datalist id="units">
            {units.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </label>
        <label>
          <span className="label">Start</span>
          <input className="field" name="startValue" type="number" step="any" inputMode="decimal" defaultValue={goal.startValue} required />
        </label>
        <label>
          <span className="label">Target</span>
          <input className="field" name="targetValue" type="number" step="any" inputMode="decimal" defaultValue={goal.targetValue} required />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">Start date</span>
          <input className="field" name="startDate" type="date" defaultValue={goal.startDate} required />
        </label>
        <label>
          <span className="label">Target date</span>
          <input ref={targetDate} className="field" name="targetDate" type="date" defaultValue={goal.targetDate} required />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">Check in</span>
          <select className="field" name="checkInFrequency" defaultValue={goal.checkInFrequency}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label>
          <span className="label">Milestone every</span>
          <select className="field" name="milestoneStepPct" defaultValue={goal.milestoneStepPct}>
            <option value={10}>10%</option>
            <option value={20}>20%</option>
            <option value={25}>25%</option>
            <option value={50}>50%</option>
            <option value={0}>No milestones</option>
          </select>
        </label>
      </div>

      {state?.error && (
        <div className="bg-warm-soft p-3 text-sm">
          <p>{state.error}</p>
          {state.earliestDate && (
            <button
              type="button"
              className="mt-2 font-medium underline"
              onClick={() => {
                if (targetDate.current) targetDate.current.value = state.earliestDate!;
              }}
            >
              Use that date
            </button>
          )}
        </div>
      )}

      <button className="btn-primary" disabled={pending}>
        {goal.id ? "Save metric" : "Add metric"}
      </button>
    </form>
  );
}
