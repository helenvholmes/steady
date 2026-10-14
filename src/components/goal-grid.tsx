"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useId, useOptimistic, useTransition } from "react";
import { reorderGoals, setGoalStatus } from "@/app/(app)/actions/goals";
import type { GoalDrawing as Drawing } from "@/lib/drawings";
import type { Progress } from "@/lib/progress";
import { GoalDrawing } from "./goal-drawing";
import { ProgressMeter } from "./progress-meter";

export type GoalCard = {
  id: number;
  name: string;
  drawing: Drawing | null;
  progress: Progress | null;
  daysLeft: number | null;
  startBy: string | null;
};

/** Active goals: row 1 one large card, row 2 two cards, then four per row (two on iPhone). */
const sizeClass = (i: number) => (i === 0 ? "col-span-2 md:col-span-4" : i <= 2 ? "col-span-1 md:col-span-2" : "col-span-1");

export function GoalGrid({ status, cards }: { status: "active" | "future"; cards: GoalCard[] }) {
  const [, startTransition] = useTransition();
  const [order, setOrder] = useOptimistic(cards.map((c) => c.id));
  const dndId = useId(); // stable across server and client, so hydration matches
  const byId = new Map(cards.map((c) => [c.id, c]));
  const sensors = useSensors(
    // Only the handle starts a drag, so the card's link still opens the goal and a swipe still scrolls.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // Keyboard: focus the handle, Space to pick up, arrow keys to move, Space to drop, Escape to cancel.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = arrayMove(order, order.indexOf(Number(active.id)), order.indexOf(Number(over.id)));
    startTransition(async () => {
      setOrder(ids);
      await reorderGoals(status, ids);
    });
  };

  if (cards.length === 0) return null;
  const sortable = cards.length > 1;
  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {order.map((goalId, i) => {
            const card = byId.get(goalId);
            if (!card) return null;
            return (
              <SortableCard key={goalId} id={goalId} name={card.name} sortable={sortable} className={status === "active" ? sizeClass(i) : "col-span-1"}>
                {status === "active" ? <ActiveCard card={card} large={i === 0} medium={i === 1 || i === 2} stacked={i >= 3} /> : <FutureCard card={card} />}
              </SortableCard>
            );
          })}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableCard({
  id,
  name,
  sortable,
  className,
  children,
}: {
  id: number;
  name: string;
  sortable: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group card card-lift relative ${className} ${isDragging ? "z-30 opacity-80 shadow-lg" : ""}`}
    >
      {children}
      {sortable && (
        // The drag handle: shown on hover or keyboard focus with a mouse, always shown on touch screens (no hover).
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Move ${name}`}
          className={`absolute top-1.5 right-1.5 z-10 flex size-8 touch-none items-center justify-center rounded-md text-muted transition-opacity duration-150 hover:bg-accent-soft hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${
            isDragging ? "cursor-grabbing opacity-100" : "cursor-grab opacity-0"
          }`}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden className="fill-current">
            {[4, 8, 12].map((y) => [6, 10].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.25" />))}
          </svg>
        </button>
      )}
    </li>
  );
}

function ActiveCard({ card, large, medium, stacked }: { card: GoalCard; large: boolean; medium: boolean; stacked: boolean }) {
  return (
    // The drawing sits small at the left of the title; in the narrow four-across rows it sits at the top instead.
    // The card fills its grid row and the bar sits at the bottom, so bars line up across a row whether or not
    // a goal has days left or a title wraps.
    <div className={stacked ? "flex h-full flex-col items-start gap-2" : "flex h-full items-center gap-3"}>
      {card.drawing && <GoalDrawing drawing={card.drawing} className={`shrink-0 ${large ? "w-16" : "w-11"}`} />}
      <div className={`flex w-full min-w-0 flex-1 flex-col gap-3 ${stacked ? "" : "self-stretch"}`}>
        {/* Stacked cards put days left on its own line under the title. */}
        <div className={stacked ? "flex flex-col gap-1 pr-6" : "flex items-baseline justify-between gap-2 pr-6"}>
          {/* The title link covers the card; interactive parts sit above it. */}
          <Link href={`/goals/${card.id}`} className={`title after:absolute after:inset-0 ${large ? "text-[calc(1.25rem+8px)]" : medium ? "text-xl" : ""}`}>
            {card.name}
          </Link>
          {card.daysLeft !== null && (
            <span className="shrink-0 text-sm text-muted tabular-nums">
              <span className={`font-semibold text-ink ${large ? "text-2xl" : ""}`}>{card.daysLeft}</span> days
            </span>
          )}
        </div>
        {card.progress && (
          <div className="mt-auto">
            <ProgressMeter progress={card.progress} size={large ? "md" : "sm"} />
          </div>
        )}
      </div>
    </div>
  );
}

function FutureCard({ card }: { card: GoalCard }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 pr-6">
        {card.drawing && <GoalDrawing drawing={card.drawing} className="w-10 shrink-0" />}
        <Link href={`/goals/${card.id}`} className="title after:absolute after:inset-0">
          {card.name}
        </Link>
      </div>
      {card.startBy && <span className="text-xs text-muted">{card.startBy}</span>}
      <form action={setGoalStatus.bind(null, card.id, "start")} className="relative z-10">
        <button className="btn-soft min-h-9 w-full text-sm">Start</button>
      </form>
    </div>
  );
}
