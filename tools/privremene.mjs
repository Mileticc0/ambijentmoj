// Privremene stranice (da nijedan link ne vodi na 404) sa ISTIM headerom, futerom i donjom trakom kao index.html.
// Zameniće ih prave stranice, jedna po jedna. node tools/privremene.mjs
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

const strane = [
  ['kuhinje.html', 'Kuhinje po meri Novi Sad', 'Kuhinje', 'kuhinje.html', []],
  ['plakari.html', 'Plakari po meri Novi Sad', 'Plakari i hodnici', 'plakari.html', []],
  ['sobe.html', 'Sobe i zidni kreveti po meri', 'Sobe', 'sobe.html', []],
  ['kupatila.html', 'Kupatila po meri', 'Kupatila', 'kupatila.html', []],
  ['radovi.html', 'Radovi', 'Radovi', 'radovi.html', ['novi-sad', 'pula']],
  ['o-nama.html', 'O nama', 'O nama', 'o-nama.html', []],
  ['kontakt.html', 'Kontakt', 'Kontakt', 'kontakt.html', []],
  ['privatnost.html', 'Privatnost', 'Privatnost', '', []],
  ['uslovi.html', 'Uslovi', 'Uslovi', '', []],
];
for (const [fajl, naslov, h1, meni, sidra] of strane) {
  if (fs.existsSync(path.join(koren, fajl)) && !fs.readFileSync(path.join(koren, fajl), 'utf8').includes('data-privremena')) continue;
  let h = header, t = traka;
  if (meni) { h = h.replace(`<a href="${meni}">`, `<a href="${meni}" aria-current="page">`); t = t.replace(`<a class="tab" href="${meni}">`, `<a class="tab" href="${meni}" aria-current="page">`); }
  const html = `<!doctype html>
<html lang="sr-Latn" data-privremena>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${naslov} · Moj Ambijent</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#FAF8F5">
<link rel="icon" type="image/png" sizes="32x32" href="assets/img/logo/favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Hanken+Grotesk:wght@400;500&display=swap">
<link rel="stylesheet" href="assets/css/site.css">
<script>document.documentElement.classList.add('js')</script>
</head>
<body>
<a class="skip" href="#sadrzaj">Preskoči na sadržaj</a>

${h}

<main id="sadrzaj">
  <section class="sec prosta">
    <div class="wrap">
      <h1>${h1}</h1>
      <p class="tiho">[STRANICA U IZRADI]</p>
${sidra.map((s) => `      <h2 id="${s}" style="margin-top:48px;font-size:32px">${s === 'novi-sad' ? 'Kompletan stan u Novom Sadu' : 'Stan u Puli'}</h2>\n      <p class="tiho">[U IZRADI]</p>`).join('\n')}
    </div>
  </section>
</main>

${futer}

${t}
${fioka}
${poziv}

<script src="assets/js/site.js" defer></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(koren, fajl), html);
  console.log(fajl);
}
