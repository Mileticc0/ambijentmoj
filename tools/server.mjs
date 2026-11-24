// Lokalni statični server za sajt (bez zavisnosti). node tools/server.mjs [port]
// Podržava Range zahteve, da se videi mogu premotavati.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 8080);
const TIP = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.md': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };

export function pokreni(p = port) {
  const srv = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const fajl = path.join(koren, rel);
    if (!fajl.startsWith(koren) || rel.includes('/tools/node_modules') || !fs.existsSync(fajl) || fs.statSync(fajl).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404'); return;
    }
    const vel = fs.statSync(fajl).size;
    const tip = TIP[path.extname(fajl).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0, end = range[2] ? Number(range[2]) : vel - 1;
      res.writeHead(206, { 'Content-Type': tip, 'Content-Range': `bytes ${start}-${end}/${vel}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-cache' });
      fs.createReadStream(fajl, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': tip, 'Content-Length': vel, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
      fs.createReadStream(fajl).pipe(res);
    }
  });
  return new Promise((r) => srv.listen(p, () => r(srv)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await pokreni();
  console.log(`Sajt: http://localhost:${port}/`);
}
