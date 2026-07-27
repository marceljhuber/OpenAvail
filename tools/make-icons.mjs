// Rasterise web/public/app-icon.svg into the PNG app icons.
//
// iOS home-screen icons and Android install prompts both want real bitmaps —
// an SVG-only manifest makes iOS fall back to a screenshot of the page. The
// three PNGs are committed, so this only needs running when the mark changes.
//
//   npm i --no-save sharp && node tools/make-icons.mjs
//
// `sharp` is deliberately NOT a dependency of the repo: it is a native module,
// and the whole point of using node:sqlite over better-sqlite3 was to keep the
// build free of native compilation. Install it ad hoc, run this, throw it away.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "web", "public");

const svg = await readFile(join(publicDir, "app-icon.svg"));

/** Every icon is opaque: iOS composites onto an unknown background, and a
 *  transparent maskable icon shows through Android's mask shape. */
const targets = [
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
];

await mkdir(publicDir, { recursive: true });

for (const { file, size } of targets) {
  const png = await sharp(svg, { density: 512 })
    .resize(size, size, { fit: "contain", background: "#136c46" })
    .flatten({ background: "#136c46" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(publicDir, file), png);
  console.log(`${file}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} kB`);
}
