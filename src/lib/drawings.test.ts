import { describe, expect, it } from "vitest";
import { DOODLES, drawingSrc, isGoalDrawing, parseGoalDrawing, serializeGoalDrawing } from "./drawings";
import { PRESETS } from "./peeps";

describe("goal drawings", () => {
  const icon = { kind: "icon" as const, id: DOODLES[0].id };
  const peep = { kind: "peep" as const, spec: { body: "Coffee", hair: "Afro", face: "Smile", beard: null, glasses: null } };

  it("round-trips icons and people through storage", () => {
    expect(parseGoalDrawing(serializeGoalDrawing(icon))).toEqual(icon);
    expect(parseGoalDrawing(serializeGoalDrawing(peep))).toEqual(peep);
  });

  it("still reads older values", () => {
    expect(parseGoalDrawing(PRESETS[0].id)?.kind).toBe("peep");
  });

  it("rejects unknown icons and malformed values", () => {
    expect(parseGoalDrawing('{"icon":"no-such-icon"}')).toBeNull();
    expect(parseGoalDrawing("{")).toBeNull();
    expect(isGoalDrawing({ kind: "icon", id: "../../etc/passwd" })).toBe(false);
    expect(isGoalDrawing(icon)).toBe(true);
  });

  it("points at the right image", () => {
    expect(drawingSrc(icon)).toBe(`/doodles/${icon.id}.svg`);
    expect(drawingSrc(peep).startsWith("/api/peep?")).toBe(true);
  });
});
