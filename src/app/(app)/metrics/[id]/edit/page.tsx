import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Header } from "@/components/header";
import { MetricForm } from "@/components/metric-form";
import { getSettings } from "@/lib/settings";
import { unitSuggestions } from "@/lib/units";
import { deleteMetric } from "../../../actions/metrics";

export default async function EditMetricPage({ params }: PageProps<"/metrics/[id]/edit">) {
  const { id } = await params;
  const metric = await db.query.metrics.findFirst({ where: eq(schema.metrics.id, Number(id)) });
  if (!metric) notFound();
  const settings = await getSettings();
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Header title="Edit metric" back={`/metrics/${metric.id}`} />
      <MetricForm metric={metric} units={unitSuggestions(settings)} />
      <form action={deleteMetric.bind(null, metric.id)}>
        <button className="btn w-full text-muted">Delete metric and its entries</button>
      </form>
    </div>
  );
}
