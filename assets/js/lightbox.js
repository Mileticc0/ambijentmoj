/* Lightbox (gestures): FLIP iz slike, swipe levo/desno sa momentumom, povlačenje na dole zatvara,
   rubber-band na ivicama, ← → Esc, brojač „03 / 12“. Track faza 1:1, release = opruga sa brzinom prsta. */
(function () {
  'use strict';
  var MA = window.MA || (window.MA = {});
  var EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var IKONA = {
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    l: '<path d="m15 18-6-6 6-6"/>',
    d: '<path d="m9 18 6-6-6-6"/>'
  };
  function svg(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  function dva(n) { return (n < 10 ? '0' : '') + n; }

  var el, pozadina, stage, track, brojac, natpis, btnL, btnD, btnX;
  var stavke = [], i = 0, W = 0, H = 0, otvoren = false, okidac = null, uzmiSliku = null;
  var x = 0, y = 0, opruga = null;

  function napravi() {
    el = document.createElement('div');
    el.className = 'lb';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Fotografije');
    el.hidden = true;
    el.innerHTML =
      '<div class="lb-pozadina"></div>' +
      '<div class="lb-stage"><div class="lb-track"></div></div>' +
      '<div class="lb-traka">' +
        '<span class="lb-brojac label num" aria-live="polite"></span>' +
        '<span class="lb-natpis label"></span>' +
        '<button class="lb-btn lb-x" type="button" aria-label="Zatvori">' + svg(IKONA.x) + '</button>' +
      '</div>' +
      '<button class="lb-btn lb-l" type="button" aria-label="Prethodna fotografija">' + svg(IKONA.l) + '</button>' +
      '<button class="lb-btn lb-d" type="button" aria-label="Sledeća fotografija">' + svg(IKONA.d) + '</button>';
    document.body.appendChild(el);
    pozadina = el.querySelector('.lb-pozadina');
    stage = el.querySelector('.lb-stage');
    track = el.querySelector('.lb-track');
    brojac = el.querySelector('.lb-brojac');
    natpis = el.querySelector('.lb-natpis');
    btnL = el.querySelector('.lb-l'); btnD = el.querySelector('.lb-d'); btnX = el.querySelector('.lb-x');
    btnX.addEventListener('click', function () { zatvori(0); });
    btnL.addEventListener('click', function () { idi(i - 1, 0); });
    btnD.addEventListener('click', function () { idi(i + 1, 0); });
    el.addEventListener('keydown', tastatura);
    stage.addEventListener('pointerdown', dole);
    window.addEventListener('resize', function () { if (otvoren) { meri(); postavi(); } });
  }

  function meri() { W = stage.clientWidth; H = stage.clientHeight; }
  function postavi() {
    track.style.transform = 'translate3d(' + (-i * W + x) + 'px,0,0)';
    var s = slajd(i);
    if (s) s.style.transform = y ? 'translate3d(0,' + y + 'px,0) scale(' + (1 - Math.max(0, y) / H * 0.12) + ')' : '';
    pozadina.style.opacity = String(1 - Math.min(1, Math.max(0, y) / (H * 0.6)));
  }
  function slajd(n) { return track.children[n]; }
  function osvezi() {
    brojac.textContent = dva(i + 1) + ' / ' + dva(stavke.length);
    natpis.textContent = stavke[i].label || '';
    btnL.disabled = i === 0;
    btnD.disabled = i === stavke.length - 1;
    // učitaj susede
    [i - 1, i, i + 1].forEach(function (n) {
      var s = slajd(n); if (!s) return;
      var img = s.querySelector('img');
      if (!img.getAttribute('src')) img.setAttribute('src', img.dataset.src);
    });
  }

  /* ---------- opruga (release faza), seeded brzinom prsta, prekidiva ---------- */
  function pokreniOprugu(cilj, v0, osa, gotovo) {
    stani();
    if (reduced.matches) { if (osa === 'x') x = cilj; else y = cilj; postavi(); if (gotovo) gotovo(); return; }
    var k = 420, c = 2 * Math.sqrt(k) * 0.86; // bounce ≈ 0.14
    var pos = osa === 'x' ? x : y, vel = v0 * 1000, poslednje = performance.now();
    opruga = { id: 0 };
    var korak = function (t) {
      var dt = Math.min(0.032, (t - poslednje) / 1000); poslednje = t;
      var sila = -k * (pos - cilj) - c * vel;
      vel += sila * dt; pos += vel * dt;
      if (Math.abs(pos - cilj) < 0.5 && Math.abs(vel) < 20) { pos = cilj; opruga = null; }
      if (osa === 'x') x = pos; else y = pos;
      postavi();
      if (opruga) opruga.id = requestAnimationFrame(korak); else if (gotovo) gotovo();
    };
    opruga.id = requestAnimationFrame(korak);
  }
  function stani() { if (opruga) { cancelAnimationFrame(opruga.id); opruga = null; } }

  /* ---------- track faza: 1:1 sa prstom ---------- */
  var pid = null, sx, sy, osa = null, uzorci = [];
  function dole(e) {
    if (e.button !== 0 || e.target.closest('.lb-btn')) return;
    stani();
    pid = e.pointerId; sx = e.clientX - x; sy = e.clientY - y; osa = x || y ? (x ? 'x' : 'y') : null;
    uzorci = [[e.clientX, e.clientY, e.timeStamp]];
    stage.setPointerCapture(pid);
    stage.addEventListener('pointermove', pomeraj);
    stage.addEventListener('pointerup', gore);
    stage.addEventListener('pointercancel', gore);
  }
  function guma(d, max) { var a = Math.abs(d); return Math.sign(d) * max * (1 - 1 / (a / max * 0.55 + 1)); }
  function pomeraj(e) {
    if (e.pointerId !== pid) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (!osa) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      osa = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    uzorci.push([e.clientX, e.clientY, e.timeStamp]);
    if (uzorci.length > 6) uzorci.shift();
    if (osa === 'x') {
      var naIvici = (i === 0 && dx > 0) || (i === stavke.length - 1 && dx < 0);
      x = naIvici ? guma(dx, W * 0.5) : dx;
    } else {
      y = dy < 0 ? guma(dy, H * 0.3) : dy;
    }
    postavi();
  }
  function brzina() {
    var a = uzorci[0], b = uzorci[uzorci.length - 1];
    var dt = Math.max(1, b[2] - a[2]);
    return [(b[0] - a[0]) / dt, (b[1] - a[1]) / dt]; // px/ms
  }
  function gore(e) {
    if (e.pointerId !== pid) return;
    stage.removeEventListener('pointermove', pomeraj);
    stage.removeEventListener('pointerup', gore);
    stage.removeEventListener('pointercancel', gore);
    pid = null;
    var v = brzina();
    if (osa === 'x') {
      var cilj = i;
      if ((x < -W * 0.3 || v[0] < -0.11) && i < stavke.length - 1) cilj = i + 1;
      else if ((x > W * 0.3 || v[0] > 0.11) && i > 0) cilj = i - 1;
      idi(cilj, v[0]);
    } else if (osa === 'y') {
      if (y > H * 0.3 || v[1] > 0.11) zatvori(v[1]);
      else pokreniOprugu(0, v[1], 'y');
    }
    osa = null;
  }

  function idi(n, v) {
    n = Math.max(0, Math.min(stavke.length - 1, n));
    if (n !== i) { x += (n - i) * W; i = n; osvezi(); }
    y = 0; postavi();
    pokreniOprugu(0, v || 0, 'x');
  }

  function tastatura(e) {
    if (e.key === 'Escape') { e.preventDefault(); zatvori(0); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); idi(i - 1, 0); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); idi(i + 1, 0); }
    else if (e.key === 'Tab') {
      var f = [].slice.call(el.querySelectorAll('button:not([disabled])'));
      var a = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(a + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }

  /* ---------- FLIP: iz sličice u pun prikaz i nazad ---------- */
  function flipOd(img, rect) {
    var r = img.getBoundingClientRect();
    if (!rect || !r.width) return null;
    var s = Math.max(rect.width / r.width, rect.height / r.height);
    var cx = Math.max(0, (r.width - rect.width / s) / 2), cy = Math.max(0, (r.height - rect.height / s) / 2);
    var tx = rect.left + rect.width / 2 - (r.left + r.width / 2), ty = rect.top + rect.height / 2 - (r.top + r.height / 2);
    return {
      transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')',
      clipPath: 'inset(' + cy + 'px ' + cx + 'px ' + cy + 'px ' + cx + 'px)'
    };
  }

  function otvori(lista, start, opcije) {
    if (!el) napravi();
    opcije = opcije || {};
    stavke = lista; i = start; x = 0; y = 0;
    okidac = document.activeElement;
    uzmiSliku = opcije.slicica || null;
    track.innerHTML = stavke.map(function (s) {
      return '<figure class="lb-slajd"><img data-src="' + s.src + '" srcset="' + (s.srcset || '') + '" sizes="100vw" width="' + s.w + '" height="' + s.h + '" alt="' + (s.alt || '').replace(/"/g, '&quot;') + '" decoding="async"></figure>';
    }).join('');
    el.hidden = false;
    otvoren = true;
    document.documentElement.classList.add('lb-otvoren');
    meri(); osvezi(); postavi();
    btnX.focus({ preventScroll: true });

    if (reduced.matches) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }); return; }
    pozadina.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    el.querySelector('.lb-traka').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 120, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' });
    var img = slajd(i).querySelector('img');
    var od = uzmiSliku && uzmiSliku(i);
    var f = od && flipOd(img, od.getBoundingClientRect());
    if (f) img.animate([f, { transform: 'none', clipPath: 'inset(0px)' }], { duration: 420, easing: EASE_DRAWER });
    else img.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE_DRAWER });
  }

  function zatvori(v) {
    if (!otvoren) return;
    otvoren = false; stani();
    var kraj = function () {
      el.hidden = true; track.innerHTML = ''; x = 0; y = 0;
      document.documentElement.classList.remove('lb-otvoren');
      if (okidac && okidac.focus) okidac.focus({ preventScroll: true });
    };
    if (reduced.matches) { kraj(); return; }
    var img = slajd(i).querySelector('img');
    var cilj = uzmiSliku && uzmiSliku(i);
    var cr = cilj && cilj.getBoundingClientRect();
    var vidljiva = cr && cr.bottom > 0 && cr.top < window.innerHeight && cr.width;
    var s = slajd(i); s.style.transform = '';
    var f = vidljiva && flipOd(img, cr);
    var start = { transform: y ? 'translateY(' + y + 'px)' : 'none', clipPath: 'inset(0px)' };
    var a = f ? img.animate([start, f], { duration: 320, easing: EASE_DRAWER, fill: 'forwards' })
              : img.animate([start, { transform: 'translateY(' + (H * 0.5 + Math.max(0, v) * 200) + 'px)', opacity: 0 }], { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' });
    pozadina.animate([{ opacity: pozadina.style.opacity || 1 }, { opacity: 0 }], { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' });
    el.querySelector('.lb-traka').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    a.onfinish = function () { el.getAnimations({ subtree: true }).forEach(function (x) { x.cancel(); }); pozadina.style.opacity = ''; kraj(); };
  }

  MA.lightbox = { otvori: otvori, zatvori: zatvori };
})();
