import Link from "next/link";
import { moveBlock, removeBlock, setBlockMetric, setShowDone, setSummaryMetrics } from "@/app/(app)/actions/blocks";
import { addMetricEntry, addOne, setHideDaily } from "@/app/(app)/actions/metrics";
import { addTask, toggleTask } from "@/app/(app)/actions/tasks";
import type { BlockType } from "@/db/schema";
import { applicableMilestones, daysLeft } from "@/lib/countdown";
import type { BlockRow, GoalRow, MetricWithEntries, TaskRow } from "@/lib/data/goals";
import { formatDay } from "@/lib/dates";
import { formatAmount } from "@/lib/format";
import { maxSafeLossPerWeek } from "@/lib/units";
import {
  currentValue,
  isWeightMetric,
  metricStatus,
  neededPerWeek,
  progressSeries,
  weeklyAverages,
  type MetricShape,
} from "@/lib/metrics";
import { sortOpen, taskWhen } from "@/lib/tasks";
import { MetricChart } from "./metric-chart";
import { Notes } from "./notes";
import { StatusBadge } from "./status-badge";
import { Submit } from "./submit";

export const BLOCK_LABELS: Record<BlockType, string> = {
  countdown: "Countdown",
  metric: "Metric",
  metric_summary: "Metric summary",
  tasks: "Tasks",
  notes: "Notes",
};

type Ctx = { goal: GoalRow; metrics: MetricWithEntries[]; tasks: TaskRow[]; today: string; query?: string };

/** One block on a goal page: a title bar with move and remove controls, then the block's content. */
export function Block({ block, index, count, ctx }: { block: BlockRow; index: number; count: number; ctx: Ctx }) {
  const metric = block.type === "metric" ? ctx.metrics.find((m) => m.id === block.settings.metricId) : undefined;
  const title = metric ? metric.name : BLOCK_LABELS[block.type];
  return (
    <section className="card flex flex-col gap-3" aria-label={title}>
      <div className="flex items-center gap-2">
        <h2 className="h2 min-w-0 flex-1 truncate">
          {metric ? (
            <Link href={`/metrics/${metric.id}`} className="hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        <div className="flex shrink-0 items-center text-muted">
          <form action={moveBlock.bind(null, block.id, -1)}>
            <button className="px-2 py-1 disabled:opacity-30" disabled={index === 0} aria-label={`Move ${title} up`}>
              ↑
            </button>
          </form>
          <form action={moveBlock.bind(null, block.id, 1)}>
            <button className="px-2 py-1 disabled:opacity-30" disabled={index === count - 1} aria-label={`Move ${title} down`}>
              ↓
            </button>
          </form>
          <form action={removeBlock.bind(null, block.id)}>
            <button className="px-2 py-1" aria-label={`Remove ${title} block`} title="Remove block (keeps its data)">
              ×
            </button>
          </form>
        </div>
      </div>
      {block.type === "countdown" && <CountdownBlock goal={ctx.goal} today={ctx.today} />}
      {block.type === "metric" && (metric ? <MetricBlock metric={metric} today={ctx.today} /> : <EmptyMetricBlock block={block} ctx={ctx} />)}
      {block.type === "metric_summary" && <SummaryBlock block={block} ctx={ctx} />}
      {block.type === "tasks" && <TasksBlock block={block} ctx={ctx} />}
      {block.type === "notes" && <Notes parentType="goal" parentId={ctx.goal.id} query={ctx.query} />}
    </section>
  );
}

function CountdownBlock({ goal, today }: { goal: GoalRow; today: string }) {
  if (!goal.targetDate) return <p className="text-sm text-muted">Set a target date in Goal options to start the countdown.</p>;
  const left = daysLeft(goal.targetDate, today);
  const marks = applicableMilestones(goal.milestoneDays, goal.startDate, goal.targetDate);
  return (
    <div className="text-center">
      <p className="text-5xl font-semibold tabular-nums">{left}</p>
      <p className="text-muted">days left · {formatDay(goal.targetDate, { month: "long", day: "numeric", year: "numeric" })}</p>
      {marks.length > 0 && (
        <ol className="mt-3 flex flex-wrap justify-center gap-2">
          {marks.map((m) => (
              <li key={m} className="chip text-xs" data-on={left <= m}>
                {left <= m ? "✓ " : ""}
                {m}
              </li>
            ))}
        </ol>
      )}
    </div>
  );
}

function MetricBlock({ metric, today }: { metric: MetricWithEntries; today: string }) {
  const shape = metric as MetricShape;
  const series = progressSeries(shape, metric.entries);
  const weight = isWeightMetric(metric) && metric.kind === "value";
  const current = currentValue(shape, metric.entries);
  const status = metricStatus(shape, metric.entries, today);
  const needed = neededPerWeek(shape, metric.entries, today);
  const tooFast = weight && needed !== null && -needed > maxSafeLossPerWeek(metric.unit);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <span>
          <span className="text-3xl font-semibold tabular-nums">{formatAmount(current, metric.unit)}</span>
          {weight && <span className="ml-2 text-xs text-muted">7-day average</span>}
        </span>
        <StatusBadge status={status} />
      </div>
      <p className="text-sm text-muted">
        Target {formatAmount(metric.targetValue, metric.unit)} by {formatDay(metric.targetDate, { month: "short", day: "numeric", year: "numeric" })}.
        {needed !== null && status === "behind" && <> New pace: {formatAmount(Math.abs(needed), metric.unit)} a week.</>}
      </p>
      {tooFast && (
        <p className="bg-warm-soft p-3 text-sm">
          That pace is over {maxSafeLossPerWeek(metric.unit)} {metric.unit} a week. A later target date keeps it at a pace that lasts.{" "}
          <Link href={`/metrics/${metric.id}/edit`} className="font-medium underline">
            Change the date
          </Link>
        </p>
      )}
      <MetricChart
        plan={[
          { day: metric.startDate, value: metric.startValue },
          { day: metric.targetDate, value: metric.targetValue },
        ]}
        series={weight ? weeklyAverages(series) : series}
        daily={weight && !metric.hideDailyValues ? series : undefined}
        unit={metric.unit}
        seriesLabel={weight ? "Weekly average" : metric.kind === "count" ? "Total" : "Value"}
      />
      {weight && (
        <form action={setHideDaily.bind(null, metric.id, !metric.hideDailyValues)}>
          <button className="text-sm text-muted underline">{metric.hideDailyValues ? "Show daily values" : "Hide daily values"}</button>
        </form>
      )}
      {metric.kind === "count" ? (
        <form action={addOne.bind(null, metric.id)}>
          <Submit className="btn-primary w-full">+1 {metric.unit}</Submit>
        </form>
      ) : (
        <form action={addMetricEntry} className="flex items-end gap-2">
          <input type="hidden" name="metricId" value={metric.id} />
          <label className="min-w-0 flex-1">
            <span className="label">New value ({metric.unit})</span>
            <input className="field" name="value" type="number" step="any" inputMode="decimal" required />
          </label>
          <label className="w-36">
            <span className="label">Day</span>
            <input className="field" name="day" type="date" defaultValue={today} max={today} required />
          </label>
          <Submit className="btn-primary">Add</Submit>
        </form>
      )}
    </div>
  );
}

function EmptyMetricBlock({ block, ctx }: { block: BlockRow; ctx: Ctx }) {
  return (
    <div className="flex flex-col gap-3">
      <Link href={`/goals/${ctx.goal.id}/metrics/new?blockId=${block.id}`} className="btn-primary">
        Create a metric
      </Link>
      {ctx.metrics.length > 0 && (
        <form action={setBlockMetric.bind(null, block.id)} className="flex gap-2">
          <label className="sr-only" htmlFor={`metric-${block.id}`}>
            Show an existing metric
          </label>
          <select id={`metric-${block.id}`} name="metricId" className="field">
            {ctx.metrics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button className="btn">Show</button>
        </form>
      )}
    </div>
  );
}

function SummaryBlock({ block, ctx }: { block: BlockRow; ctx: Ctx }) {
  const chosen = block.settings.metricIds ?? [];
  const shown = chosen.length ? ctx.metrics.filter((m) => chosen.includes(m.id)) : ctx.metrics;
  return (
    <div className="flex flex-col gap-2">
      {shown.length === 0 ? (
        <p className="text-sm text-muted">No metrics on this goal yet. Add a metric block to create one.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {shown.map((m) => (
            <li key={m.id}>
              <Link href={`/metrics/${m.id}`} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{m.name}</span>
                <span className="flex shrink-0 items-center gap-2 tabular-nums">
                  {formatAmount(currentValue(m as MetricShape, m.entries), m.unit)}
                  <StatusBadge status={metricStatus(m as MetricShape, m.entries, ctx.today)} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {ctx.metrics.length > 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Choose metrics</summary>
          <form action={setSummaryMetrics.bind(null, block.id)} className="mt-2 flex flex-col gap-1">
            {ctx.metrics.map((m) => (
              <label key={m.id} className="flex items-center gap-2">
                <input type="checkbox" name="metricIds" value={m.id} defaultChecked={chosen.includes(m.id)} className="size-4 accent-[var(--accent)]" />
                {m.name}
              </label>
            ))}
            <p className="text-xs text-muted">None checked shows them all.</p>
            <button className="btn mt-1 self-start">Save</button>
          </form>
        </details>
      )}
    </div>
  );
}

function TasksBlock({ block, ctx }: { block: BlockRow; ctx: Ctx }) {
  const open = sortOpen(ctx.tasks);
  const doneTasks = ctx.tasks.filter((t) => t.done).sort((a, b) => (b.doneDate ?? "").localeCompare(a.doneDate ?? ""));
  const showDone = block.settings.showDone ?? false;
  return (
    <div className="flex flex-col gap-3">
      <form action={addTask.bind(null, ctx.goal.id)} className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`task-${block.id}`}>
          New task
        </label>
        <input id={`task-${block.id}`} className="field min-w-0 basis-full sm:basis-0 sm:flex-1" name="title" placeholder="Add a task" maxLength={300} />
        <label className="sr-only" htmlFor={`task-date-${block.id}`}>
          Due date (optional)
        </label>
        <input id={`task-date-${block.id}`} className="field min-w-0 flex-1 sm:w-40 sm:flex-none" name="dueDate" type="date" />
        <Submit className="btn">Add</Submit>
      </form>
      {open.length === 0 && doneTasks.length === 0 && <p className="text-sm text-muted">No tasks yet.</p>}
      <ul className="flex flex-col divide-y divide-line">
        {open.map((t) => (
          <TaskRowItem key={t.id} task={t} today={ctx.today} />
        ))}
      </ul>
      {doneTasks.length > 0 && (
        <div>
          <form action={setShowDone.bind(null, block.id, !showDone)}>
            <button className="text-sm text-muted underline">
              {showDone ? "Hide done" : `Show done (${doneTasks.length})`}
            </button>
          </form>
          {showDone && (
            <ul className="mt-2 flex flex-col divide-y divide-line">
              {doneTasks.map((t) => (
                <TaskRowItem key={t.id} task={t} today={ctx.today} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRowItem({ task, today }: { task: TaskRow; today: string }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <form action={toggleTask.bind(null, task.id)}>
        <button
          className={`flex size-6 items-center justify-center rounded-full border-2 text-xs ${task.done ? "border-accent bg-accent text-accent-ink" : "border-line"}`}
          aria-label={task.done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
        >
          {task.done ? "✓" : ""}
        </button>
      </form>
      <Link href={`/tasks/${task.id}`} className={`min-w-0 flex-1 truncate ${task.done ? "text-muted line-through" : ""}`}>
        {task.title}
      </Link>
      <span className="shrink-0 text-xs text-muted">{task.done ? "" : taskWhen(task, today)}</span>
    </li>
  );
}
