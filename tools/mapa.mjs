// Pravi assets/slike-mapa.md iz samih stranica (koja fotografija i video su gde) i proverava ponavljanja.
// node tools/mapa.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strane = ['index.html', 'kuhinje.html', 'plakari.html', 'sobe.html', 'zidni-krevet.html', 'kupatila.html', 'radovi.html', 'o-nama.html', 'kontakt.html', 'privatnost.html', 'uslovi.html'];
const manifest = Object.keys(JSON.parse(fs.readFileSync(path.join(koren, 'assets/img/manifest.json'), 'utf8')));
const gde = {}, vgde = {};
let md = '# Mapa fotografija i videa\n\nPravi je `tools/mapa.mjs` iz samih stranica. Svaka fotografija i svaki video su na sajtu tačno jednom.\n\n';
md += '## Ne koriste se nigde\n- jedna fotografija i jedan video koje je klijent tražio da se uklone (vidi tools/slike.mjs i tools/video-kadrovi.mjs)\n- kuhinja-kamen-ostrvo-1.jpg (gradilište)\n\n';
md += '## Fioka „Usluge“ (telefon, ista na svim stranicama)\nSličice su kadrovi iz videa (assets/img/fioka-*.jpg), ne fotografije, da se nijedna fotografija ne ponovi.\n\n';
for (const f of strane) {
  const s = fs.readFileSync(path.join(koren, f), 'utf8').replace(/<div class="fioka"[\s\S]*?<\/div>\n<a class="poziv-dugme"/, '');
  const main = s.slice(s.indexOf('<main'), s.indexOf('</main>'));
  const redovi = [];
  // sekcije po naslovu
  const delovi = main.split(/<section|<article/);
  for (const d of delovi) {
    const n = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/.exec(d);
    const naslov = n ? n[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() : '';
    const slike = [...new Set([...d.matchAll(/assets\/img\/([a-z0-9-]+?)-(?:800|1600)\.jpg/g)].map((x) => x[1]))];
    const videi = [...d.matchAll(/<video[^>]*?(?:data-od="([\d.]+)")?[^>]*?(?:data-do="([\d.]+)")?>\s*<source src="assets\/video\/([a-z0-9-]+)\.mp4"/g)].map((x) => ({ ime: x[3], od: x[1], do: x[2] }));
    slike.forEach((i) => (gde[i] = (gde[i] || []).concat(f)));
    videi.forEach((v) => (vgde[v.ime] = (vgde[v.ime] || []).concat(f)));
    if (slike.length) redovi.push(`| ${naslov} | ${slike.join(', ')} |`);
    videi.forEach((v) => redovi.push(`| ${naslov} | video ${v.ime}.mp4${v.od || v.do ? ` (isečak ${v.od || 0}–${v.do || 'kraj'} s)` : ''} |`));
  }
  if (redovi.length) md += `## ${f}\n| Sekcija | Fotografije / video |\n|---|---|\n${redovi.join('\n')}\n\n`;
}
const dupl = Object.entries(gde).filter(([, x]) => x.length > 1);
const vdupl = Object.entries(vgde).filter(([, x]) => x.length > 1);
const nekor = manifest.filter((k) => !gde[k]);
md += `## Provera\n- Fotografija: ${manifest.length}, iskorišćeno: ${Object.keys(gde).length}, neiskorišćenih: ${nekor.length ? nekor.join(', ') : 'nema'}\n- Ponavljanja fotografija: ${dupl.length ? dupl.map(([k, x]) => k + ' (' + x.join(', ') + ')').join('; ') : 'nema'}\n- Videa: ${Object.keys(vgde).length}, ponavljanja: ${vdupl.length ? vdupl.map(([k]) => k).join(', ') : 'nema'}\n`;
fs.writeFileSync(path.join(koren, 'assets', 'slike-mapa.md'), md);
console.log(md.split('## Provera')[1]);
process.exit(dupl.length || vdupl.length ? 1 : 0);
