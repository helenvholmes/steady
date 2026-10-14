// Renders public/icons/*.png and src/app/apple-icon.png from one SVG: a calm horizon line over a soft circle.
import sharp from "sharp";

const svg = (pad: number) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2f6f62"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
    <circle cx="256" cy="226" r="112" fill="#e2eeea"/>
    <rect x="96" y="300" width="320" height="28" rx="14" fill="#f6f5f1"/>
    <rect x="156" y="360" width="200" height="24" rx="12" fill="#f6f5f1" opacity="0.7"/>
  </g>
</svg>`;

const out = [
  ["public/icons/icon-192.png", 192, 40],
  ["public/icons/icon-512.png", 512, 40],
  ["public/icons/maskable-512.png", 512, 96],
  ["src/app/apple-icon.png", 180, 40],
  ["src/app/icon.png", 64, 40],
] as const;
for (const [file, size, pad] of out) {
  await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(file);
  console.log(file);
}
