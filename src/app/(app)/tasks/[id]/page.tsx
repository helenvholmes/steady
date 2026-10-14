import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Header } from "@/components/header";
import { Submit } from "@/components/submit";
import { deleteTask, saveTask, toggleTask } from "../../actions/tasks";

export const metadata = { title: "Task" };

export default async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  const task = await db.query.tasks.findFirst({ where: eq(schema.tasks.id, Number(id)) });
  if (!task) notFound();
  const [goal, metrics] = await Promise.all([
    db.query.goals.findFirst({ where: eq(schema.goals.id, task.goalId) }),
    db.select({ id: schema.metrics.id, name: schema.metrics.name }).from(schema.metrics).where(eq(schema.metrics.goalId, task.goalId)),
  ]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Header title="Task" back={`/goals/${task.goalId}`} />
      {goal && <p className="-mt-2 text-sm text-muted">{goal.name}</p>}
      <form action={saveTask} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={task.id} />
        <label>
          <span className="label">Title</span>
          <input className="field" name="title" defaultValue={task.title} required maxLength={300} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Start (optional)</span>
            <input className="field" type="date" name="startDate" defaultValue={task.startDate ?? ""} />
          </label>
          <label>
            <span className="label">Due</span>
            <input className="field" type="date" name="dueDate" defaultValue={task.dueDate ?? ""} />
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="remindDayBefore" defaultChecked={task.remindDayBefore} className="size-5 accent-[var(--accent)]" />
          Remind me the day before
        </label>
        {metrics.length > 0 && (
          <label>
            <span className="label">Linked metric (optional)</span>
            <select className="field" name="metricId" defaultValue={task.metricId ?? ""}>
              <option value="">None</option>
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="label">Notes</span>
          <textarea className="field min-h-24 py-2" name="notes" defaultValue={task.notes ?? ""} />
        </label>
        <Submit>Save</Submit>
      </form>
      <div className="flex gap-2">
        <form action={toggleTask.bind(null, task.id)} className="flex-1">
          <button className="btn w-full">{task.done ? "Mark not done" : "Mark done"}</button>
        </form>
        <form action={deleteTask.bind(null, task.id)} className="flex-1">
          <button className="btn w-full text-muted">Delete</button>
        </form>
      </div>
    </div>
  );
}
