"use client";

import { useState } from "react";

type Point = { day: string; value: number };

const W = 340;
const H = 190;
const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

const toTime = (day: string) => Date.parse(`${day}T00:00:00Z`);
const fmtDay = (day: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(toTime(day));

/**
^ * Metric progress: the plan line (muted, dashed) from start to target, the progress line in the accent color,
 * and for weight, daily readings as muted dots under the weekly-average line. Tap or hover for values.
 */
export function MetricChart({
  plan,
  series,
  daily,
  unit,
  seriesLabel,
}: {
  plan: [Point, Point];
  series: Point[];
  daily?: Point[];
  unit: string;
  seriesLabel: string;
}) {
  const [hover, setHover] = useState<Point | null>(null);
  const all = [...plan, ...series, ...(daily ?? [])];
  const days = all.map((p) => p.day).sort();
  const [firstDay, lastDay] = [days[0], days[days.length - 1]];
  const x0 = toTime(firstDay);
  const x1 = toTime(lastDay);
  const values = all.map((p) => p.value);
  const [y0, y1] = niceRange(Math.min(...values), Math.max(...values));

  const x = (day: string) => PAD.left + ((toTime(day) - x0) / Math.max(1, x1 - x0)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0 || 1)) * (H - PAD.top - PAD.bottom);
  const path = (pts: Point[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const ticks = [y0, (y0 + y1) / 2, y1];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (series.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    setHover(series.reduce((best, p) => (Math.abs(x(p.day) - px) < Math.abs(x(best.day) - px) ? p : best)));
  }

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y select-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`${seriesLabel} compared with the plan line`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--muted)">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} fontSize={10} fill="var(--muted)">
          {fmtDay(firstDay)}
        </text>
        <text x={W - PAD.right} y={H - 6} fontSize={10} fill="var(--muted)" textAnchor="end">
          {fmtDay(lastDay)}
        </text>

        <path d={path(plan)} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 4" />
        {daily?.map((p, i) => <circle key={i} cx={x(p.day)} cy={y(p.value)} r={2.5} fill="var(--muted)" opacity={0.6} />)}
        {series.length > 1 && <path d={path(series)} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {series.length > 0 && (
          <circle
            cx={x(series[series.length - 1].day)}
            cy={y(series[series.length - 1].value)}
            r={4}
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        )}

        {hover && (
          <g pointerEvents="none">
            <line x1={x(hover.day)} x2={x(hover.day)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--muted)" strokeWidth={1} />
            <circle cx={x(hover.day)} cy={y(hover.value)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      <figcaption className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-accent" /> {seriesLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-[1.5px] border-dashed border-muted" /> Plan
        </span>
        {hover && (
          <span className="ml-auto text-ink tabular-nums">
            {fmtDay(hover.day)}: {fmtNum(hover.value)} {unit}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: Math.abs(n) < 100 ? 1 : 0 }).format(n);
}

/** Pads the value range a little and rounds it to clean numbers. Never pads below zero when no value is negative. */
function niceRange(min: number, max: number): [number, number] {
  const span = max - min || Math.abs(max) || 1;
  const step = 10 ** Math.floor(Math.log10(span / 2));
  const low = Math.floor((min - span * 0.05) / step) * step;
  return [min >= 0 ? Math.max(0, low) : low, Math.ceil((max + span * 0.05) / step) * step];
}
