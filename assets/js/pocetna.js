/* Početna: ulaz heroja, uzorci + filter (FLIP), zidni krevet, tura „Soba po soba“. */
(function () {
  'use strict';
  var MA = window.MA;
  var EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var reduced = MA.reduced.matches;

  /* =========================================================
     1. Ulaz heroja (choreograph): slika clip-path, naslov red po red, dugme poslednje. ≤ 1.1 s
     ========================================================= */
  var hero = document.querySelector('.hero');
  var h1 = hero && hero.querySelector('h1');

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function podeliRedove(el) {
    var tekst = el.textContent.trim();
    var reci = tekst.split(/\s+/);
    el.innerHTML = reci.map(function (w) { return '<span class="w">' + esc(w) + '</span>'; }).join(' ');
    var redovi = [], top = null;
    [].forEach.call(el.querySelectorAll('.w'), function (s) {
      if (s.offsetTop !== top) { redovi.push([]); top = s.offsetTop; }
      redovi[redovi.length - 1].push(s.textContent);
    });
    el.innerHTML = redovi.map(function (r) { return '<span class="line"><span class="line-in">' + esc(r.join(' ')) + '</span></span>'; }).join('');
    el.setAttribute('aria-label', tekst);
    return tekst;
  }

  function ulaz() {
    if (!hero) return;
    if (reduced || !hero.animate) { hero.classList.remove('pre'); return; }
    var tekst = podeliRedove(h1);
    var redovi = h1.querySelectorAll('.line-in');
    var foto = hero.querySelector('.hero-photo');
    var ostalo = hero.querySelectorAll('[data-enter]:not(h1)');
    hero.classList.remove('pre');
    h1.style.opacity = '1';

    foto.animate([{ clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0)' }],
      { duration: 800, easing: EASE_OUT, fill: 'backwards' });
    var t = 200;
    [].forEach.call(redovi, function (r, i) {
      r.animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 500, delay: t + i * 60, easing: EASE_OUT, fill: 'backwards' });
    });
    var posle = t + redovi.length * 60 + 20;
    [].forEach.call(ostalo, function (el, i) {
      el.animate([{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 440, delay: Math.min(posle + i * 60, 640), easing: EASE_OUT, fill: 'backwards' });
    });
    // posle ulaza vraćamo običan tekst, da se naslov prelama normalno pri promeni širine
    var vrati = function () { if (h1.querySelector('.line')) { h1.textContent = tekst; h1.removeAttribute('aria-label'); } };
    setTimeout(function () { MA.resizeFns.push(vrati); }, 1200);
  }

  if (hero) {
    var fontovi = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontovi, new Promise(function (r) { setTimeout(r, 700); })]).then(ulaz);
  }

  /* =========================================================
     2. Uzorci: tap boji stranicu, radovi se filtriraju (FLIP 300 ms, prekidivo)
     ========================================================= */
  var IME = { orah: 'Orah', hrast: 'Hrast', lak: 'Beli mat', krem: 'Krem', kamen: 'Kamen', antracit: 'Antracit' };
  var SIDRO = { KUHINJA: 'kuhinje', PLAKAR: 'plakari', 'SPAVAĆA': 'spavace', DNEVNA: 'dnevne', KUPATILO: 'kupatila', HODNIK: 'hodnici', 'DEČIJA': 'decije' };
  // Vizuelni ton svake fotografije (procena po slici, nije tvrdnja o proizvođaču)
  // zajednički podaci (assets/js/radovi-data.js); hero fotografiju ne ponavljamo u mreži
  var RADOVI = (window.MA_RADOVI || []).filter(function (r) { return r[0] !== 'kuhinja-orah-lampe-1'; });

  // Prekidač „Najgori slučaj“ (?najgori=1): materijal bez ijedne slike, 40 slika u jednom tonu, dugi nazivi, č ć đ š ž
  var najgori = /[?&]najgori=1/.test(location.search);
  if (najgori) {
    RADOVI = RADOVI.filter(function (r) { return r[2] !== 'kamen'; });
    for (var n = 0; n < 40; n++) RADOVI.splice(2, 0, ['kuhinja-orah-l', 'KUHINJA SA TRPEZARIJSKIM DELOM, ŠANKOM, ČIVILUKOM I ĐAČKIM STOLOM', 'krem', 'Kuhinja sa trpezarijskim delom, primer ' + (n + 1), 1638, 2048, 'najgori-' + n]);
    var dugi = ['Kuhinja sa trpezarijom i šankom za doručak', 'Dnevna soba sa TV zidom, vitrinom i radnim kutkom', 'Spavaća soba roditelja', 'Dečija soba za Đorđa i Žaklinu, krevet na sprat', 'Ž'];
    [].forEach.call(document.querySelectorAll('.list-meta h3'), function (h, i) { if (dugi[i]) h.textContent = dugi[i]; });
    var tLead = document.querySelector('.tura-head p');
    if (tLead) tLead.textContent = 'Kompletan trosoban stan u Novom Sadu na Grbavici, od kuhinje i trpezarije do hodnika, kupatila i dečije sobe.';
  }

  var grid = document.querySelector('.radovi-grid');
  var prazno = document.querySelector('.radovi-prazno');
  var stanje = document.querySelector('.uz-stanje .tiho');
  var sveBtn = document.querySelector('.uz-sve');
  var uzSek = document.querySelector('.uzorci');
  var uzorci = [].slice.call(document.querySelectorAll('.uz'));
  var izabran = null;
  var MAX = 6;

  function lista(ton) {
    if (!ton) {
      var po = {}, out = [];
      RADOVI.forEach(function (r) { if (!po[r[2]] && out.length < MAX) { po[r[2]] = 1; out.push(r); } });
      return out;
    }
    return RADOVI.filter(function (r) { return r[2] === ton; }).slice(0, MAX);
  }

  // srpska množina: 1 rad, 2–4 rada, 5+ radova (11–14 radova)
  function radova(n) {
    var d = n % 10, s = n % 100;
    if (d === 1 && s !== 11) return 'rad';
    if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return 'rada';
    return 'radova';
  }

  function kljuc(r) { return r[6] || r[0]; }

  function napravi(r) {
    var li = document.createElement('li');
    li.className = 'rad';
    li.dataset.key = kljuc(r);
    li.innerHTML =
      '<a href="radovi.html#' + (SIDRO[r[1]] || '') + '">' +
      '<div class="rad-foto"><img src="assets/img/' + r[0] + '-800.jpg" srcset="assets/img/' + r[0] + '-800.jpg 800w, assets/img/' + r[0] + '-1600.jpg 1600w" sizes="(min-width: 960px) 30vw, 48vw" width="' + r[4] + '" height="' + r[5] + '" loading="lazy" decoding="async" alt="' + esc(r[3]) + '"></div>' +
      '<span class="label">' + esc(r[1]) + ' · ' + esc(IME[r[2]].toUpperCase()) + '</span></a>';
    return li;
  }

  function prikazi(ton, animiraj) {
    var nova = lista(ton);
    var stari = [].slice.call(grid.children).filter(function (c) { return !c.classList.contains('odlazi'); });
    // prekid: ono što je već odlazilo nestaje odmah
    [].forEach.call(grid.querySelectorAll('.odlazi'), function (c) { c.remove(); });

    var gr = grid.getBoundingClientRect();
    var prvi = new Map();
    stari.forEach(function (c) { prvi.set(c.dataset.key, c.getBoundingClientRect()); });
    stari.forEach(function (c) { c.getAnimations && c.getAnimations().forEach(function (a) { a.cancel(); }); });

    var kljucevi = new Set(nova.map(kljuc));
    var postojeci = new Map();
    stari.forEach(function (c) {
      if (kljucevi.has(c.dataset.key)) { postojeci.set(c.dataset.key, c); return; }
      if (!animiraj) { c.remove(); return; }
      var r = prvi.get(c.dataset.key);
      c.classList.add('odlazi');
      c.style.cssText = 'position:absolute;left:' + (r.left - gr.left) + 'px;top:' + (r.top - gr.top) + 'px;width:' + r.width + 'px;pointer-events:none;';
      c.setAttribute('aria-hidden', 'true');
      var a = c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.97)' }], { duration: 160, easing: EASE_OUT, fill: 'forwards' });
      a.onfinish = function () { c.remove(); };
    });

    var ulaze = [];
    nova.forEach(function (r) {
      var el = postojeci.get(kljuc(r));
      if (!el) { el = napravi(r); ulaze.push(el); }
      grid.appendChild(el);
    });
    // odlazeće držimo na kraju DOM-a da ne remete redosled
    [].forEach.call(grid.querySelectorAll('.odlazi'), function (c) { grid.appendChild(c); });

    prazno.hidden = nova.length > 0;

    if (animiraj) {
      postojeci.forEach(function (el, k) {
        var a = prvi.get(k), b = el.getBoundingClientRect();
        var dx = a.left - b.left, dy = a.top - b.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 300, easing: EASE_OUT });
      });
      ulaze.forEach(function (el, i) {
        el.animate([{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }],
          { duration: 300, delay: 60 + i * 30, easing: EASE_OUT, fill: 'backwards' });
      });
    }

    var broj = nova.length;
    stanje.textContent = ton
      ? (broj ? IME[ton] + ' · ' + broj + ' ' + radova(broj) : IME[ton] + ' · nema radova')
      : 'Svi materijali';
    sveBtn.hidden = !ton;
  }

  function izaberi(ton) {
    izabran = izabran === ton ? null : ton;
    uzorci.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mat === izabran)); });
    var t = izabran || 'lak';
    MA.setPageTone(t);
    // tekst prelazi u novi par na polovini crossfade-a (200 ms), kad je kontrast i dalje čitljiv
    clearTimeout(izaberi.t);
    izaberi.t = setTimeout(function () { uzSek.setAttribute('data-ton', t); MA.tick(); }, reduced ? 0 : 200);
    prikazi(izabran, !reduced);
    MA.tick();
  }

  if (grid) {
    uzorci.forEach(function (b) { b.addEventListener('click', function () { izaberi(b.dataset.mat); }); });
    sveBtn.addEventListener('click', function () { if (izabran) izaberi(izabran); });
    if (najgori) prikazi(null, false);
  }

  /* =========================================================
     3. Zidni krevet: sticky, tri fotografije, linija napretka (scaleX)
     ========================================================= */
  var krevet = document.querySelector('.krevet');
  if (krevet && !reduced) {
    var kFotke = krevet.querySelectorAll('.kr-fotke img');
    var kKoraci = krevet.querySelectorAll('.kr-koraci li');
    var kFill = krevet.querySelector('.kr-traka span');
    var kFaza = -1;
    MA.scrollFns.push(function () {
      var r = krevet.getBoundingClientRect();
      var ukupno = krevet.offsetHeight - window.innerHeight;
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      var p = Math.min(1, Math.max(0, -r.top / Math.max(1, ukupno)));
      kFill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      var f = Math.min(2, Math.floor(p * 3));
      if (f !== kFaza) {
        kFaza = f;
        for (var i = 0; i < 3; i++) {
          kFotke[i].classList.toggle('on', i === f);
          kKoraci[i].classList.toggle('on', i === f);
          if (i === f) kKoraci[i].setAttribute('aria-current', 'step'); else kKoraci[i].removeAttribute('aria-current');
        }
      }
    });
  }

  /* =========================================================
     4. Soba po soba: desktop = sticky + translateX vezan za skrol; telefon = scroll-snap
     ========================================================= */
  var tura = document.querySelector('.tura');
  if (tura) {
    var track = tura.querySelector('.tura-track');
    var sticky = tura.querySelector('.tura-sticky');
    var desktop = window.matchMedia('(min-width: 960px)');
    var put = 0, ukljucena = false;

    var postavi = function () {
      ukljucena = desktop.matches && !MA.reduced.matches;
      tura.classList.toggle('aktivna', ukljucena);
      if (!ukljucena) { tura.style.height = ''; track.style.transform = ''; return; }
      put = Math.max(0, track.scrollWidth - sticky.clientWidth);
      tura.style.height = (sticky.offsetHeight + put) + 'px';
    };
    var pomeri = function () {
      if (!ukljucena) return;
      var r = tura.getBoundingClientRect();
      if (r.bottom < -50 || r.top > window.innerHeight + 50) return;
      var p = Math.min(1, Math.max(0, -r.top / Math.max(1, tura.offsetHeight - window.innerHeight)));
      track.style.transform = 'translate3d(' + (-p * put).toFixed(1) + 'px,0,0)';
    };
    postavi();
    MA.resizeFns.push(postavi);
    MA.scrollFns.push(pomeri);
    if (desktop.addEventListener) desktop.addEventListener('change', function () { postavi(); MA.tick(); });
    // tastatura: fokus na list pomera stranicu tako da list bude u kadru
    track.addEventListener('focusin', function (e) {
      if (!ukljucena) return;
      var list = e.target.closest('.list');
      if (!list) return;
      var cilj = Math.min(put, Math.max(0, list.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft)));
      var start = tura.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: start + (put ? cilj / put : 0) * (tura.offsetHeight - window.innerHeight), behavior: 'auto' });
    });
    window.addEventListener('load', function () { postavi(); MA.tick(); });

    // telefon: strelice i brojač za listanje soba (swipe i dalje radi)
    var listovi = [].slice.call(track.querySelectorAll('.list'));
    var broj = tura.querySelector('.tura-broj');
    var strelice = [].slice.call(tura.querySelectorAll('.strelica'));
    var dva = function (n) { return (n < 10 ? '0' : '') + n; };
    var trenutniList = function () {
      var pad = parseFloat(getComputedStyle(track).paddingLeft) || 0, x = track.scrollLeft, n = 0, d = Infinity;
      listovi.forEach(function (l, i) { var r = Math.abs(l.offsetLeft - pad - x); if (r < d) { d = r; n = i; } });
      // na kraju trake poslednji list možda ne može do leve ivice
      if (x >= track.scrollWidth - track.clientWidth - 2) n = listovi.length - 1;
      return n;
    };
    var osveziStrelice = function () {
      var n = trenutniList();
      broj.textContent = dva(n + 1) + ' / ' + dva(listovi.length);
      strelice[0].disabled = n === 0;
      strelice[1].disabled = n === listovi.length - 1;
    };
    var rafS = 0;
    track.addEventListener('scroll', function () {
      if (rafS || ukljucena) return;
      rafS = requestAnimationFrame(function () { rafS = 0; osveziStrelice(); });
    }, { passive: true });
    strelice.forEach(function (b) {
      b.addEventListener('click', function () {
        var n = Math.max(0, Math.min(listovi.length - 1, trenutniList() + Number(b.dataset.smer)));
        var pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        track.scrollTo({ left: listovi[n].offsetLeft - pad, behavior: MA.reduced.matches ? 'auto' : 'smooth' });
      });
    });
    osveziStrelice();
  }

  MA.tick();
})();
