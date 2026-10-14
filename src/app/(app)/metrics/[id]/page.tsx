import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Header } from "@/components/header";
import { Notes } from "@/components/notes";
import { formatDay } from "@/lib/dates";
import { formatAmount } from "@/lib/format";
import { deleteMetricEntry } from "../../actions/metrics";

export default async function MetricPage({ params, searchParams }: PageProps<"/metrics/[id]">) {
  const { id } = await params;
  const { q } = await searchParams;
  const metric = await db.query.metrics.findFirst({ where: eq(schema.metrics.id, Number(id)) });
  if (!metric) notFound();
  const [entries, milestones] = await Promise.all([
    db.select().from(schema.metricEntries).where(eq(schema.metricEntries.metricId, metric.id)).orderBy(asc(schema.metricEntries.day)),
    db.select().from(schema.milestones).where(eq(schema.milestones.metricId, metric.id)).orderBy(asc(schema.milestones.id)),
  ]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Header
        title={metric.name}
        back={`/goals/${metric.goalId}`}
        action={
          <Link href={`/metrics/${metric.id}/edit`} className="text-sm text-muted">
            Edit
          </Link>
        }
      />
      <p className="text-sm text-muted">
        {formatAmount(metric.startValue, metric.unit)} on {formatDay(metric.startDate, { month: "short", day: "numeric", year: "numeric" })} →{" "}
        {formatAmount(metric.targetValue, metric.unit)} by {formatDay(metric.targetDate, { month: "short", day: "numeric", year: "numeric" })} · checks in{" "}
        {metric.checkInFrequency}
      </p>

      {milestones.length > 0 && (
        <section>
          <h2 className="h2 mb-2">Milestones</h2>
          <ul className="card flex flex-col divide-y divide-line py-1 text-sm">
            {milestones.map((m) => (
              <li key={m.id} className="flex justify-between py-2 tabular-nums">
                <span className={m.reachedDate ? "font-medium" : "text-muted"}>
                  {m.reachedDate ? "✓ " : ""}
                  {formatAmount(m.value, metric.unit)}
                </span>
                <span className="text-muted">{m.reachedDate ? formatDay(m.reachedDate) : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="h2 mb-2">Entries</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">No entries yet. Add one from the goal page.</p>
        ) : (
          <ul className="card flex flex-col divide-y divide-line py-1 text-sm">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="flex items-center justify-between py-1.5 tabular-nums">
                <span className="text-muted">{formatDay(e.day)}</span>
                <span className="flex items-center gap-3">
                  {metric.kind === "count" ? `+${formatAmount(e.value, metric.unit)}` : formatAmount(e.value, metric.unit)}
                  <form action={deleteMetricEntry.bind(null, e.id, metric.id)}>
                    <button className="px-1 text-muted" aria-label={`Delete entry from ${formatDay(e.day)}`}>
                      ×
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="h2 mb-2">Notes</h2>
        <Notes parentType="metric" parentId={metric.id} query={typeof q === "string" ? q : undefined} />
      </section>
    </div>
  );
}
