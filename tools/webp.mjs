// Pravi WebP verziju svake JPG fotografije u assets/img (pored JPG-a; JPG ostaje kao rezerva za stare browsere).
// node tools/webp.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'img');
let n = 0, jpg = 0, webp = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.jpg'))) {
  const ul = path.join(dir, f), iz = ul.replace(/\.jpg$/, '.webp');
  if (!fs.existsSync(iz) || fs.statSync(iz).mtimeMs < fs.statSync(ul).mtimeMs) await sharp(ul).webp({ quality: 74, effort: 5 }).toFile(iz);
  jpg += fs.statSync(ul).size; webp += fs.statSync(iz).size; n++;
}
console.log(`webp: ${n} fotografija, JPG ${(jpg / 1e6).toFixed(1)} MB -> WebP ${(webp / 1e6).toFixed(1)} MB`);
