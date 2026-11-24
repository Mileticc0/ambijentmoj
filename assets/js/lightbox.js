/* Lightbox za fotografije (gestures): prst vodi sliku 1:1, otpuštanje odlučuje po putu (30 %) ili brzini (> 0,11 px/ms).
   Levo/desno menja sliku (guma na krajevima), na dole zatvara. ← → Esc, brojač „03 / 09“, fokus ostaje u dijalogu.
   Upotreba: <ul data-galerija> … <a href="slika-1600.jpg" data-lb><img …></a> … */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
  var IK = { x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', l: '<path d="m15 18-6-6 6-6"/>', d: '<path d="m9 18 6-6-6-6"/>' };
  var svg = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var dva = function (n) { return (n < 10 ? '0' : '') + n; };

  var el, sloj, traka, brojac, btnL, btnD, stavke = [], i = 0, W = 0, H = 0, otvoren = false, okidac = null;

  function napravi() {
    el = document.createElement('div');
    el.className = 'lb'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Fotografije');
    el.innerHTML = '<div class="lb-sloj"></div><div class="lb-scena"><div class="lb-traka"></div></div>' +
      '<div class="lb-vrh"><span class="lb-brojac label num" aria-live="polite"></span><button class="lb-btn lb-x" type="button" aria-label="Zatvori">' + svg(IK.x) + '</button></div>' +
      '<button class="lb-btn lb-l" type="button" aria-label="Prethodna fotografija">' + svg(IK.l) + '</button>' +
      '<button class="lb-btn lb-d" type="button" aria-label="Sledeća fotografija">' + svg(IK.d) + '</button>';
    document.body.appendChild(el);
    sloj = el.querySelector('.lb-sloj'); traka = el.querySelector('.lb-traka'); brojac = el.querySelector('.lb-brojac');
    btnL = el.querySelector('.lb-l'); btnD = el.querySelector('.lb-d');
    el.querySelector('.lb-x').addEventListener('click', zatvori);
    btnL.addEventListener('click', function () { idi(i - 1); });
    btnD.addEventListener('click', function () { idi(i + 1); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); zatvori(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); idi(i - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); idi(i + 1); }
      else if (e.key === 'Tab') {
        var f = [].slice.call(el.querySelectorAll('button:not([disabled])')), a = f.indexOf(document.activeElement);
        e.preventDefault(); f[(a + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    var scena = el.querySelector('.lb-scena');
    scena.addEventListener('pointerdown', dole);
    scena.addEventListener('click', function (e) { if (e.target === scena || e.target.classList.contains('lb-slajd')) zatvori(); });
    window.addEventListener('resize', function () { if (otvoren) { meri(); postavi(0, 0, true); } });
  }

  function meri() { W = el.clientWidth; H = el.clientHeight; }
  function postavi(x, y, bez) {
    traka.style.transition = bez ? 'none' : '';
    traka.style.transform = 'translate3d(' + (-i * W + x) + 'px,' + y + 'px,0)';
    sloj.style.opacity = String(1 - Math.min(1, Math.max(0, y) / (H * 0.6)));
  }
  function osvezi() {
    brojac.textContent = dva(i + 1) + ' / ' + dva(stavke.length);
    btnL.disabled = i === 0; btnD.disabled = i === stavke.length - 1;
    [i - 1, i, i + 1].forEach(function (n) { var s = traka.children[n]; if (s) { var img = s.querySelector('img'); if (!img.src) img.src = img.dataset.src; } });
  }
  function idi(n) {
    n = Math.max(0, Math.min(stavke.length - 1, n));
    i = n; osvezi(); postavi(0, 0, reduced.matches);
  }

  /* gest */
  var pid = null, sx = 0, sy = 0, osa = null, dx = 0, dy = 0, uz = [];
  var guma = function (d, max) { return Math.sign(d) * max * (1 - 1 / (Math.abs(d) / max * 0.55 + 1)); };
  function dole(e) {
    if (e.button !== 0 || e.target.closest('.lb-btn')) return;
    pid = e.pointerId; sx = e.clientX; sy = e.clientY; osa = null; dx = dy = 0; uz = [[e.clientX, e.clientY, e.timeStamp]];
    var tr = getComputedStyle(traka).transform; // prekid: kreni odatle gde je traka sada
    if (tr && tr !== 'none') { var m = new DOMMatrix(tr); sx -= m.m41 + i * W; sy -= m.m42; }
    e.currentTarget.setPointerCapture(pid);
    e.currentTarget.addEventListener('pointermove', pomeraj);
    e.currentTarget.addEventListener('pointerup', gore);
    e.currentTarget.addEventListener('pointercancel', gore);
  }
  function pomeraj(e) {
    if (e.pointerId !== pid) return;
    var x = e.clientX - sx, y = e.clientY - sy;
    if (!osa) { if (Math.abs(x) < 8 && Math.abs(y) < 8) return; osa = Math.abs(x) > Math.abs(y) ? 'x' : 'y'; }
    uz.push([e.clientX, e.clientY, e.timeStamp]); if (uz.length > 6) uz.shift();
    if (osa === 'x') { var ivica = (i === 0 && x > 0) || (i === stavke.length - 1 && x < 0); dx = ivica ? guma(x, W * 0.5) : x; dy = 0; }
    else { dy = y < 0 ? guma(y, H * 0.3) : y; dx = 0; }
    postavi(dx, dy, true);
  }
  function gore(e) {
    if (e.pointerId !== pid) return;
    var t = e.currentTarget;
    t.removeEventListener('pointermove', pomeraj); t.removeEventListener('pointerup', gore); t.removeEventListener('pointercancel', gore);
    pid = null;
    if (!osa) return;
    var a = uz[0], b = uz[uz.length - 1], dt = Math.max(1, b[2] - a[2]), vx = (b[0] - a[0]) / dt, vy = (b[1] - a[1]) / dt;
    if (osa === 'x') {
      var n = i;
      if ((dx < -W * 0.3 || vx < -0.11) && i < stavke.length - 1) n = i + 1;
      else if ((dx > W * 0.3 || vx > 0.11) && i > 0) n = i - 1;
      idi(n);
    } else if (dy > H * 0.3 || vy > 0.11) zatvori();
    else postavi(0, 0);
    // posle gesta klik ne zatvara
    var blok = function (ev) { ev.stopPropagation(); }; el.addEventListener('click', blok, { capture: true, once: true });
    setTimeout(function () { el.removeEventListener('click', blok, { capture: true }); }, 60);
  }

  function otvori(lista, start) {
    if (!el) napravi();
    stavke = lista; i = start; okidac = document.activeElement;
    traka.innerHTML = lista.map(function (s) {
      return '<figure class="lb-slajd"><img data-src="' + s.src + '" width="' + s.w + '" height="' + s.h + '" alt="' + s.alt.replace(/"/g, '&quot;') + '" decoding="async" draggable="false"></figure>';
    }).join('');
    el.hidden = false; otvoren = true;
    document.documentElement.style.overflow = 'hidden';
    meri(); osvezi(); postavi(0, 0, true);
    el.querySelector('.lb-x').focus({ preventScroll: true });
    if (!reduced.matches) {
      sloj.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      traka.children[i].animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE_DRAWER });
    }
  }
  function zatvori() {
    if (!otvoren) return;
    otvoren = false;
    var kraj = function () {
      el.hidden = true; traka.innerHTML = ''; sloj.style.opacity = '';
      document.documentElement.style.overflow = '';
      if (okidac && okidac.focus) okidac.focus({ preventScroll: true });
    };
    if (reduced.matches) { kraj(); return; }
    var a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    a.onfinish = kraj;
  }

  [].forEach.call(document.querySelectorAll('[data-galerija]'), function (g) {
    g.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-lb]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      var linkovi = [].slice.call(g.querySelectorAll('a[data-lb]')).filter(function (l) { return !l.closest('[hidden]'); }); // samo vidljive (filter na Radovima)
      otvori(linkovi.map(function (l) { var img = l.querySelector('img'); return { src: l.getAttribute('href'), w: img.getAttribute('width'), h: img.getAttribute('height'), alt: img.alt }; }), linkovi.indexOf(a));
    });
  });
})();
