import type { Progress } from "@/lib/progress";

/**
 * A plain progress bar for the home screen: the fill and an end dot, nothing to open. The explanation and the plan
 * tick live on the goal page (ProgressBar), where there's room to say what they mean.
 */
export function ProgressMeter({ progress, size = "md" }: { progress: Progress; size?: "sm" | "md" }) {
  const width = `${Math.round(progress.fraction * 100)}%`;
  const height = size === "sm" ? "h-2" : "h-2.5";
  return (
    <div
      className={`relative ${height} rounded-full bg-[var(--track)]`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress.fraction * 100)}
      aria-label="Progress"
    >
      <div className={`${height} rounded-full bg-accent`} style={{ width }} />
      <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent" style={{ left: width }} />
    </div>
  );
}
