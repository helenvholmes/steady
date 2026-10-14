import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Header } from "@/components/header";
import { MetricForm } from "@/components/metric-form";
import { addDays, localDay } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { unitSuggestions } from "@/lib/units";

export const metadata = { title: "New metric" };

export default async function NewMetricPage({ params, searchParams }: PageProps<"/goals/[id]/metrics/new">) {
  const { id } = await params;
  const { blockId } = await searchParams;
  const goal = await db.query.goals.findFirst({ where: eq(schema.goals.id, Number(id)) });
  if (!goal) notFound();
  const settings = await getSettings();
  const today = localDay();
  return (
    <div className="mx-auto max-w-xl">
      <Header title="New metric" back={`/goals/${goal.id}`} />
      <p className="mb-4 text-sm text-muted">A number with a target, measured inside “{goal.name}”.</p>
      <MetricForm
        units={unitSuggestions(settings)}
        metric={{
          goalId: goal.id,
          blockId: Number(blockId) || undefined,
          name: "",
          kind: "value",
          unit: settings.currency,
          startValue: "",
          targetValue: "",
          startDate: today,
          targetDate: goal.targetDate && goal.targetDate > today ? goal.targetDate : addDays(today, 365),
          checkInFrequency: "weekly",
          milestoneStepPct: 10,
        }}
      />
    </div>
  );
}
