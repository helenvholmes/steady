// Shared form helpers for server actions (not an action file itself).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export const blankToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
export const optNum = z.preprocess(blankToUndef, z.coerce.number().optional());
export const optText = z.preprocess(blankToUndef, z.string().trim().max(5000).optional());
export const dayStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const optDay = z.preprocess(blankToUndef, dayStr.optional());
export const timeStr = z.string().regex(/^\d{2}:\d{2}$/);
export const id = z.coerce.number().int().positive();
export const optId = z.preprocess(blankToUndef, id.optional());
export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export function fields(fd: FormData) {
  return Object.fromEntries([...fd.keys()].map((k) => [k, fd.getAll(k).length > 1 ? fd.getAll(k) : fd.get(k)]));
}

/** Refreshes every page, then optionally redirects. */
export function done(to?: string): void {
  revalidatePath("/", "layout");
  if (to) redirect(to);
}

export const safeReturn = (v: unknown, fallback: string) =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : fallback;
