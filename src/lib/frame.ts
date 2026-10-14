/** Preset colors for the frame around the page. Each has a shade for light and for dark mode. */
export const FRAME_COLORS = [
  { id: "sage", name: "Sage", light: "#5dbf9d", dark: "#4a9e81" },
  { id: "olive", name: "Olive", light: "#5b6b2f", dark: "#7f8f4c" },
  { id: "ink", name: "Ink blue", light: "#2f5bb7", dark: "#5b84d6" },
  { id: "terracotta", name: "Terracotta", light: "#c8643b", dark: "#c97a57" },
  { id: "plum", name: "Plum", light: "#7a4a8c", dark: "#a07ab1" },
  { id: "butter", name: "Butter", light: "#e8c547", dark: "#c9a93a" },
  { id: "charcoal", name: "Charcoal", light: "#2b2b2b", dark: "#6b6e75" },
] as const;

export type FrameColorId = (typeof FRAME_COLORS)[number]["id"];
export const DEFAULT_FRAME: FrameColorId = "sage";

export function frameColor(id: string | undefined) {
  return FRAME_COLORS.find((c) => c.id === id) ?? FRAME_COLORS[0];
}

// ---------- animated gradient ----------

function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

const hsl = (h: number, s: number, l: number) =>
  `hsl(${Math.round(((h % 360) + 360) % 360)} ${Math.round(Math.min(1, s) * 100)}% ${Math.round(Math.min(0.95, Math.max(0.05, l)) * 100)}%)`;

/** Four colors around a frame color for the animated gradient: the color, lighter, deeper, and a neighboring hue. */
export function gradientColors(hex: string): string[] {
  const [h, s, l] = toHsl(hex);
  return [hsl(h, s, l), hsl(h, s, l + 0.2), hsl(h, s, l - 0.15), hsl(h + 35, s, l + 0.05)];
}
