import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { AddBlockMenu } from "@/components/add-block-menu";
import { Block } from "@/components/blocks";
import { EditableTitle } from "@/components/editable-title";
import { DrawingEditor } from "@/components/drawing-editor";
import { ProgressBar } from "@/components/progress-bar";
import { Submit } from "@/components/submit";
import { durationText } from "@/lib/completion";
import { loadGoal } from "@/lib/data/goals";
import { formatDay, localDay } from "@/lib/dates";
import { formatAmount } from "@/lib/format";
import { currentValue, type MetricShape } from "@/lib/metrics";
import { aiConfigured } from "@/lib/ai-weights";
import { explainProgress } from "@/lib/progress";
import { parseGoalDrawing } from "@/lib/drawings";
import { getSettings } from "@/lib/settings";
import { renameGoal, setGoalStatus, updateGoalDates } from "../../actions/goals";

export default async function GoalPage({ params, searchParams }: PageProps<"/goals/[id]">) {
  const { id } = await params;
  const { q } = await searchParams;
  const data = await loadGoal(Number(id));
  if (!data) notFound();
  const { goal, metrics, tasks, progress, blocks } = data;
  const [settings, [{ notesCount }]] = await Promise.all([
    getSettings(),
    db.select({ notesCount: count() }).from(schema.notes).where(and(eq(schema.notes.parentType, "goal"), eq(schema.notes.parentId, goal.id))),
  ]);
  const today = localDay();
  const ctx = { goal, metrics, tasks, today, query: typeof q === "string" ? q : undefined };
  const longDay = (d: string) => formatDay(d, { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className={`mx-auto flex max-w-2xl flex-col gap-4 ${goal.status === "archived" ? "opacity-80" : ""}`}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-4">
        <Link href="/" className="-ml-2 px-2 py-2 text-accent" aria-label="Back to goals">
          ‹
        </Link>
        {goal.status === "completed" && (
          <span className="text-2xl" aria-label="Completed">
            🎉
          </span>
        )}
        {/* The drawing sits left of the title; "Add a drawing" and the editor panel come after it. */}
        <DrawingEditor goalId={goal.id} initial={parseGoalDrawing(goal.drawing)} />
        <EditableTitle name={goal.name} action={renameGoal.bind(null, goal.id)} />
        <AddBlockMenu goalId={goal.id} />
      </header>

      {goal.status === "completed" && goal.completedDate && (
        <section className="card flex flex-col gap-3 border-accent bg-accent-soft" aria-label="Completion summary">
          <p>
            Completed {longDay(goal.completedDate)}, after{" "}
            <span className="font-semibold">{durationText(goal.startDate, goal.completedDate)}</span>.
          </p>
          {metrics.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {metrics.map((m) => (
                <li key={m.id} className="flex justify-between gap-2">
                  <span>{m.name}</span>
                  <span className="tabular-nums">
                    {formatAmount(m.startValue, m.unit)} → {formatAmount(currentValue(m as MetricShape, m.entries), m.unit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted">
            {tasks.filter((t) => t.done).length} tasks done · {notesCount} notes written
          </p>
          {goal.highlights && <p className="whitespace-pre-wrap">{goal.highlights}</p>}
        </section>
      )}

      {goal.status === "future" && (
        <section className="card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Future goal{goal.startByDate ? ` · ${goal.startByDate <= today ? "ready to start" : `start by ${longDay(goal.startByDate)}`}` : ""}. It stays
            quiet until you start it.
          </p>
          <form action={setGoalStatus.bind(null, goal.id, "start")}>
            <Submit className="btn-primary">Start this goal</Submit>
          </form>
        </section>
      )}

      {progress && (
        <section className="card" aria-label="Progress">
          <ProgressBar
            progress={progress}
            explanation={explainProgress(progress, goal.weightsSummary)}
            goalId={goal.id}
            aiOn={settings.ai.weights && aiConfigured()}
          />
        </section>
      )}

      {blocks.map((block, i) => (
        <Block key={block.id} block={block} index={i} count={blocks.length} ctx={ctx} />
      ))}

      <details className="card">
        <summary className="cursor-pointer font-medium">Goal options</summary>
        <form action={updateGoalDates.bind(null, goal.id)} className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="label">Target date</span>
              <input className="field" type="date" name="targetDate" defaultValue={goal.targetDate ?? ""} />
            </label>
            {goal.status === "future" && (
              <label>
                <span className="label">Start by</span>
                <input className="field" type="date" name="startByDate" defaultValue={goal.startByDate ?? ""} />
              </label>
            )}
          </div>
          <label>
            <span className="label">Countdown milestones (days left, comma-separated)</span>
            <input className="field" name="milestoneDays" defaultValue={goal.milestoneDays.join(", ")} />
          </label>
          <Submit className="btn self-start">Save</Submit>
        </form>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {goal.status === "active" && (
            <>
              <form action={setGoalStatus.bind(null, goal.id, "complete")}>
                <button className="btn-primary">Mark complete 🎉</button>
              </form>
              <form action={setGoalStatus.bind(null, goal.id, "pause")}>
                <button className="btn">Pause for later</button>
              </form>
            </>
          )}
          {(goal.status === "active" || goal.status === "future") && (
            <form action={setGoalStatus.bind(null, goal.id, "archive")}>
              <button className="btn text-muted">Archive</button>
            </form>
          )}
          {(goal.status === "completed" || goal.status === "archived") && (
            <form action={setGoalStatus.bind(null, goal.id, "reopen")}>
              <button className="btn">{goal.status === "completed" ? "Reopen" : "Restore"}</button>
            </form>
          )}
        </div>
      </details>
    </div>
  );
}
