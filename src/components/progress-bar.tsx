"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { Popover } from "radix-ui";
import { useEffect, useId, useState } from "react";
import { resetWeights, setWeight } from "@/app/(app)/actions/metrics";
import type { Progress } from "@/lib/progress";
import NumberTicker from "./fancy/basic-number-ticker";

const pct = (n: number) => `${Math.round(n * 100)}%`;

// The tooltip springs up from the marker, modeled on Animate UI's tooltip (animate-ui.com); written here, not copied
// (see confirm-dialog.tsx).
const SPRING = { type: "spring", stiffness: 300, damping: 35 } as const;

/**
 * The goal page's progress bar. Hovering or focusing the end marker (tapping it on iPhone) shows a tooltip of one
 * or two sentences on how the bar is calculated. With more than one input, "Adjust weights" opens the weights.
 */
export function ProgressBar({
  progress,
  explanation,
  goalId,
  aiOn,
}: {
  progress: Progress;
  /** From explainProgress: AI's summary, or a plain sentence from the weights. */
  explanation: string;
  goalId: number;
  aiOn: boolean;
}) {
  const [tip, setTip] = useState(false);
  const tipId = useId();
  const { fraction, expected, inputs } = progress;
  // The bar, its end dot, and the number (Fancy Components' NumberTicker) count up together when the page loads.
  const reduced = useReducedMotion();
  const tick = { duration: reduced ? 0 : 0.6, type: "tween", ease: "easeInOut" } as const;

  useEffect(() => {
    if (!tip) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTip(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tip]);

  // The tooltip leans toward the middle near either end, so it stays inside the bar's width; its arrow stays on
  // the marker.
  const lean = Math.min(0.9, Math.max(0.1, fraction));

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex items-center gap-3">
        <div className="relative h-2.5 flex-1 rounded-full bg-[var(--track)]">
          <motion.div className="h-2.5 rounded-full bg-accent" initial={{ width: "0%" }} animate={{ width: pct(fraction) }} transition={tick} />
          {inputs.length > 0 && (
            <span
              className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted"
              style={{ left: pct(expected) }}
              title={`Plan: ${pct(expected)} by today`}
              aria-hidden
            />
          )}
          <motion.button
            type="button"
            initial={{ left: "0%" }}
            animate={{ left: pct(fraction) }}
            transition={tick}
            className="absolute top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
            aria-label={`Progress ${pct(fraction)}`}
            aria-describedby={tipId}
            onMouseEnter={() => setTip(true)}
            onMouseLeave={() => setTip(false)}
            onFocus={() => setTip(true)}
            onBlur={() => setTip(false)}
            onClick={() => setTip(true)}
          >
            <span className="size-3.5 rounded-full border-2 border-surface bg-accent" />
          </motion.button>
          <span id={tipId} className="sr-only">
            {explanation}
          </span>

          <AnimatePresence>
            {tip && (
              <motion.div
                key="tip"
                className="pointer-events-none absolute bottom-6 z-20 w-max max-w-64"
                style={{ left: pct(fraction), x: `-${lean * 100}%` }}
                aria-hidden
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0, y: 15 }}
                  transition={SPRING}
                  style={{ originX: lean, originY: 1 }}
                  className="relative rounded-md bg-ink px-3 py-1.5 text-sm leading-snug text-balance text-surface"
                >
                  {explanation}
                  <svg
                    viewBox="0 0 12 6"
                    width="12"
                    height="6"
                    className="absolute top-full -translate-x-1/2 fill-ink"
                    style={{ left: `${lean * 100}%` }}
                  >
                    <path d="M0 0h12L7.4 5.1a2 2 0 0 1-2.8 0z" />
                  </svg>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Keyed on the value, so a changed weight counts again from 0 (the ticker runs once per mount). */}
        <span className="w-10 text-right text-sm font-medium tabular-nums">
          <NumberTicker key={fraction} from={0} target={Math.round(fraction * 100)} transition={tick} />%
        </span>
      </div>
      {inputs.length > 1 && <WeightsPopover progress={progress} goalId={goalId} aiOn={aiOn} />}
    </MotionConfig>
  );
}

/** Each input's weight, editable. A changed weight is kept; the others rescale around it. */
function WeightsPopover({ progress, goalId, aiOn }: { progress: Progress; goalId: number; aiOn: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="mt-1 flex justify-end">
        <Popover.Trigger className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline">Adjust weights</Popover.Trigger>
      </div>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild forceMount align="end" sideOffset={6} collisionPadding={16}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -6 }}
                transition={SPRING}
                style={{ originX: 1, originY: 0 }}
                className="z-30 w-72 rounded-lg border border-line bg-surface p-3 text-sm shadow-[var(--lift-shadow)]"
              >
                <ul className="flex flex-col gap-2">
                  {progress.inputs.map((i) => (
                    <li key={i.key}>
                      <form action={setWeight.bind(null, goalId, i.key)} className="flex items-center gap-2">
                        <label htmlFor={`${id}-${i.key}`} className="min-w-0 flex-1 truncate" title={i.reason ?? undefined}>
                          {i.label}
                        </label>
                        <input
                          id={`${id}-${i.key}`}
                          name="percent"
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          inputMode="numeric"
                          defaultValue={Math.round(i.weight * 100)}
                          className="field min-h-8 w-16 px-2 text-sm"
                        />
                        <span className="text-muted">%</span>
                        <button className="text-xs font-medium text-accent">Set</button>
                      </form>
                    </li>
                  ))}
                </ul>
                {progress.userAdjusted && (
                  <form action={resetWeights.bind(null, goalId)} className="mt-3 border-t border-line pt-2">
                    <button className="text-xs font-medium text-accent">{aiOn ? "Reset to AI weights" : "Reset weights"}</button>
                  </form>
                )}
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}
