"use client";

import { useMemo, useState, useTransition } from "react";
import { setGoalDrawing } from "@/app/(app)/actions/goals";
import { DOODLES, DOODLE_CATEGORIES, type GoalDrawing } from "@/lib/drawings";
import {
  BEARD_OPTIONS,
  BODY_OPTIONS,
  FACE_OPTIONS,
  GLASSES_OPTIONS,
  HAIR_OPTIONS,
  PRESETS,
  peepUrl,
  type PeepSpec,
} from "@/lib/peeps";
import { GoalDrawing as Drawing } from "./goal-drawing";

type Option = { readonly id: string; readonly label: string };
const NONE: Option = { id: "", label: "None" };

const ROWS: { key: keyof PeepSpec; label: string; options: readonly Option[] }[] = [
  { key: "body", label: "Outfit", options: BODY_OPTIONS },
  { key: "hair", label: "Hair", options: HAIR_OPTIONS },
  { key: "face", label: "Face", options: FACE_OPTIONS },
  { key: "beard", label: "Beard", options: [NONE, ...BEARD_OPTIONS] },
  { key: "glasses", label: "Glasses", options: [NONE, ...GLASSES_OPTIONS] },
];

const FIRST_PEEP = PRESETS[0].spec as PeepSpec;
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * The drawing beside a goal's name. Tapping it opens an editor: build a person part by part, or pick an icon.
 */
export function DrawingEditor({ goalId, initial }: { goalId: number; initial: GoalDrawing | null }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"peep" | "icon">(initial?.kind ?? "peep");
  const [spec, setSpec] = useState<PeepSpec>(initial?.kind === "peep" ? initial.spec : FIRST_PEEP);
  const [icon, setIcon] = useState<string | null>(initial?.kind === "icon" ? initial.id : null);
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const icons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DOODLES.filter((d) => (category === "All" || d.category === category) && (!q || d.label.toLowerCase().includes(q)));
  }, [category, query]);

  const step = (key: keyof PeepSpec, options: readonly Option[], dir: 1 | -1) => {
    const current = options.findIndex((o) => o.id === (spec[key] ?? ""));
    const next = options[(current + dir + options.length) % options.length];
    setSpec({ ...spec, [key]: next.id || null });
  };
  const shuffle = () =>
    setSpec({
      body: pick(BODY_OPTIONS).id,
      hair: pick(HAIR_OPTIONS).id,
      face: pick(FACE_OPTIONS).id,
      beard: Math.random() < 0.25 ? pick(BEARD_OPTIONS).id : null,
      glasses: Math.random() < 0.3 ? pick(GLASSES_OPTIONS).id : null,
    });
  const save = (value: GoalDrawing | null) =>
    startTransition(async () => {
      await setGoalDrawing(goalId, value);
      setOpen(false);
    });
  const reset = () => {
    setTab(initial?.kind ?? "peep");
    setSpec(initial?.kind === "peep" ? initial.spec : FIRST_PEEP);
    setIcon(initial?.kind === "icon" ? initial.id : null);
    setOpen(false);
  };

  const chosen: GoalDrawing | null = tab === "peep" ? { kind: "peep", spec } : icon ? { kind: "icon", id: icon } : null;

  return (
    <>
      {initial ? (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Change drawing" className="shrink-0">
          <Drawing drawing={initial} className="w-14" />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="order-1 shrink-0 text-sm text-muted underline">
          Add a drawing
        </button>
      )}

      {open && (
        <section className="card order-2 flex w-full basis-full flex-col gap-4" aria-label="Choose a drawing">
          <div className="flex gap-2" role="tablist" aria-label="Kind of drawing">
            {(
              [
                ["peep", "Person"],
                ["icon", "Icon"],
              ] as const
            ).map(([value, text]) => (
              <button key={value} type="button" role="tab" aria-selected={tab === value} className="chip" data-on={tab === value} onClick={() => setTab(value)}>
                {text}
              </button>
            ))}
          </div>

          {tab === "peep" ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={peepUrl(spec)} alt="Preview" width={940} height={1130} className="drawing mx-auto h-auto w-36 shrink-0 sm:mx-0" />
                <div className="flex flex-1 flex-col gap-1">
                  {ROWS.map(({ key, label, options }) => {
                    const current = options.find((o) => o.id === (spec[key] ?? "")) ?? options[0];
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="label mb-0 w-20 shrink-0">{label}</span>
                        <button type="button" className="btn min-h-9 px-3" onClick={() => step(key, options, -1)} aria-label={`Previous ${label.toLowerCase()}`}>
                          ‹
                        </button>
                        <span className="min-w-0 flex-1 truncate text-center" aria-live="polite">
                          {current.label}
                        </span>
                        <button type="button" className="btn min-h-9 px-3" onClick={() => step(key, options, 1)} aria-label={`Next ${label.toLowerCase()}`}>
                          ›
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <span className="label">Start from</span>
                <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2">
                  {PRESETS.map((p) => (
                    <li key={p.id} className="shrink-0">
                      <button type="button" onClick={() => setSpec(p.spec as PeepSpec)} aria-label={p.label} className="block border border-line p-0.5 hover:border-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={peepUrl(p.spec as PeepSpec)} alt="" width={940} height={1130} loading="lazy" className="drawing h-auto w-12" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {["All", ...DOODLE_CATEGORIES].map((c) => (
                  <button key={c} type="button" className="chip" data-on={category === c} onClick={() => setCategory(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <label>
                <span className="sr-only">Search icons</span>
                <input className="field" type="search" placeholder="Search icons" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <ul className="grid max-h-80 grid-cols-6 gap-1 overflow-y-auto sm:grid-cols-10" aria-label="Icons">
                {icons.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setIcon(d.id)}
                      aria-label={d.label}
                      aria-pressed={icon === d.id}
                      title={d.label}
                      className={`block w-full border p-1 ${icon === d.id ? "border-2 border-accent" : "border-line hover:border-muted"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/doodles/${d.id}.svg`} alt="" width={48} height={48} loading="lazy" className="drawing aspect-square w-full object-contain" />
                    </button>
                  </li>
                ))}
                {icons.length === 0 && <li className="col-span-full text-sm text-muted">No icons match.</li>}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {chosen && <Drawing drawing={chosen} className="w-10" />}
            <button type="button" className="btn-primary" onClick={() => chosen && save(chosen)} disabled={pending || !chosen}>
              Save
            </button>
            {tab === "peep" && (
              <button type="button" className="btn" onClick={shuffle}>
                Shuffle
              </button>
            )}
            {initial && (
              <button type="button" className="btn text-muted" onClick={() => save(null)} disabled={pending}>
                Remove drawing
              </button>
            )}
            <button type="button" className="btn text-muted" onClick={reset}>
              Cancel
            </button>
          </div>
          <p className="text-xs text-muted">
            {tab === "peep" ? "Drawings from Open Peeps by Pablo Stanley." : "Icons from Doodle Icons by Khushmeen Sidhu."}
          </p>
        </section>
      )}
    </>
  );
}
