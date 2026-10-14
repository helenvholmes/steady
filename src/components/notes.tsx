import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { deleteNote, saveNote } from "@/app/(app)/actions/notes";
import { formatDay, localDay } from "@/lib/dates";
import { Submit } from "./submit";

/** Dated notes for a countdown or goal, newest first, with search. Notes never go to notifications or the widget. */
export async function Notes({ parentType, parentId, query }: { parentType: "goal" | "metric"; parentId: number; query?: string }) {
  const all = await db
    .select()
    .from(schema.notes)
    .where(and(eq(schema.notes.parentType, parentType), eq(schema.notes.parentId, parentId)))
    .orderBy(desc(schema.notes.day), desc(schema.notes.id));
  // Text is encrypted in the database, so search happens after decryption.
  const q = query?.trim().toLowerCase();
  const notes = q ? all.filter((n) => n.text.toLowerCase().includes(q)) : all;

  return (
    <section className="flex flex-col gap-3">
      <form action={saveNote} className="card flex flex-col gap-2">
        <input type="hidden" name="parentType" value={parentType} />
        <input type="hidden" name="parentId" value={parentId} />
        <input type="hidden" name="day" value={localDay()} />
        <textarea className="field min-h-20 py-2" name="text" placeholder="Ideas, details, things to remember…" required />
        <Submit className="btn-soft">Add note</Submit>
      </form>
      {all.length > 3 && (
        <form className="flex gap-2">
          <input className="field" name="q" type="search" defaultValue={query} placeholder="Search notes" />
        </form>
      )}
      {notes.map((n) => (
        <details key={n.id} className="card">
          <summary className="cursor-pointer list-none">
            <span className="block text-xs text-muted">{formatDay(n.day, { month: "short", day: "numeric", year: "numeric" })}</span>
            <span className="whitespace-pre-wrap">{n.text}</span>
          </summary>
          <form action={saveNote} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="id" value={n.id} />
            <input type="hidden" name="parentType" value={parentType} />
            <input type="hidden" name="parentId" value={parentId} />
            <input className="field" type="date" name="day" defaultValue={n.day} />
            <textarea className="field min-h-20 py-2" name="text" defaultValue={n.text} required />
            <div className="flex gap-2">
              <Submit className="btn-soft flex-1">Save</Submit>
              <button formAction={deleteNote.bind(null, n.id)} className="btn text-muted">
                Delete
              </button>
            </div>
          </form>
        </details>
      ))}
      {q && notes.length === 0 && <p className="text-sm text-muted">No notes match.</p>}
    </section>
  );
}
