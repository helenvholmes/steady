"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { addBlock } from "@/app/(app)/actions/blocks";
import type { BlockType } from "@/db/schema";

const ITEMS: { type: BlockType; label: string; description: string }[] = [
  { type: "tasks", label: "Tasks", description: "Things to do, with dates" },
  { type: "metric", label: "Metric", description: "A number with a target and a chart" },
  { type: "metric_summary", label: "Metric summary", description: "Every metric at a glance" },
  { type: "countdown", label: "Countdown", description: "Days left to the target date" },
  { type: "notes", label: "Notes", description: "Dated notes, searchable" },
];

/**
 * The "+" in the goal page's top right corner: a menu button (WAI-ARIA menu button pattern). The menu holds only
 * menu items; the heading and footer sit outside it. One Tab stop: arrow keys, Home, and End move between items,
 * Escape closes and returns focus to the "+", and Tab closes and moves on.
 */
export function AddBlockMenu({ goalId }: { goalId: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  // Which item gets focus when the menu opens: the first, or the last (ArrowUp on the "+").
  const focusOnOpen = useRef<"first" | "last">("first");
  const id = useId();
  const menuId = `${id}-menu`;
  const labelId = `${id}-label`;

  useEffect(() => {
    if (!open) return;
    const list = items.current.filter(Boolean) as HTMLButtonElement[];
    (focusOnOpen.current === "last" ? list[list.length - 1] : list[0])?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const openMenu = (focus: "first" | "last") => {
    focusOnOpen.current = focus;
    setOpen(true);
  };

  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openMenu(e.key === "ArrowUp" ? "last" : "first");
    }
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
      return;
    }
    if (e.key === "Tab") {
      setOpen(false); // focus moves on naturally
      return;
    }
    const list = items.current.filter(Boolean) as HTMLButtonElement[];
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const target = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: list.length - 1 }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    list[(target + list.length) % list.length]?.focus();
  };

  const add = (type: BlockType) =>
    startTransition(async () => {
      await addBlock(goalId, type);
      setOpen(false);
      button.current?.focus();
    });

  return (
    <div ref={root} className="relative order-1 ml-auto">
      <button
        ref={button}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu("first"))}
        onKeyDown={onButtonKey}
        aria-label="Add a block"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={`flex size-11 items-center justify-center rounded-[8px] border border-line transition-transform duration-200 hover:bg-accent-soft ${open ? "rotate-45" : ""}`}
      >
        {/* Drawn rather than typed: a "+" glyph sits off-center in most fonts. */}
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden className="stroke-current">
          <path d="M8 2v12M2 8h12" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>

      {/* The popover panel. Hidden (and out of the accessibility tree) while closed; it scales in when opened. */}
      <div
        className={`absolute top-12 right-0 z-30 w-64 origin-top-right rounded-lg border border-line bg-surface p-1 shadow-[var(--lift-shadow)] transition duration-150 ease-out ${
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
        }`}
      >
        <p id={labelId} className="label px-3 pt-2">
          Add a block
        </p>
        <div id={menuId} role="menu" aria-labelledby={labelId} onKeyDown={onMenuKey}>
          {ITEMS.map((item, i) => (
            <button
              key={item.type}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-label={item.label}
              aria-describedby={`${id}-${item.type}`}
              disabled={pending}
              onClick={() => add(item.type)}
              className="block w-full rounded-md px-3 py-2 text-left outline-none hover:bg-accent-soft focus-visible:bg-accent-soft disabled:opacity-50"
            >
              <span className="block">{item.label}</span>
              <span id={`${id}-${item.type}`} className="block text-sm text-muted">
                {item.description}
              </span>
            </button>
          ))}
        </div>
        <p className="px-3 pt-1 pb-2 text-xs text-muted">More block types are coming.</p>
      </div>
    </div>
  );
}
