"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { dayStr, done, fields, optId } from "./form";

const NoteForm = z.object({
  id: optId,
  parentType: z.enum(["goal", "metric"]),
  parentId: z.coerce.number().int().positive(),
  day: dayStr,
  text: z.string().trim().max(5000),
});

export async function saveNote(fd: FormData) {
  const f = NoteForm.parse(fields(fd));
  if (!f.text) return;
  const values = { parentType: f.parentType, parentId: f.parentId, day: f.day, text: f.text, updatedAt: new Date() };
  if (f.id) await db.update(schema.notes).set(values).where(eq(schema.notes.id, f.id));
  else await db.insert(schema.notes).values(values);
  done();
}

export async function deleteNote(noteId: number) {
  await db.delete(schema.notes).where(eq(schema.notes.id, noteId));
  done();
}
