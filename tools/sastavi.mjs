// Ubacuje ISTI header, futer, donju traku, fioku i dugme za poziv iz index.html u stranice iz tools/strane/.
// Rezultat su obični statični HTML fajlovi u korenu (sajt nema build korak; ovo je samo alat za kopiranje).
// Oznaka u izvoru:  <!-- meni: kuhinje.html -->   (ili "-" ako nijedna stavka nije aktivna)
// node tools/sastavi.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const idx = fs.readFileSync(path.join(koren, 'index.html'), 'utf8');
const iseci = (a, b) => { const i = idx.indexOf(a); return idx.slice(i, idx.indexOf(b, i) + b.length); };
const header = iseci('<header class="hdr">', '</header>');
const futer = iseci('<footer class="futer">', '</footer>');
const traka = iseci('<nav class="traka"', '</nav>').replace(' aria-current="page"', '');
const fioka = iseci('<div class="fioka-sloj"', '</div>\n<a class="poziv-dugme"').replace('\n<a class="poziv-dugme"', '');
const poziv = iseci('<a class="poziv-dugme"', '</a>');
const glava = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#FAF8F5">
<link rel="icon" type="image/png" sizes="32x32" href="assets/img/logo/favicon-32.png">
<link rel="apple-touch-icon" href="assets/img/logo/favicon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Hanken+Grotesk:wght@400;500&display=swap">
<link rel="stylesheet" href="assets/css/site.css">
<script>document.documentElement.classList.add('js')</script>`;

const manifest = JSON.parse(fs.readFileSync(path.join(koren, 'assets', 'img', 'manifest.json'), 'utf8'));
const esc = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const dim = (ime) => { const d = manifest[ime]; if (!d) throw new Error('nema fotografije: ' + ime); return d; };
// {{FOTO:ime|alt|kategorija}}  -> stavka galerije (otvara lightbox)
const foto = (ime, alt, kat) => { const [w, h] = dim(ime); return `<li${kat ? ` data-kat="${kat}"` : ''}><a href="assets/img/${ime}-1600.jpg" data-lb data-otkrij><img src="assets/img/${ime}-800.jpg" width="${w}" height="${h}" loading="lazy" decoding="async" alt="${esc(alt)}"></a></li>`; };
// {{SLIKA:ime|alt|klasa|sizes|eager}} -> figura sa srcset
const slika = (ime, alt, klasa, sizes, eager) => { const [w, h] = dim(ime); return `<figure class="${klasa}"${eager ? '' : ' data-otkrij'}><img src="assets/img/${ime}-${eager ? 1600 : 800}.jpg" srcset="assets/img/${ime}-800.jpg 800w, assets/img/${ime}-1600.jpg 1600w" sizes="${sizes || '(min-width: 960px) 45vw, 92vw'}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'} alt="${esc(alt)}"></figure>`; };
// {{VIDEO:ime|naslov|od|do|klasa|kategorija}} -> uspravni video (pokreće se kad uđe u ekran)
const VDIM = { 'kuhinja-siva-kamen-obilazak': [480, 848], 'stan-ns-obilazak': [576, 1026] };
const video = (ime, naslov, od, doo, klasa, kat) => { const [w, h] = VDIM[ime] || [576, 1024]; return `<figure class="video${klasa ? ' ' + klasa : ''}" data-naslov="${esc(naslov)}"${kat ? ` data-kat="${kat}"` : ''}>
          <video muted loop playsinline preload="none" poster="assets/video/${ime}-poster.jpg" width="${w}" height="${h}"${od ? ` data-od="${od}"` : ''}${doo ? ` data-do="${doo}"` : ''}>
            <source src="assets/video/${ime}.mp4" type="video/mp4">
          </video>
        </figure>`; };
const dir = path.join(koren, 'tools', 'strane');
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.html'))) {
  let s = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = /<!-- meni: (\S+) -->\r?\n/.exec(s);
  const meni = m ? m[1] : '-';
  s = s.replace(/<!-- meni: \S+ -->\r?\n/, '');
  let h = header, t = traka, fi = fioka;
  if (meni !== '-') {
    h = h.replace(`<a href="${meni}">`, `<a href="${meni}" aria-current="page">`);
    t = t.replace(`<a class="tab" href="${meni}">`, `<a class="tab" href="${meni}" aria-current="page">`);
    fi = fi.replace(`<a href="${meni}">`, `<a href="${meni}" aria-current="page">`);
    // stranice usluga: u donjoj traci je aktivna stavka „Usluge“
    if (['kuhinje.html', 'plakari.html', 'sobe.html', 'kupatila.html'].includes(meni)) t = t.replace('class="tab tab-usluge"', 'class="tab tab-usluge" data-aktivna');
  }
  s = s.replace(/{{FOTO:([^}]+)}}/g, (_, a) => foto(...a.split('|')))
       .replace(/{{SLIKA:([^}]+)}}/g, (_, a) => slika(...a.split('|')))
       .replace(/{{VIDEO:([^}]+)}}/g, (_, a) => video(...a.split('|')));
  s = s.replace('{{GLAVA}}', glava).replace('{{HEADER}}', h).replace('{{FUTER}}', futer).replace('{{TRAKA}}', t).replace('{{FIOKA}}', fi).replace('{{POZIV}}', poziv);
  fs.writeFileSync(path.join(koren, f), s);
  console.log(f);
}
