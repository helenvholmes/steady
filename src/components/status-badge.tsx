import type { Status } from "@/lib/metrics";

/** Ahead and on plan in the accent; behind in muted amber with no warning styling. */
export function StatusBadge({ status }: { status: Status }) {
  const style = status === "behind" ? "bg-warm-soft text-warm" : "bg-accent-soft text-ink";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{status}</span>;
}
