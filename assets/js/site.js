/* Moj Ambijent v5 · zajednički JS: header, donja traka, fioka „Usluge“, dugme za poziv,
   otkrivanje fotografija, česta pitanja, videi i video lightbox. Jedan pasivni scroll listener + rAF. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var telefon = window.matchMedia('(max-width: 959px)');
  var MA = window.MA = { reduced: reduced, telefon: telefon, scrollFns: [] };
  var EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

  var hdr = document.querySelector('.hdr');
  var traka = document.querySelector('.traka');
  var pozivDugme = document.querySelector('.poziv-dugme');
  var hero = document.querySelector('[data-hero]');

  /* ---------- Dugme za poziv nikad ne prekriva tekst ---------- */
  var TEKST = /^(P|H1|H2|H3|LI|A|BUTTON|SPAN|ADDRESS|LABEL|DT|DD)$/;
  function tekstIspod() {
    var r = pozivDugme.getBoundingClientRect();
    if (!r.width) return false;
    var tacke = [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4], [r.left + r.width / 2, r.top + r.height / 2]];
    for (var i = 0; i < tacke.length; i++) {
      var els = document.elementsFromPoint(tacke[i][0], tacke[i][1]);
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        if (el === pozivDugme || pozivDugme.contains(el) || el.closest('.traka')) continue;
        if (TEKST.test(el.tagName) && el.textContent.trim()) return true;
        if (/^(IMG|VIDEO|SECTION|MAIN|BODY|FOOTER)$/.test(el.tagName)) break;
      }
    }
    return false;
  }

  /* ---------- Jedan scroll loop ---------- */
  var lastY = window.scrollY, smer = 0, ceka = false;
  function frame() {
    ceka = false;
    var y = window.scrollY, dy = y - lastY;
    if (Math.abs(dy) > 4) smer = dy > 0 ? 1 : -1;
    lastY = y;
    // čitanja
    var sakrij = telefon.matches && smer > 0 && y > 120;
    var posleHeroa = pozivDugme && telefon.matches && (hero ? hero.getBoundingClientRect().bottom < 0 : y > window.innerHeight * 0.8);
    var prikaziPoziv = !!posleHeroa && smer < 0 && !tekstIspod();
    // upisi
    if (hdr) { hdr.classList.toggle('skrol', y > 8); hdr.classList.toggle('skriven', sakrij); }
    if (pozivDugme) pozivDugme.classList.toggle('vidljiv', prikaziPoziv);
    for (var i = 0; i < MA.scrollFns.length; i++) MA.scrollFns[i](y);
  }
  MA.tick = function () { if (!ceka) { ceka = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', MA.tick, { passive: true });
  window.addEventListener('resize', MA.tick, { passive: true });

  /* ---------- Desktop meni: tanka linija klizi (transform, 240 ms) ---------- */
  var meni = document.querySelector('.meni');
  if (meni) {
    var ind = meni.querySelector('.meni-ind');
    var aktivan = meni.querySelector('a[aria-current="page"]');
    var pomeri = function (a, bez) {
      if (bez) ind.style.transition = 'none';
      if (!a) { ind.style.opacity = '0'; }
      else {
        var nr = meni.getBoundingClientRect(), r = a.getBoundingClientRect();
        ind.style.transform = 'translateX(' + (r.left - nr.left) + 'px) scaleX(' + (r.width / 100) + ')';
        ind.style.opacity = '1';
      }
      if (bez) { ind.offsetWidth; ind.style.transition = ''; }
    };
    [].forEach.call(meni.querySelectorAll('a'), function (a) {
      a.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') pomeri(a); });
      a.addEventListener('focus', function () { pomeri(a); });
    });
    meni.addEventListener('pointerleave', function () { pomeri(aktivan); });
    meni.addEventListener('focusout', function (e) { if (!meni.contains(e.relatedTarget)) pomeri(aktivan); });
    pomeri(aktivan, true);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { pomeri(aktivan, true); });
    window.addEventListener('resize', function () { pomeri(aktivan, true); });
  }

  /* ---------- Donja traka: oznaka aktivne stavke ---------- */
  if (traka) {
    var tInd = traka.querySelector('.tab-ind');
    var trenutni = traka.querySelector('[aria-current="page"], [data-aktivna]');
    var stavi = function (t, bez) {
      if (!t) { tInd.style.opacity = '0'; return; }
      var br = traka.getBoundingClientRect(), r = t.getBoundingClientRect();
      if (bez) tInd.style.transition = 'none';
      tInd.style.opacity = '1';
      tInd.style.transform = 'translateX(' + (r.left - br.left + r.width / 2 - 10) + 'px)';
      if (bez) { tInd.offsetWidth; tInd.style.transition = ''; }
    };
    stavi(trenutni, true);
    window.addEventListener('resize', function () { stavi(trenutni, true); });
    window.addEventListener('pageshow', function () { stavi(trenutni, true); });
    [].forEach.call(traka.querySelectorAll('a.tab'), function (t) { t.addEventListener('click', function () { stavi(t); }); });
  }

  /* ---------- Fioka „Usluge“ (bottom sheet): povlačenje na dole, Esc, klik van ---------- */
  var fioka = document.querySelector('.fioka');
  var sloj = document.querySelector('.fioka-sloj');
  var uslugeBtn = document.querySelector('.tab-usluge');
  if (fioka && uslugeBtn) {
    var otvorena = false, zatvaranjeT = 0;
    var otvori = function () {
      clearTimeout(zatvaranjeT);
      fioka.hidden = false; sloj.hidden = false;
      fioka.style.transform = ''; sloj.style.opacity = '';
      fioka.offsetHeight;
      fioka.classList.add('otv'); sloj.classList.add('otv');
      uslugeBtn.setAttribute('aria-expanded', 'true');
      otvorena = true;
      root.style.overflow = 'hidden';
      fioka.focus({ preventScroll: true }); // fokus na dijalog, ne na prvi link (bez okvira posle dodira)
    };
    var zatvori = function (vrati) {
      if (!otvorena) return;
      otvorena = false;
      fioka.style.transform = ''; sloj.style.opacity = '';
      fioka.classList.remove('otv'); sloj.classList.remove('otv');
      uslugeBtn.setAttribute('aria-expanded', 'false');
      root.style.overflow = '';
      zatvaranjeT = setTimeout(function () { fioka.hidden = true; sloj.hidden = true; }, reduced.matches ? 0 : 500);
      if (vrati !== false) uslugeBtn.focus({ preventScroll: true });
    };
    uslugeBtn.addEventListener('click', function () { otvorena ? zatvori() : otvori(); });
    sloj.addEventListener('click', function () { zatvori(); });
    document.addEventListener('keydown', function (e) {
      if (!otvorena) return;
      if (e.key === 'Escape') { e.preventDefault(); zatvori(); }
      if (e.key === 'Tab') {
        var f = [].slice.call(fioka.querySelectorAll('a'));
        var a = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(a + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    // povlačenje: prst vodi fioku 1:1, otpuštanje odlučuje po putu (30 %) ili brzini (> 0,11 px/ms)
    var pid = null, startY = 0, dy = 0, uzorci = [], visina = 0, pomeranje = false;
    fioka.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      pid = e.pointerId; startY = e.clientY; dy = 0; pomeranje = false; uzorci = [[e.clientY, e.timeStamp]];
      visina = fioka.offsetHeight;
    });
    fioka.addEventListener('pointermove', function (e) {
      if (e.pointerId !== pid) return;
      var d = e.clientY - startY;
      if (!pomeranje && Math.abs(d) < 6) return;
      if (!pomeranje) { pomeranje = true; fioka.setPointerCapture(pid); fioka.style.transition = 'none'; sloj.style.transition = 'none'; }
      dy = d > 0 ? d : -Math.sqrt(-d) * 2; // na gore guma
      uzorci.push([e.clientY, e.timeStamp]); if (uzorci.length > 5) uzorci.shift();
      fioka.style.transform = 'translateY(' + dy + 'px)';
      sloj.style.opacity = String(1 - Math.max(0, dy) / visina);
    });
    var pusti = function (e) {
      if (e.pointerId !== pid) return;
      pid = null;
      if (!pomeranje) return;
      e.preventDefault();
      var a = uzorci[0], b = uzorci[uzorci.length - 1];
      var v = (b[0] - a[0]) / Math.max(1, b[1] - a[1]);
      fioka.style.transition = ''; sloj.style.transition = '';
      if (dy > visina * 0.3 || v > 0.11) zatvori(false);
      else { fioka.style.transform = ''; sloj.style.opacity = ''; }
      // klik na link posle povlačenja ne sme da navigira
      var blokiraj = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
      fioka.addEventListener('click', blokiraj, { capture: true, once: true });
      setTimeout(function () { fioka.removeEventListener('click', blokiraj, { capture: true }); }, 50);
    };
    fioka.addEventListener('pointerup', pusti);
    fioka.addEventListener('pointercancel', pusti);
    telefon.addEventListener('change', function () { if (!telefon.matches) zatvori(false); });
  }

  /* ---------- Tastatura otvorena: traka i dugme se sklanjaju ---------- */
  if (window.visualViewport) {
    var tast = function () {
      var otv = window.visualViewport.height < window.innerHeight * 0.75 && document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      root.classList.toggle('tastatura', !!otv);
    };
    window.visualViewport.addEventListener('resize', tast);
    document.addEventListener('focusout', function () { setTimeout(tast, 50); });
  }

  /* ---------- Otkrivanje fotografija jednom ---------- */
  var zaOtkriti = document.querySelectorAll('[data-otkrij]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    var io = new IntersectionObserver(function (u) {
      u.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { threshold: 0.2 });
    zaOtkriti.forEach(function (el) { io.observe(el); });
  } else zaOtkriti.forEach(function (el) { el.classList.add('in'); });

  /* ---------- Česta pitanja ---------- */
  [].forEach.call(document.querySelectorAll('.pitanje-dugme'), function (b) {
    var telo = document.getElementById(b.getAttribute('aria-controls'));
    b.addEventListener('click', function () {
      var otv = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(otv));
      telo.classList.toggle('otv', otv);
    });
  });

  /* ---------- Kopiraj ---------- */
  [].forEach.call(document.querySelectorAll('[data-kopiraj]'), function (b) {
    var tekst = b.textContent;
    b.addEventListener('click', function () {
      var gotovo = function (ok) { b.textContent = ok ? 'Kopirano' : 'Kopirajte ručno'; setTimeout(function () { b.textContent = tekst; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.kopiraj).then(function () { gotovo(true); }, function () { gotovo(false); });
      else gotovo(false);
    });
  });

  /* ---------- Videi: vrte se sami tek kad uđu u ekran, najviše jedan po ekranu ---------- */
  var stedi = reduced.matches || (navigator.connection && navigator.connection.saveData);
  var IKONA_PLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
  var videi = [].slice.call(document.querySelectorAll('.video'));
  videi.forEach(function (fig) {
    var v = fig.querySelector('video');
    // isečak bez teksta: data-od / data-do (sekunde)
    var od = parseFloat(v.dataset.od || '0'), doo = parseFloat(v.dataset.do || '0');
    if (od || doo) {
      v.addEventListener('loadedmetadata', function () { if (od) v.currentTime = od; });
      v.addEventListener('timeupdate', function () { if (doo && v.currentTime >= doo) v.currentTime = od; });
    }
    // fajl ne postoji ili ne može da se pusti: umesto praznog okvira kratka poruka
    var src = v.querySelector('source');
    var nema = function () { fig.classList.add('nema'); };
    if (src) src.addEventListener('error', nema); v.addEventListener('error', nema);
    var otvoriBtn = document.createElement('button');
    otvoriBtn.type = 'button'; otvoriBtn.className = 'video-otvori';
    otvoriBtn.setAttribute('aria-label', 'Pusti video sa zvukom: ' + (fig.dataset.naslov || ''));
    otvoriBtn.addEventListener('click', function () { otvoriVideo(fig); });
    fig.appendChild(otvoriBtn);
    // video sa govorom ili muzikom (data-zvuk) se ne vrti sam: poster + „Pogledaj video“ otvara lightbox sa zvukom
    if (stedi || fig.hasAttribute('data-zvuk')) {
      var p = document.createElement('button');
      p.type = 'button'; p.className = 'video-pusti'; p.innerHTML = IKONA_PLAY + (fig.hasAttribute('data-zvuk') ? 'Pogledaj video' : 'Pusti');
      p.addEventListener('click', function () { otvoriVideo(fig); });
      fig.appendChild(p);
    }
  });
  // u automatsko puštanje ulaze samo nemi isečci
  videi = videi.filter(function (fig) { return !fig.hasAttribute('data-zvuk'); });
  if (!stedi && 'IntersectionObserver' in window && videi.length) {
    var vidljivost = new Map();
    var izaberi = function () {
      var najbolji = null, max = 0.5;
      vidljivost.forEach(function (o, fig) { if (o > max) { max = o; najbolji = fig; } });
      videi.forEach(function (fig) {
        var v = fig.querySelector('video');
        if (fig === najbolji) { if (v.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } }
        else if (!v.paused) v.pause();
      });
    };
    var vio = new IntersectionObserver(function (u) {
      u.forEach(function (x) { vidljivost.set(x.target, x.isIntersecting ? x.intersectionRatio : 0); });
      izaberi();
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    videi.forEach(function (fig) { vio.observe(fig); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) videi.forEach(function (f) { f.querySelector('video').pause(); }); else izaberi(); });
    MA.videoIzbor = izaberi;
  }

  /* ---------- Video lightbox: zvuk i kontrole; Esc, X, klik van ili povlačenje na dole ---------- */
  var vlb = null, vlbOkidac = null;
  function otvoriVideo(fig) {
    var izvor = fig.querySelector('video');
    if (!vlb) {
      vlb = document.createElement('div');
      vlb.className = 'vlb'; vlb.hidden = true;
      vlb.setAttribute('role', 'dialog'); vlb.setAttribute('aria-modal', 'true');
      vlb.innerHTML = '<div class="vlb-sloj"></div><div class="vlb-okvir"><video controls playsinline></video></div>' +
        '<button class="vlb-x" type="button" aria-label="Zatvori video"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';
      document.body.appendChild(vlb);
      vlb.querySelector('.vlb-x').addEventListener('click', zatvoriVideo);
      vlb.querySelector('.vlb-sloj').addEventListener('click', zatvoriVideo);
      vlb.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); zatvoriVideo(); }
        if (e.key === 'Tab') { e.preventDefault(); var f = [vlb.querySelector('video'), vlb.querySelector('.vlb-x')]; f[(f.indexOf(document.activeElement) + 1) % 2].focus(); }
      });
      // povlačenje na dole zatvara (prag 30 % ili brzina > 0,11 px/ms), uz gumu na gore
      var okvir = vlb.querySelector('.vlb-okvir'), s = vlb.querySelector('.vlb-sloj');
      var pid = null, y0 = 0, d = 0, uz = [], pom = false;
      okvir.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') return; pid = e.pointerId; y0 = e.clientY; d = 0; pom = false; uz = [[e.clientY, e.timeStamp]]; });
      okvir.addEventListener('pointermove', function (e) {
        if (e.pointerId !== pid) return;
        var x = e.clientY - y0;
        if (!pom && Math.abs(x) < 8) return;
        if (!pom) { pom = true; okvir.setPointerCapture(pid); }
        d = x > 0 ? x : -Math.sqrt(-x) * 2;
        uz.push([e.clientY, e.timeStamp]); if (uz.length > 5) uz.shift();
        okvir.style.transform = 'translateY(' + d + 'px)';
        s.style.opacity = String(1 - Math.max(0, d) / (window.innerHeight * 0.6));
      });
      var kraj = function (e) {
        if (e.pointerId !== pid) return;
        pid = null; if (!pom) return;
        var a = uz[0], b = uz[uz.length - 1], v = (b[0] - a[0]) / Math.max(1, b[1] - a[1]);
        if (d > window.innerHeight * 0.3 || v > 0.11) zatvoriVideo();
        else {
          okvir.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }], { duration: 300, easing: EASE_OUT });
          okvir.style.transform = ''; s.style.opacity = '';
        }
      };
      okvir.addEventListener('pointerup', kraj); okvir.addEventListener('pointercancel', kraj);
    }
    vlbOkidac = document.activeElement;
    videi.forEach(function (f) { f.querySelector('video').pause(); });
    var v = vlb.querySelector('video');
    v.src = izvor.currentSrc || izvor.querySelector('source').src;
    v.poster = izvor.poster;
    v.setAttribute('aria-label', fig.dataset.naslov || 'Video');
    vlb.hidden = false;
    root.style.overflow = 'hidden';
    v.muted = false;
    // isti isečak kao u malom prikazu (npr. bez teksta ili loga): od / do
    var od = parseFloat(izvor.dataset.od || '0'), doo = parseFloat(izvor.dataset.do || '0');
    v.onloadedmetadata = function () { v.currentTime = od; };
    v.ontimeupdate = doo ? function () { if (v.currentTime >= doo) { v.pause(); v.currentTime = od; } } : null;
    v.onseeking = od ? function () { if (v.currentTime < od - 0.05) v.currentTime = od; } : null;
    var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
    vlb.querySelector('.vlb-x').focus({ preventScroll: true });
    if (!reduced.matches) {
      vlb.querySelector('.vlb-sloj').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: EASE_OUT });
      vlb.querySelector('.vlb-okvir').animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' });
    }
  }
  function zatvoriVideo() {
    if (!vlb || vlb.hidden) return;
    var v = vlb.querySelector('video'), okvir = vlb.querySelector('.vlb-okvir'), s = vlb.querySelector('.vlb-sloj');
    var kraj = function () {
      v.pause(); v.removeAttribute('src'); v.load();
      vlb.hidden = true; okvir.style.transform = ''; s.style.opacity = '';
      root.style.overflow = '';
      if (vlbOkidac && vlbOkidac.focus) vlbOkidac.focus({ preventScroll: true });
      if (MA.videoIzbor) MA.videoIzbor();
    };
    if (reduced.matches) { kraj(); return; }
    var a = okvir.animate([{ opacity: 1, transform: okvir.style.transform || 'none' }, { opacity: 0, transform: 'translateY(40px)' }], { duration: 200, easing: EASE_OUT, fill: 'forwards' });
    s.animate([{ opacity: s.style.opacity || 1 }, { opacity: 0 }], { duration: 200, easing: EASE_OUT, fill: 'forwards' });
    a.onfinish = function () { vlb.getAnimations({ subtree: true }).forEach(function (x) { x.cancel(); }); kraj(); };
  }

  /* ---------- DEV: prekidač „Demo / Najgori slučaj“ (samo localhost) ---------- */
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !navigator.webdriver) {
    var ng = /[?&]najgori=1/.test(location.search);
    var sw = document.createElement('div');
    sw.setAttribute('style', 'position:fixed;left:50%;bottom:calc(var(--bar) + 12px);transform:translateX(-50%);z-index:70;display:flex;gap:2px;padding:3px;background:#ddd;border-radius:999px;font:12px/1 system-ui,sans-serif');
    sw.innerHTML = ['Demo', 'Najgori slučaj'].map(function (t, i) {
      return '<a href="' + location.pathname + (i ? '?najgori=1' : '') + '" style="padding:8px 12px;border-radius:999px;text-decoration:none;color:#222;background:' + (((i === 1) === ng) ? '#fff' : 'transparent') + '">' + t + '</a>';
    }).join('');
    document.body.appendChild(sw);
  }

  MA.tick();
})();
