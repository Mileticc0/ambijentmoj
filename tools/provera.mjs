// Screenshotovi i provere u pravom Chrome-u (Playwright).
// node tools/provera.mjs index [--sirine 1440,390,320] [--izlaz screenshots] [--sufiks -x] [--js "kod pre slikanja"] [--url putanja]
// Proverava: horizontalni skrol, greške u konzoli, neuspele zahteve (404), linkove na nepostojeće stranice.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2);
const opc = (k, d) => { const i = arg.indexOf(k); return i >= 0 ? arg[i + 1] : d; };
const strana = arg[0] || 'index';
const sirine = opc('--sirine', '1440,390,320').split(',').map(Number);
const izlaz = path.join(koren, opc('--izlaz', 'screenshots'));
const sufiks = opc('--sufiks', '');
const js = opc('--js', '');
const url = 'http://localhost:8080/' + opc('--url', `${strana}.html`);
fs.mkdirSync(izlaz, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let problemi = 0;
for (const w of sirine) {
  const visina = { 1440: 900, 390: 844, 320: 568 }[w] || 900;
  const mob = w < 960;
  const ctx = await browser.newContext({ viewport: { width: w, height: visina }, deviceScaleFactor: 1, isMobile: mob, hasTouch: mob });
  const page = await ctx.newPage();
  const greske = [];
  page.on('console', (m) => { if (m.type() === 'error') greske.push('konzola: ' + m.text()); });
  page.on('pageerror', (e) => greske.push('JS: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith('http://localhost')) greske.push(`${r.status()} ${r.url()}`); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  if (js) { await page.evaluate(js); await page.waitForTimeout(900); }
  await page.screenshot({ path: path.join(izlaz, `${strana}-${w}${sufiks}.png`) });
  if (!js) {
    // prođi kroz stranicu (otkrivanje fotografija), pa cela stranica
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 500)); });
    await page.screenshot({ path: path.join(izlaz, `${strana}-${w}${sufiks}-cela.jpg`), fullPage: true, type: 'jpeg', quality: 72 });
  }
  const info = await page.evaluate(() => {
    const sw = document.documentElement.scrollWidth, iw = innerWidth;
    const siroki = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > iw + 1) && getComputedStyle(e).position !== 'fixed'; }).slice(0, 5).map((e) => e.tagName + '.' + e.className);
    const linkovi = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /^[a-z0-9-]+\.html/.test(h));
    return { sw, iw, siroki, linkovi: [...new Set(linkovi)] };
  });
  for (const l of info.linkovi) { const f = l.split('#')[0]; if (!fs.existsSync(path.join(koren, f))) greske.push('link na nepostojeću stranicu: ' + l); }
  const ok = info.sw <= info.iw && !greske.length;
  if (!ok) problemi++;
  console.log(`${strana} ${w}: skrol ${info.sw}/${info.iw}${info.siroki.length ? ' šire od ekrana: ' + info.siroki.join(', ') : ''}${greske.length ? '\n  ' + greske.join('\n  ') : ' · bez grešaka'}`);
  await ctx.close();
}
await browser.close();
process.exit(problemi ? 1 : 0);
