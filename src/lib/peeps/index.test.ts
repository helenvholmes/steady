import { describe, expect, it } from "vitest";
import bounds from "./bounds.json";
import { composePeep, peepViewBox } from "./compose.js";
import parts from "./parts.json";
import { PRESETS, parseDrawing, peepUrl, serializeDrawing, specFromQuery } from ".";

describe("goal drawings", () => {
  const spec = { body: "Coffee", hair: "Afro", face: "Smile", beard: null, glasses: "Glasses" };

  it("reads presets and stored specs, and rejects anything else", () => {
    expect(parseDrawing(PRESETS[0].id)).toEqual({ ...PRESETS[0].spec });
    expect(parseDrawing(serializeDrawing(spec))).toEqual(spec);
    expect(parseDrawing('{"body":"Nope","hair":"Afro","face":"Smile"}')).toBeNull();
    expect(parseDrawing("not json")).toBeNull();
    expect(parseDrawing(null)).toBeNull();
  });

  it("round-trips through the image URL", () => {
    const url = new URL(peepUrl(spec), "http://x");
    expect(url.pathname).toBe("/api/peep");
    expect(specFromQuery(url.searchParams)).toEqual(spec);
    expect(specFromQuery(new URLSearchParams("b=Coffee&h=Afro&f=Rage"))).toBeNull();
  });

  it("assembles a two-tone SVG with every chosen part", () => {
    const svg = composePeep(parts, spec);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain(parts.glasses.Glasses);
    const fills = new Set(svg.match(/fill="[^"]*"/g));
    expect([...fills].every((f) => ['fill="#1d2433"', 'fill="#ffffff"', 'fill="white"'].includes(f))).toBe(true);
  });

  it("frames each drawing to its parts", () => {
    for (const [group, list] of [["bodies", parts.bodies], ["hair", parts.hair], ["beards", parts.beards], ["glasses", parts.glasses]] as const) {
      expect(Object.keys(bounds[group]).sort()).toEqual(Object.keys(list).sort());
    }
    // A long afro reaches above Open Peeps' own frame (top 210.7); a wide arm reaches past its left edge (184.2).
    const [x, y] = peepViewBox(bounds, parts, { ...spec, body: "Hoodie", hair: "LongAfro" }).split(" ").map(Number);
    expect(y).toBeLessThan(60);
    expect(x).toBeLessThan(149);
    // The head moves with bodies that shift it.
    const shifted = peepViewBox(bounds, parts, { ...spec, body: "StrippedPocketTee", hair: "LongAfro" }).split(" ").map(Number);
    expect(shifted[0]).toBeLessThan(149);
  });
});
