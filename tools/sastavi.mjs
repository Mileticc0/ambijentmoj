// Ubacuje ISTI header (sa padajućim menijem), futer, meni za telefon i dugme za poziv iz index.html u stranice iz tools/strane/.
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
// meni za telefon (preko celog ekrana). Stari izvori imaju {{TRAKA}} i {{FIOKA}}: traka više ne postoji, na mesto fioke ide ovaj meni
const mobMeni = iseci('<div class="mob-meni"', '</div>\n<a class="poziv-dugme"').replace('\n<a class="poziv-dugme"', '').replace(' aria-current="page"', '');
const poziv = iseci('<a class="poziv-dugme"', '</a>');
// koraci „Kako do ponude“: isti svuda (Početna je izvor)
const koraci = iseci('<ol class="koraci">', '</ol>');
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
const VDIM = { 'kuhinja-siva-kamen-obilazak': [480, 848], 'stan-ns-obilazak': [576, 1026], 'klasicna-kuhinja-vitrine-reel': [720, 1280], 'zidni-krevet-aco-objasnjava-reel': [720, 1280] };
// 7. argument „zvuk“: video sa govorom/muzikom, ne vrti se sam (poster + „Pogledaj video“)
const video = (ime, naslov, od, doo, klasa, kat, zvuk) => { const [w, h] = VDIM[ime] || [576, 1024]; return `<figure class="video${klasa ? ' ' + klasa : ''}" data-naslov="${esc(naslov)}"${kat ? ` data-kat="${kat}"` : ''}${zvuk ? ' data-zvuk' : ''}>
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
  let h = header, mm = mobMeni;
  if (meni !== '-') {
    h = h.replace(`<a href="${meni}">`, `<a href="${meni}" aria-current="page">`);
    mm = mm.replace(`<a href="${meni}">`, `<a href="${meni}" aria-current="page">`);
    // Radovi: aktivna je stavka „Radovi“ (padajući meni)
    if (meni === 'radovi.html') { h = h.replace('data-meni="radovi"', 'data-meni="radovi" data-aktivna'); mm = mm.replace('data-meni="radovi"', 'data-meni="radovi" data-aktivna'); }
    // stranice usluga: „Usluge“ je aktivna stavka u meniju
    if (['kuhinje.html', 'plakari.html', 'sobe.html', 'zidni-krevet.html', 'kupatila.html'].includes(meni)) {
      h = h.replace('data-meni="usluge"', 'data-meni="usluge" data-aktivna');
      mm = mm.replace('data-meni="usluge"', 'data-meni="usluge" data-aktivna');
    }
  }
  s = s.replace(/{{FOTO:([^}]+)}}/g, (_, a) => foto(...a.split('|')))
       .replace(/{{SLIKA:([^}]+)}}/g, (_, a) => slika(...a.split('|')))
       .replace(/{{VIDEO:([^}]+)}}/g, (_, a) => video(...a.split('|')));
  s = s.replace('{{GLAVA}}', glava).replace('{{HEADER}}', h).replace('{{FUTER}}', futer).replace(/\n?\{\{TRAKA\}\}/, '').replace('{{FIOKA}}', mm).replace('{{POZIV}}', poziv).replace('{{KORACI}}', koraci);
  fs.writeFileSync(path.join(koren, f), s);
  console.log(f);
}
