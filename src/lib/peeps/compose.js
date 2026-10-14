// Assembles an Open Peeps bust from its parts. Plain JavaScript so the generator (scripts/drawings) and the app
// share it: the generator checks that every preset assembled here matches the package's own drawing exactly.
//
// Part markup comes from parts.json (generated). The group transforms are the package's own (Effigy).

/**
 * @typedef {{ body: string, hair: string, face: string, beard?: string | null, glasses?: string | null }} PeepSpec
 * @typedef {{ bodies: Record<string, { svg: string, headTransform: string | null }>, hair: Record<string, string>,
 *   faces: Record<string, string>, beards: Record<string, string>, glasses: Record<string, string> }} PeepParts
 */

export const VIEW_BOX = "184.2 210.7 940.2 1130.5";

/**
 * Open Peeps' own frame (VIEW_BOX) cuts off long hair, buns, and wide elbows. The app frames each drawing to its
 * parts instead, from bounds.json: each part's box ([x1, y1, x2, y2], unpadded), measured with getBBox in a browser.
 * Faces sit inside the head, so they have no bounds.
 *
 * @param {{ bodies: Record<string, number[]>, hair: Record<string, number[]>, beards: Record<string, number[]>,
 *   glasses: Record<string, number[]> }} bounds
 * @param {PeepParts} parts
 * @param {PeepSpec} spec
 * @returns {string} a viewBox
 */
export function peepViewBox(bounds, parts, spec) {
  const shift = parts.bodies[spec.body]?.headTransform?.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);
  const [dx, dy] = shift ? [Number(shift[1]), Number(shift[2])] : [0, 0];
  const head = [bounds.hair[spec.hair], spec.beard && bounds.beards[spec.beard], spec.glasses && bounds.glasses[spec.glasses]]
    .filter(Boolean)
    .map((b) => [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy]);
  const boxes = [bounds.bodies[spec.body], ...head].filter(Boolean);
  if (boxes.length === 0) return VIEW_BOX;
  const pad = 12; // getBBox leaves out stroke width
  const x1 = Math.min(...boxes.map((b) => b[0])) - pad;
  const y1 = Math.min(...boxes.map((b) => b[1])) - pad;
  const x2 = Math.max(...boxes.map((b) => b[2])) + pad;
  const y2 = Math.max(...boxes.map((b) => b[3])) + pad;
  return `${x1} ${y1} ${x2 - x1} ${y2 - y1}`;
}

/**
 * @param {PeepParts} parts
 * @param {PeepSpec} spec
 * @param {string} [viewBox] defaults to Open Peeps' own frame
 * @returns {string} a standalone SVG document
 */
export function composePeep(parts, spec, viewBox = VIEW_BOX) {
  const body = parts.bodies[spec.body];
  const head =
    `<g id="Head" transform="translate(0 0)">` +
    `<g id="Hair" transform="translate(342, 190) scale(1 1)">${parts.hair[spec.hair] ?? ""}</g>` +
    `<g id="Face" transform="translate(531, 366) scale(1 1)">${parts.faces[spec.face] ?? ""}</g>` +
    `<g id="Beard" transform="translate(495, 518) scale(1 1)">${spec.beard ? (parts.beards[spec.beard] ?? "") : ""}</g>` +
    `<g id="Mask" transform="translate(400, 480) scale(1 1)"></g>` +
    `<g id="Accessories" transform="translate(419, 421) scale(1 1)">${spec.glasses ? (parts.glasses[spec.glasses] ?? "") : ""}</g>` +
    `</g>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><g id="Bust">` +
    `<g id="Body" transform="translate(147, 639) scale(1 1)">${body?.svg ?? ""}</g>` +
    (body?.headTransform ? `<g transform="${body.headTransform}">${head}</g>` : head) +
    `</g></svg>`
  );
}
