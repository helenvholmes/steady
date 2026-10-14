import Link from "next/link";
import { GoalGrid, type GoalCard } from "@/components/goal-grid";
import { daysLeft } from "@/lib/countdown";
import { loadGoalBundles, type GoalBundle } from "@/lib/data/goals";
import { formatDay, formatDayWithOrdinal, localDay } from "@/lib/dates";
import { parseGoalDrawing } from "@/lib/drawings";
import { greeting } from "@/lib/greeting";
import { getSettings } from "@/lib/settings";

export default async function HomePage() {
  const today = localDay();
  const [bundles, settings] = await Promise.all([loadGoalBundles(), getSettings()]);
  const active = bundles.filter((b) => b.goal.status === "active");
  const future = bundles.filter((b) => b.goal.status === "future");
  const closed = bundles.filter((b) => b.goal.status === "completed" || b.goal.status === "archived");

  const card = ({ goal, progress }: GoalBundle): GoalCard => ({
    id: goal.id,
    name: goal.name,
    drawing: parseGoalDrawing(goal.drawing),
    progress,
    daysLeft: goal.targetDate && goal.status === "active" ? daysLeft(goal.targetDate, today) : null,
    startBy: goal.startByDate
      ? goal.startByDate <= today
        ? "Ready to start"
        : `Start by ${formatDay(goal.startByDate, { month: "long", year: "numeric" })}`
      : null,
  });


  return (
    <div className="flex flex-col gap-6">
      {/* Inset by the cards' padding, so the greeting lines up with the drawings and Settings with the bars' right ends. */}
      <header className="flex items-center justify-between gap-3 px-4">
        <div>
          {/* A different salutation on each load, twice the usual heading size and upright; the date under it is
              the italic line. A bit smaller on a phone, where the longer ones would crowd the buttons. */}
          <h1 className="h1 text-[3rem] leading-[1.05] not-italic sm:text-[4rem]">{greeting(settings.userName)}</h1>
          <p className="mt-1 text-muted italic">{formatDayWithOrdinal(today)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/goals/new" className="btn-soft min-h-10">
            New goal
          </Link>
          <Link href="/settings" className="text-sm text-muted">
            Settings
          </Link>
        </div>
      </header>

      {active.length === 0 && future.length === 0 ? (
        <section className="card text-center">
          <p className="font-medium">No goals yet.</p>
          <p className="mt-1 text-sm text-muted">Create one, name it, and build it from blocks: numbers, tasks, dates, and notes.</p>
          <Link href="/goals/new" className="btn-primary mt-4">
            New goal
          </Link>
        </section>
      ) : (
        <GoalGrid status="active" cards={active.map(card)} />
      )}

      {future.length > 0 && (
        <section aria-labelledby="future-h">
          <h2 id="future-h" className="mb-2 text-sm font-medium text-muted">
            Future goals
          </h2>
          <GoalGrid status="future" cards={future.map(card)} />
        </section>
      )}

      {closed.length > 0 && (
        <section aria-labelledby="closed-h" className="opacity-60">
          <h2 id="closed-h" className="mb-2 text-sm font-medium text-muted">
            Completed and archived
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {closed.map(({ goal }) => (
              <li key={goal.id}>
                <Link href={`/goals/${goal.id}`} className="card card-lift flex flex-col gap-1">
                  <span className="font-medium">
                    {goal.status === "completed" && <span aria-label="Completed">🎉 </span>}
                    {goal.name}
                  </span>
                  <span className="text-xs text-muted">
                    {goal.status === "completed" && goal.completedDate
                      ? `Completed ${formatDay(goal.completedDate, { month: "short", day: "numeric", year: "numeric" })}`
                      : "Archived"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
