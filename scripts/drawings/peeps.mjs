// Builds the goal drawing parts from Open Peeps (https://www.openpeeps.com), hand-drawn illustrations by
// Pablo Stanley released under CC0. The npm package that draws them (MIT) needs React 18, so this runs in its
// own folder:
//
//   cd scripts/drawings && npm install && npm run generate
//
// Outputs (in src/lib/peeps/):
// - parts.json: each body, hairstyle, face, beard, and pair of glasses as SVG markup, two-tone (navy ink on white)
// - catalog.ts: the options the editor offers, and 52 ready-made presets
// The app assembles a drawing from parts with compose.js; this script checks every preset assembled that way
// matches the package's own drawing exactly.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { composePeep } from "../../src/lib/peeps/compose.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(root, "src/lib/peeps");
const build = path.join(here, "node_modules/@opeepsfun/open-peeps/build");

// Effigy.js mixes `import` with `require` (written for bundlers). Give it a real require and load it.
const source = readFileSync(path.join(build, "Effigy.js"), "utf8");
const patched = path.join(build, "EffigyNode.mjs");
writeFileSync(patched, `import { createRequire } from "node:module";\nconst require = createRequire(import.meta.url);\n${source}`);
const { Effigy } = await import(pathToFileURL(patched).href);

const INK = "#1d2433";
const PAPER = "#ffffff";
const COLOR_PROPS = [
  "skinColor", "hairColor", "topColor", "jacketColor", "blazerColor", "pocketColor", "beardColor", "beanieColor",
  "capColor", "clipColor", "computerColor", "cupColor", "frameColor", "hijabColor", "paperColor", "turbanColor",
];
const colors = { outlineColor: INK, ...Object.fromEntries(COLOR_PROPS.map((p) => [p, PAPER])) };

const words = (id) => id.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Za-z])(One|Two|Three|Four|Five|Six)$/, "$1 $2");
const listDir = (dir) =>
  readdirSync(path.join(build, dir))
    .filter((f) => f.endsWith(".js") && f !== "index.js")
    .map((f) => f.replace(/\.js$/, ""))
    .sort();

// Bodies (busts). "Killer" (holding a knife) is left out on purpose.
const BODIES = [
  ["Coffee", "Coffee"], ["Computer", "At the computer"], ["Paper", "Reading"], ["Explaining", "Explaining"],
  ["PointingUp", "Pointing up"], ["Gaming", "Gaming"], ["Whatever", "Shrugging"], ["TeeArmsCrossed", "Arms crossed"],
  ["BlazerBlackTee", "Blazer"], ["ButtonPocketShirt", "Pocket shirt"], ["ButtonShirt", "Button shirt"], ["Dress", "Dress"],
  ["GymShirt", "Gym shirt"], ["Hoodie", "Hoodie"], ["Jacket", "Jacket"], ["PolkadotJacket", "Polka dot jacket"],
  ["PoloSweater", "Polo sweater"], ["ShirtCoat", "Coat"], ["SportyTee", "Sporty tee"], ["StripedTee", "Striped tee"],
  ["StrippedPocketTee", "Pocket tee"], ["SweaterDots", "Dotted sweater"], ["Tee", "Tee"], ["TeeSelena", "Tank top"],
  ["ThunderTee", "Lightning tee"], ["Turtleneck", "Turtleneck"],
];
const HAIR = listDir("head");
// No angry, fearful, monstrous, or masked faces.
const FACES = [
  "Smile", "Calm", "BigSmile", "Cute", "Driven", "SmileTeeth", "Explaining", "Awe", "Cheeky", "LoveGrinTeeth",
  "Serious", "EyesClosed", "Old", "Tired", "Concerned", "Suspicious",
];
const BEARDS = listDir("beard");
// Eyeglasses first, sunglasses next, the eyepatch last (it isn't glasses, but it's the same slot).
const GLASSES = [...listDir("accessory").filter((g) => g !== "Eyepatch"), "Eyepatch"];

// Fewer decimals (same drawing, about a third smaller), no fixed size, and any color a part hard-codes
// (a red mouth, a tinted hairstyle) becomes paper, so every drawing is two-tone.
const normalize = (svg) =>
  svg
    .replace(/(\d+\.\d{1})\d+/g, "$1")
    .replace(/fill="(?!#1d2433"|#ffffff"|white"|none")[^"]*"/gi, `fill="${PAPER}"`)
    .replace(/ overflow="visible"/, "")
    .replace(/ width="[^"]*"/, "")
    .replace(/ height="[^"]*"/, "");

const render = (spec) =>
  normalize(
    renderToStaticMarkup(
      React.createElement(Effigy, {
        body: { type: spec.body, options: colors },
        ...(spec.hair ? { head: { type: spec.hair, options: colors } } : {}),
        // Effigy always draws a face; when extracting other parts, a placeholder one is drawn and ignored.
        face: { type: spec.face ?? "Calm", options: colors },
        ...(spec.beard ? { beard: { type: spec.beard, options: colors } } : {}),
        ...(spec.glasses ? { accessory: { type: spec.glasses, options: colors } } : {}),
      }),
    ),
  );

/** The markup inside `<g id="…" …>`, up to the given end marker. */
function inner(svg, id, endMarker) {
  const open = svg.indexOf(`<g id="${id}"`);
  const start = svg.indexOf(">", open) + 1;
  const end = svg.indexOf(endMarker, start);
  if (open < 0 || end < 0) throw new Error(`Couldn't find ${id}`);
  return svg.slice(start, end);
}

const parts = { bodies: {}, hair: {}, faces: {}, beards: {}, glasses: {} };
for (const [body] of BODIES) {
  const svg = render({ body });
  const headAt = svg.indexOf('<g id="Head"');
  const before = svg.slice(svg.indexOf(">", svg.indexOf('<g id="Body"')) + 1, headAt);
  const m = before.match(/^([\s\S]*)<\/g>(?:<g transform="([^"]*)">)?$/);
  if (!m) throw new Error(`Unexpected body markup for ${body}`);
  parts.bodies[body] = { svg: m[1], headTransform: m[2] ?? null };
}
for (const hair of HAIR) parts.hair[hair] = inner(render({ body: "Tee", hair }), "Hair", '</g><g id="Face"');
for (const face of FACES) parts.faces[face] = inner(render({ body: "Tee", face }), "Face", '</g><g id="Beard"');
for (const beard of BEARDS) parts.beards[beard] = inner(render({ body: "Tee", beard }), "Beard", '</g><g id="Mask"');
for (const glasses of GLASSES) parts.glasses[glasses] = inner(render({ body: "Tee", glasses }), "Accessories", "</g></g></g></svg>");

// Presets: two per body, cycling through hair and faces so every one appears.
const PRESET_HAIR = [
  "Afro", "LongCurly", "ShortOne", "Bun", "Hijab", "MediumStraight", "Twists", "Bald", "LongHair", "Cornrows",
  "BangsTwo", "FlatTop", "BunTwo", "Wavy", "DreadsOne", "MediumBangs", "ShortThree", "Turban", "LongBangs",
  "Pomp", "BantuKnots", "ShortFive", "GrayShort", "Beanie", "MediumTwo", "Mohawk", "LongAfro", "ShavedOne",
];
const PRESET_FACES = FACES.slice(0, 10);
const PRESET_BEARDS = ["Goatee", "FullMedium", "MustacheThin", "Chin"];
const PRESET_GLASSES = ["Glasses", "GlassesTwo", "GlassesFour"];
const presets = [];
let n = 0;
for (const [body, label] of BODIES) {
  for (let variant = 0; variant < 2; variant++, n++) {
    const spec = {
      body,
      hair: PRESET_HAIR[(n * 5) % PRESET_HAIR.length],
      face: PRESET_FACES[(n * 3) % PRESET_FACES.length],
      beard: n % 5 === 2 ? PRESET_BEARDS[(n / 5) % PRESET_BEARDS.length | 0] : null,
      glasses: n % 4 === 1 ? PRESET_GLASSES[(n / 4) % PRESET_GLASSES.length | 0] : null,
    };
    // The assembled drawing must match the package's own, exactly.
    if (composePeep(parts, spec) !== render(spec)) throw new Error(`Assembled preset differs from Open Peeps: ${JSON.stringify(spec)}`);
    const id = `${body}-${variant + 1}`.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    presets.push({ id, label: variant === 0 ? label : `${label} (2)`, spec });
  }
}

writeFileSync(path.join(out, "parts.json"), JSON.stringify(parts));
const options = (ids, labels = {}) => ids.map((id) => ({ id, label: labels[id] ?? words(id) }));
writeFileSync(
  path.join(out, "catalog.ts"),
  `// Generated by scripts/drawings/peeps.mjs. Do not edit by hand.
// Drawings: Open Peeps by Pablo Stanley (https://www.openpeeps.com), CC0.

export const BODY_OPTIONS = ${JSON.stringify(options(BODIES.map((b) => b[0]), Object.fromEntries(BODIES)))} as const;
export const HAIR_OPTIONS = ${JSON.stringify(options(HAIR))} as const;
export const FACE_OPTIONS = ${JSON.stringify(options(FACES))} as const;
export const BEARD_OPTIONS = ${JSON.stringify(options(BEARDS))} as const;
export const GLASSES_OPTIONS = ${JSON.stringify(options(GLASSES))} as const;

export const PRESETS = ${JSON.stringify(presets)} as const;
`,
);
writeFileSync(
  path.join(out, "LICENSE.md"),
  `The drawing parts in parts.json are from Open Peeps by Pablo Stanley (https://www.openpeeps.com), released under
CC0 1.0 (public domain). They were recolored and extracted by scripts/drawings/peeps.mjs using @opeepsfun/open-peeps (MIT).
`,
);
const kb = Math.round(readFileSync(path.join(out, "parts.json")).length / 1024);
console.log(
  `Parts: ${BODIES.length} bodies, ${HAIR.length} hair, ${FACES.length} faces, ${BEARDS.length} beards, ${GLASSES.length} glasses (${kb} KB). ` +
    `${presets.length} presets, all matching Open Peeps exactly.`,
);
