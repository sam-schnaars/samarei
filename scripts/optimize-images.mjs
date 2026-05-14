// One-shot image optimizer for files in public/.
// Converts JPEG/PNG/GIF → WebP (animated WebP for GIFs).
// Skips files that are already small or already converted.

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, basename, dirname } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('../public/', import.meta.url).pathname;

const QUALITY = 78;
const MIN_BYTES = 20 * 1024; // don't bother with files < 20 KB
const STATIC_EXTS = new Set(['.jpg', '.jpeg', '.png']);
const ANIM_EXTS = new Set(['.gif']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function pretty(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const files = walk(ROOT);
let totalIn = 0;
let totalOut = 0;
let converted = 0;

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const inSize = statSync(file).size;

  const isStatic = STATIC_EXTS.has(ext);
  const isAnim = ANIM_EXTS.has(ext);
  if (!isStatic && !isAnim) continue;
  if (inSize < MIN_BYTES) continue;

  const dir = dirname(file);
  const base = basename(file, ext);
  const outPath = join(dir, `${base}.webp`);

  if (existsSync(outPath)) {
    // Already converted in a previous run.
    continue;
  }

  try {
    let pipeline;
    if (isAnim) {
      pipeline = sharp(file, { animated: true }).webp({
        quality: QUALITY,
        effort: 5,
      });
    } else {
      pipeline = sharp(file).webp({ quality: QUALITY, effort: 5 });
    }

    await pipeline.toFile(outPath);
    const outSize = statSync(outPath).size;
    totalIn += inSize;
    totalOut += outSize;
    converted += 1;
    const saved = ((1 - outSize / inSize) * 100).toFixed(1);
    console.log(
      `✓ ${file.replace(ROOT, '')}  ${pretty(inSize)} → ${pretty(outSize)} (-${saved}%)`,
    );
  } catch (err) {
    console.error(`✗ failed on ${file}: ${err.message}`);
  }
}

if (converted === 0) {
  console.log('Nothing to convert (everything already has a .webp sibling or is too small).');
} else {
  const saved = ((1 - totalOut / totalIn) * 100).toFixed(1);
  console.log(
    `\nDone. ${converted} files. ${pretty(totalIn)} → ${pretty(totalOut)} (-${saved}%).`,
  );
}
