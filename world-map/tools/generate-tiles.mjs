import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const INPUT = path.resolve("world-map/assets/map-full.webp");
const OUTPUT = path.resolve("world-map/tiles/faerun");
const TILE_SIZE = 512;
const ZOOM_LEVELS = [-4, -3, -2, -1, 0];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function clearOutput() {
  await fs.rm(OUTPUT, { recursive: true, force: true });
  await ensureDir(OUTPUT);
}

async function generateLevel(sourceMeta, zoom) {
  const scale = Math.pow(2, zoom);
  const levelWidth = Math.ceil(sourceMeta.width * scale);
  const levelHeight = Math.ceil(sourceMeta.height * scale);

  const cols = Math.ceil(levelWidth / TILE_SIZE);
  const rows = Math.ceil(levelHeight / TILE_SIZE);

  console.log(`Zoom ${zoom}: ${levelWidth}x${levelHeight} → ${cols}x${rows} tiles`);

  const resized = sharp(INPUT)
    .resize(levelWidth, levelHeight, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    });

  for (let x = 0; x < cols; x += 1) {
    for (let y = 0; y < rows; y += 1) {
      const left = x * TILE_SIZE;
      const top = y * TILE_SIZE;
      const tileWidth = Math.min(TILE_SIZE, levelWidth - left);
      const tileHeight = Math.min(TILE_SIZE, levelHeight - top);

      const outDir = path.join(OUTPUT, String(zoom), String(x));
      const outFile = path.join(outDir, `${y}.webp`);

      await ensureDir(outDir);

      await resized
        .clone()
        .extract({
          left,
          top,
          width: tileWidth,
          height: tileHeight,
        })
        .extend({
          top: 0,
          bottom: TILE_SIZE - tileHeight,
          left: 0,
          right: TILE_SIZE - tileWidth,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 78 })
        .toFile(outFile);
    }
  }
}

async function main() {
  const meta = await sharp(INPUT).metadata();

  if (!meta.width || !meta.height) {
    throw new Error("Impossibile leggere dimensioni immagine.");
  }

  console.log(`Input: ${meta.width}x${meta.height}`);

  await clearOutput();

  for (const zoom of ZOOM_LEVELS) {
    await generateLevel(meta, zoom);
  }

  console.log("Tile pyramid complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});