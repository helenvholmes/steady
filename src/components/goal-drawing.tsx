import { drawingSrc, type GoalDrawing as Drawing } from "@/lib/drawings";

/**
 * A goal's person or icon, in a square box so every lockup lines up. Drawings are different widths, so each sits
 * against the box's left edge (people also on its bottom), keeping a column of cards aligned on the left.
 * Decorative: the goal name carries the meaning. A plain <img>: the SVGs need no optimization.
 */
export function GoalDrawing({ drawing, className = "" }: { drawing: Drawing; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={drawingSrc(drawing)}
      alt=""
      width={64}
      height={64}
      className={`drawing aspect-square object-contain ${drawing.kind === "icon" ? "object-left py-[8%] pr-[8%]" : "object-left-bottom"} select-none ${className}`}
      draggable={false}
    />
  );
}
