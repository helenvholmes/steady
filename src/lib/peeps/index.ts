// Goal drawings: Open Peeps busts (Pablo Stanley, CC0) assembled from parts. See scripts/drawings/peeps.mjs.
import { BEARD_OPTIONS, BODY_OPTIONS, FACE_OPTIONS, GLASSES_OPTIONS, HAIR_OPTIONS, PRESETS } from "./catalog";

export { BEARD_OPTIONS, BODY_OPTIONS, FACE_OPTIONS, GLASSES_OPTIONS, HAIR_OPTIONS, PRESETS };

export type PeepSpec = { body: string; hair: string; face: string; beard: string | null; glasses: string | null };

const has = (list: readonly { id: string }[], id: unknown) => typeof id === "string" && list.some((o) => o.id === id);

/** Every part exists in the catalog (beard and glasses may be null). */
export function isPeepSpec(v: unknown): v is PeepSpec {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    has(BODY_OPTIONS, s.body) &&
    has(HAIR_OPTIONS, s.hair) &&
    has(FACE_OPTIONS, s.face) &&
    (s.beard == null || has(BEARD_OPTIONS, s.beard)) &&
    (s.glasses == null || has(GLASSES_OPTIONS, s.glasses))
  );
}

const clean = (s: PeepSpec): PeepSpec => ({ body: s.body, hair: s.hair, face: s.face, beard: s.beard ?? null, glasses: s.glasses ?? null });

/** A goal's stored drawing: JSON of a spec, or a preset id (older values). Anything else is no drawing. */
export function parseDrawing(value: string | null | undefined): PeepSpec | null {
  if (!value) return null;
  const preset = PRESETS.find((p) => p.id === value);
  if (preset) return clean(preset.spec as PeepSpec);
  try {
    const parsed: unknown = JSON.parse(value);
    return isPeepSpec(parsed) ? clean(parsed) : null;
  } catch {
    return null;
  }
}

export const serializeDrawing = (spec: PeepSpec) => JSON.stringify(clean(spec));

/** Bump when the assembled SVG changes, since browsers cache each URL for good. */
const PEEP_VERSION = "2";

/** URL of the assembled SVG (served by /api/peep, cached by the browser). */
export function peepUrl(spec: PeepSpec) {
  const q = new URLSearchParams({ v: PEEP_VERSION, b: spec.body, h: spec.hair, f: spec.face });
  if (spec.beard) q.set("be", spec.beard);
  if (spec.glasses) q.set("g", spec.glasses);
  return `/api/peep?${q}`;
}

export function specFromQuery(q: URLSearchParams): PeepSpec | null {
  const spec = { body: q.get("b"), hair: q.get("h"), face: q.get("f"), beard: q.get("be"), glasses: q.get("g") };
  return isPeepSpec(spec) ? clean(spec) : null;
}
