// A goal's drawing: a person (Open Peeps, assembled from parts) or an icon (Doodle Icons). Stored in
// goals.drawing as JSON: {"icon": "<id>"} for an icon, a peep spec for a person. Older values (a peep preset
// id, or a bare peep spec) are still read.
import { DOODLES, DOODLE_CATEGORIES } from "./doodles/catalog";
import { isPeepSpec, parseDrawing as parsePeep, peepUrl, serializeDrawing as serializePeep, type PeepSpec } from "./peeps";

export { DOODLES, DOODLE_CATEGORIES };

export type GoalDrawing = { kind: "peep"; spec: PeepSpec } | { kind: "icon"; id: string };

export const isDoodle = (id: unknown): id is string => typeof id === "string" && DOODLES.some((d) => d.id === id);

export function parseGoalDrawing(value: string | null | undefined): GoalDrawing | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && "icon" in parsed) {
      const id = (parsed as { icon: unknown }).icon;
      return isDoodle(id) ? { kind: "icon", id } : null;
    }
  } catch {
    // not JSON: maybe a peep preset id
  }
  const spec = parsePeep(value);
  return spec ? { kind: "peep", spec } : null;
}

export function isGoalDrawing(v: unknown): v is GoalDrawing {
  if (!v || typeof v !== "object") return false;
  const d = v as { kind?: unknown; spec?: unknown; id?: unknown };
  return (d.kind === "peep" && isPeepSpec(d.spec)) || (d.kind === "icon" && isDoodle(d.id));
}

export const serializeGoalDrawing = (d: GoalDrawing) => (d.kind === "icon" ? JSON.stringify({ icon: d.id }) : serializePeep(d.spec));

export const drawingSrc = (d: GoalDrawing) => (d.kind === "icon" ? `/doodles/${d.id}.svg` : peepUrl(d.spec));
