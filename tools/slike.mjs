// Kopira i smanjuje fotografije (800 / 1600 px) i logo. Originali u ../mojambijent_slike se ne menjaju.
// node tools/slike.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const izvor = path.resolve(koren, '..', 'mojambijent_slike');
const cilj = path.join(koren, 'assets', 'img');
const IZBACI = new Set(['kuhinja-zelena', 'kuhinja-kamen-ostrvo-1']); // zelena: zahtev klijenta; ostrvo-1: gradilište
fs.mkdirSync(path.join(cilj, 'logo'), { recursive: true });

const mapa = {};
for (const f of fs.readdirSync(izvor).filter((f) => f.endsWith('.jpg'))) {
  const ime = f.replace(/\.jpg$/, '');
  if (IZBACI.has(ime)) continue;
  const ulaz = sharp(path.join(izvor, f)).rotate();
  const meta = await ulaz.metadata();
  const w = meta.orientation >= 5 ? meta.height : meta.width;
  const h = meta.orientation >= 5 ? meta.width : meta.height;
  mapa[ime] = [w, h];
  for (const sir of [800, 1600]) {
    await sharp(path.join(izvor, f)).rotate().resize({ width: Math.min(sir, w) })
      .jpeg({ quality: 78, mozjpeg: true, progressive: true })
      .toFile(path.join(cilj, `${ime}-${sir}.jpg`));
  }
}
fs.writeFileSync(path.join(cilj, 'manifest.json'), JSON.stringify(mapa, null, 1));

// Logo: originali kopirani nepromenjeni + web verzije (isečak samo znaka za header, ceo logo za futer)
const logoIzv = path.join(izvor, 'logo');
for (const f of fs.readdirSync(logoIzv)) fs.copyFileSync(path.join(logoIzv, f), path.join(cilj, 'logo', f));
// znak „MA“ bez natpisa: gornjih 5192 od 5874 px (izmereno na providnom logu)
for (const boja of ['tamni', 'svetli']) {
  const src = path.join(logoIzv, `logo-${boja}-providan.png`);
  await sharp(src).extract({ left: 0, top: 0, width: 4000, height: 5192 }).resize({ width: 176 }).png().toFile(path.join(cilj, 'logo', `znak-${boja}.png`));
  await sharp(src).resize({ width: 400 }).png().toFile(path.join(cilj, 'logo', `ceo-${boja}.png`));
}
for (const s of [32, 180, 512]) await sharp(path.join(logoIzv, 'logo-krug-ikona.png')).resize(s, s).png().toFile(path.join(cilj, 'logo', `favicon-${s}.png`));
await sharp(path.join(logoIzv, 'logo-zlatni-na-tamnom.png')).resize(1200, 630, { fit: 'contain', background: '#3F3131' }).jpeg({ quality: 85 }).toFile(path.join(cilj, 'logo', 'og-1200.jpg'));
console.log('fotografija:', Object.keys(mapa).length);
