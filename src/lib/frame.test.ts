import { describe, expect, it } from "vitest";
import { FRAME_COLORS, frameColor, gradientColors } from "./frame";

describe("frame colors", () => {
  it("falls back to the first preset", () => {
    expect(frameColor("nope").id).toBe(FRAME_COLORS[0].id);
  });

  it("builds four gradient colors around a preset", () => {
    const colors = gradientColors("#5dbf9d");
    expect(colors).toHaveLength(4);
    expect(colors[0]).toMatch(/^hsl\(\d+ \d+% \d+%\)$/);
    expect(new Set(colors).size).toBe(4);
  });
});
