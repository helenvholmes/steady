"use client";

import { useRef } from "react";

/** The goal's name as an editable heading. Saves on Enter or when focus leaves, if it changed. */
export function EditableTitle({ name, action }: { name: string; action: (fd: FormData) => Promise<void> }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action} className="min-w-0 flex-1">
      <label className="sr-only" htmlFor="goal-name">
        Goal name
      </label>
      <input
        id="goal-name"
        name="name"
        defaultValue={name}
        maxLength={120}
        required
        // Inputs clip whatever falls outside their line box, so give descenders (the bowl of a "g") room.
        className="h1 -mx-1 w-full rounded-lg border border-transparent bg-transparent px-1 py-1 leading-[1.4] outline-none hover:border-line focus:border-accent"
        onBlur={(e) => {
          const v = e.currentTarget.value.trim();
          if (v && v !== name) form.current?.requestSubmit();
          else e.currentTarget.value = name;
        }}
      />
    </form>
  );
}
