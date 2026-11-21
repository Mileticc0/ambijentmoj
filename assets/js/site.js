/* Moj Ambijent · zajednički JS: ton stranice, header, donja traka, dugme za poziv, reveal.
   Jedan pasivni scroll listener + rAF za celu stranicu. */
(function () {
  'use strict';
  var root = document.documentElement;
  var tamni = { orah: 1, antracit: 1 };
  var boje = { lak: '#F3F0EB', hrast: '#D8C3A5', kamen: '#CBC5BC', krem: '#E9DFCF', orah: '#4A3528', antracit: '#2C2B2A' };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var telefon = window.matchMedia('(max-width: 959px)');

  var MA = window.MA = { reduced: reduced, telefon: telefon, tamni: tamni, scrollFns: [], resizeFns: [] };

  /* ---------- Ton stranice: dva fiksna sloja, crossfade opacity ---------- */
  var slojevi = [document.createElement('div'), document.createElement('div')];
  slojevi.forEach(function (s) { s.className = 'ton-sloj'; s.setAttribute('aria-hidden', 'true'); document.body.prepend(s); });
  var aktivni = 0, tonStrane = null;
  MA.setPageTone = function (ton) {
    if (ton === tonStrane) return;
    tonStrane = ton;
    var sledeci = slojevi[1 - aktivni];
    sledeci.style.background = boje[ton];
    sledeci.style.zIndex = -1;
    slojevi[aktivni].style.zIndex = -2;
    sledeci.classList.add('vidljiv');
    var stari = slojevi[aktivni];
    aktivni = 1 - aktivni;
    // stari sloj sklanjamo tek kad novi prekrije ekran
    clearTimeout(MA._tonT);
    MA._tonT = setTimeout(function () { stari.classList.remove('vidljiv'); }, reduced.matches ? 0 : 420);
  };
  MA.setPageTone('lak');

  /* ---------- Elementi ---------- */
  var hdr = document.querySelector('.hdr');
  var bar = document.querySelector('.tabbar');
  var fab = document.querySelector('.fab');
  var hero = document.querySelector('.hero');
  var meta = document.querySelector('meta[name="theme-color"]');
  var sekcije = [].slice.call(document.querySelectorAll('.sec[data-ton]'));

  function tonNa(y) {
    for (var i = 0; i < sekcije.length; i++) {
      var r = sekcije[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) return sekcije[i].getAttribute('data-ton');
    }
    return 'lak';
  }
  function postaviTon(el, ton) {
    if (!el || el.getAttribute('data-ton') === ton) return;
    el.setAttribute('data-ton', ton);
    el.classList.toggle('tamno', !!tamni[ton]);
  }

  /* Dugme za poziv nikad ne prekriva tekst: proveravamo šta je ispod njegove površine. */
  var TEKST = /^(P|H1|H2|H3|LI|A|BUTTON|SPAN|ADDRESS|LABEL|INPUT|TEXTAREA)$/;
  function tekstIspodFaba() {
    var r = fab.getBoundingClientRect();
    if (!r.width) return false;
    var tacke = [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4], [r.left + r.width / 2, r.top + r.height / 2]];
    for (var i = 0; i < tacke.length; i++) {
      var els = document.elementsFromPoint(tacke[i][0], tacke[i][1]);
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        if (el === fab || fab.contains(el) || el.closest('.tabbar')) continue;
        if (TEKST.test(el.tagName) && el.textContent.trim()) return true;
        if (el.tagName === 'IMG' || el.tagName === 'SECTION' || el.tagName === 'MAIN' || el.tagName === 'BODY') break;
      }
    }
    return false;
  }

  /* ---------- Jedan scroll loop ---------- */
  var lastY = window.scrollY, ticking = false, smer = 0;
  function frame() {
    ticking = false;
    var y = window.scrollY;
    var dy = y - lastY;
    if (Math.abs(dy) > 4) smer = dy > 0 ? 1 : -1;
    lastY = y;

    // 1) sva čitanja pre svih upisa (bez forsiranog layouta u svakom frejmu)
    var hH = hdr ? hdr.offsetHeight : 60;
    var sakrij = !!hdr && telefon.matches && smer > 0 && y > 120;
    var hTon = tonNa(sakrij ? 1 : hH - 1);
    var dTon = bar ? tonNa(window.innerHeight - 8) : null;
    var posleHeroa = fab && telefon.matches && (hero ? hero.getBoundingClientRect().bottom < 0 : y > window.innerHeight);
    var fabVidljiv = !!posleHeroa && smer < 0 && !tekstIspodFaba();
    // 2) upisi
    if (hdr) { hdr.classList.toggle('skriven', sakrij); postaviTon(hdr, hTon); }
    if (meta) meta.setAttribute('content', boje[hTon] || boje.lak);
    if (bar) postaviTon(bar, tamni[dTon] ? 'antracit' : 'lak');
    if (fab) fab.classList.toggle('vidljiv', fabVidljiv);
    for (var i = 0; i < MA.scrollFns.length; i++) MA.scrollFns[i](y);
  }
  MA.tick = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', MA.tick, { passive: true });
  window.addEventListener('resize', function () {
    for (var i = 0; i < MA.resizeFns.length; i++) MA.resizeFns[i]();
    MA.tick();
  }, { passive: true });

  /* ---------- Desktop meni: linija klizi ---------- */
  var nav = document.querySelector('.hdr-nav');
  if (nav) {
    var ind = nav.querySelector('.hdr-ind');
    var linkovi = [].slice.call(nav.querySelectorAll('a'));
    var aktivan = nav.querySelector('a[aria-current="page"]');
    var pomeri = function (a) {
      if (!a) { ind.style.opacity = '0'; return; }
      var nr = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
      ind.style.transform = 'translateX(' + (r.left - nr.left) + 'px) scaleX(' + (r.width / 100) + ')';
      ind.style.opacity = '1';
    };
    linkovi.forEach(function (a) {
      a.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') pomeri(a); });
      a.addEventListener('focus', function () { pomeri(a); });
      a.addEventListener('blur', function () { pomeri(aktivan); });
    });
    nav.addEventListener('pointerleave', function () { pomeri(aktivan); });
    if (aktivan) { ind.style.transition = 'none'; pomeri(aktivan); ind.offsetWidth; ind.style.transition = ''; }
    MA.resizeFns.push(function () { pomeri(aktivan); });
    // fontovi menjaju širinu linkova: izmeri ponovo kad se učitaju
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
      ind.style.transition = 'none'; pomeri(aktivan); ind.offsetWidth; ind.style.transition = '';
    });
  }

  /* ---------- Donja traka: pločica iznad aktivne stavke ---------- */
  if (bar) {
    var tInd = bar.querySelector('.tab-ind');
    var tabovi = [].slice.call(bar.querySelectorAll('.tab'));
    var stavi = function (t, bez) {
      if (!t) { tInd.style.opacity = '0'; return; }
      var br = bar.getBoundingClientRect(), r = t.getBoundingClientRect();
      if (bez) tInd.style.transition = 'none';
      tInd.style.opacity = '1';
      tInd.style.transform = 'translateX(' + (r.left - br.left + r.width / 2 - 8) + 'px)';
      if (bez) { tInd.offsetWidth; tInd.style.transition = ''; }
    };
    var trenutni = bar.querySelector('[aria-current="page"]');
    stavi(trenutni, true);
    tabovi.forEach(function (t) { t.addEventListener('click', function () { stavi(t); }); });
    MA.resizeFns.push(function () { stavi(trenutni, true); });
    window.addEventListener('pageshow', function () { stavi(trenutni, true); });
  }

  /* ---------- Tastatura otvorena: traka i dugme se sklanjaju ---------- */
  if (window.visualViewport) {
    var proveriTastaturu = function () {
      var otvorena = window.visualViewport.height < window.innerHeight * 0.75 &&
        document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      root.classList.toggle('tastatura', !!otvorena);
    };
    window.visualViewport.addEventListener('resize', proveriTastaturu);
    document.addEventListener('focusout', function () { setTimeout(proveriTastaturu, 50); });
  }

  /* ---------- Reveal: jednom, na 20 % vidljivosti ---------- */
  var za = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    var io = new IntersectionObserver(function (unosi) {
      unosi.forEach(function (u) {
        if (u.isIntersecting) { u.target.classList.add('in'); io.unobserve(u.target); }
      });
    }, { threshold: 0.2 });
    za.forEach(function (el) { io.observe(el); });
  } else {
    za.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- DEV: prekidač „Demo / Najgori slučaj“ (samo na localhostu, ne ide u produkciju) ---------- */
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && document.querySelector('.uzorci, .galerija, .forma')) {
    var ng = /[?&]najgori=1/.test(location.search);
    var sw = document.createElement('div');
    sw.setAttribute('style', 'position:fixed;left:50%;bottom:calc(var(--bar) + 12px);transform:translateX(-50%);z-index:70;display:flex;gap:2px;padding:3px;background:#ddd;border-radius:999px;font:12px/1 system-ui,sans-serif');
    sw.innerHTML = ['Demo', 'Najgori slučaj'].map(function (t, i) {
      var on = (i === 1) === ng;
      return '<a href="' + location.pathname + (i ? '?najgori=1' : '') + '" style="padding:8px 12px;border-radius:999px;text-decoration:none;color:#222;background:' + (on ? '#fff' : 'transparent') + '">' + t + '</a>';
    }).join('');
    document.body.appendChild(sw);
  }

  MA.tick();
})();
