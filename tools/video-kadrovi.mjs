// Kopira videe u assets/video i pravi pregled kadrova (za proveru teksta/loga na početku i kraju)
// i poster slike, preko Chrome-a (ffmpeg nije instaliran).
// node tools/video-kadrovi.mjs pregled           -> tools/kadrovi/<ime>.jpg (12 kadrova + vreme)
// node tools/video-kadrovi.mjs poster ime=sek ...  -> assets/video/<ime>-poster.jpg
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pokreni } from './server.mjs';

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const izvor = path.resolve(koren, '..', 'mojambijent_slike', 'video_tiktok', 'za_sajt');
const cilj = path.join(koren, 'assets', 'video');
fs.mkdirSync(cilj, { recursive: true });
for (const f of fs.readdirSync(izvor)) if (!fs.existsSync(path.join(cilj, f))) fs.copyFileSync(path.join(izvor, f), path.join(cilj, f));

const [rezim, ...arg] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const srv = await pokreni(8091);
await page.goto('http://localhost:8091/assets/');

async function kadrovi(fajl, vremena, w) {
  return page.evaluate(async ({ src, vremena, w }) => {
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.src = src;
    await new Promise((r, j) => { v.onloadeddata = r; v.onerror = () => j(new Error('load')); });
    const d = v.duration, out = [];
    const ts = vremena === 'pregled' ? Array.from({ length: 12 }, (_, i) => Math.min(d - 0.05, (d * i) / 11)) : vremena;
    for (const t of ts) {
      v.currentTime = t;
      await new Promise((r) => (v.onseeked = r));
      const c = document.createElement('canvas');
      c.width = w; c.height = Math.round((w * v.videoHeight) / v.videoWidth);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      out.push({ t, data: c.toDataURL('image/jpeg', 0.82) });
    }
    return { d, vw: v.videoWidth, vh: v.videoHeight, out };
  }, { src: '/assets/video/' + fajl, vremena, w });
}

if (rezim === 'pregled') {
  fs.mkdirSync(path.join(koren, 'tools', 'kadrovi'), { recursive: true });
  for (const f of fs.readdirSync(cilj).filter((f) => f.endsWith('.mp4'))) {
    const r = await kadrovi(f, 'pregled', 180);
    // složi 12 kadrova u jednu sliku sa vremenom
    const html = `<body style="margin:0;background:#fff;font:12px sans-serif"><div style="display:grid;grid-template-columns:repeat(6,180px);gap:4px">${r.out.map((k) => `<div><img src="${k.data}" style="width:180px;display:block"><div>${k.t.toFixed(1)}s</div></div>`).join('')}</div></body>`;
    const p2 = await browser.newPage({ viewport: { width: 1110, height: 800 } });
    await p2.setContent(html);
    await p2.screenshot({ path: path.join(koren, 'tools', 'kadrovi', f.replace('.mp4', '.jpg')), fullPage: true, type: 'jpeg', quality: 80 });
    await p2.close();
    console.log(`${f}  ${r.vw}x${r.vh}  ${r.d.toFixed(1)}s`);
  }
} else if (rezim === 'poster') {
  for (const a of arg) {
    // ime=sek            -> assets/video/<ime>-poster.jpg (720 px)
    // ime=sek=putanja=w  -> zadata putanja i širina (npr. sličice za fioku)
    const [ime, sek, izl, sir] = a.split('=');
    const r = await kadrovi(`${ime}.mp4`, [Number(sek)], Number(sir || 720));
    fs.writeFileSync(izl ? path.join(koren, izl) : path.join(cilj, `${ime}-poster.jpg`), Buffer.from(r.out[0].data.split(',')[1], 'base64'));
    console.log(`${ime}-poster.jpg @ ${sek}s  ${r.vw}x${r.vh}`);
  }
}
await browser.close();
srv.close();
