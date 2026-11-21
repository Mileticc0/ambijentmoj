/* Kompletan stan: tura kroz prostorije. Desktop = sticky + translateX vezan za skrol,
   telefon = scroll-snap, smanjeni pokreti = vertikalna lista. Pozadina prati ton prostorije. */
(function () {
  'use strict';
  var MA = window.MA;
  var tura = document.querySelector('.p-tura');
  if (!tura) return;
  var sticky = tura.querySelector('.p-sticky');
  var track = tura.querySelector('.p-track');
  var sobe = [].slice.call(track.querySelectorAll('.p-soba'));
  var nav = tura.querySelector('.p-sobe');
  var linkovi = [].slice.call(nav.querySelectorAll('a'));
  var ind = nav.querySelector('.p-ind');
  var desktop = window.matchMedia('(min-width: 960px)');
  var rezim = 'lista', put = 0, aktivna = -1;

  function odrediRezim() {
    padLV = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    rezim = MA.reduced.matches ? 'lista' : (desktop.matches ? 'tura' : 'swipe');
    tura.classList.toggle('aktivna', rezim === 'tura');
    if (rezim === 'tura') {
      track.style.transform = '';
      put = Math.max(0, track.scrollWidth - sticky.clientWidth);
      tura.style.height = (window.innerHeight + put) + 'px';
    } else {
      tura.style.height = ''; track.style.transform = ''; put = 0;
    }
  }

  // keširano: getComputedStyle u svakom frejmu bi forsirao preračun stila
  var padLV = 0;
  function padL() { return padLV; }

  function postaviAktivnu(n, bezPrelaza) {
    if (n === aktivna || n < 0) return;
    aktivna = n;
    var ton = sobe[n].dataset.mat;
    MA.setPageTone(ton);
    clearTimeout(postaviAktivnu.t);
    postaviAktivnu.t = setTimeout(function () { tura.setAttribute('data-ton', ton); MA.tick(); }, MA.reduced.matches ? 0 : 200);
    linkovi.forEach(function (a, i) { if (i === n) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    var a = linkovi[n], nr = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
    var ul = nav.querySelector('ul');
    if (bezPrelaza) ind.style.transition = 'none';
    ind.style.transform = 'translateX(' + (r.left - nr.left) + 'px) scaleX(' + (r.width / 100) + ')';
    if (bezPrelaza) { ind.offsetWidth; ind.style.transition = ''; }
    // na uskom ekranu aktivna stavka trake ostaje vidljiva
    if (r.left < nr.left || r.right > nr.right) ul.scrollTo({ left: a.offsetLeft - 16, behavior: MA.reduced.matches ? 'auto' : 'smooth' });
  }

  function najbliza(pozicije, cilj) {
    var best = 0, d = Infinity;
    pozicije.forEach(function (p, i) { var x = Math.abs(p - cilj); if (x < d) { d = x; best = i; } });
    return best;
  }

  /* desktop: jedan scroll listener sa stranice (MA.scrollFns) */
  MA.scrollFns.push(function () {
    var r = tura.getBoundingClientRect();
    if (rezim === 'tura') {
      if (r.bottom < -50 || r.top > window.innerHeight + 50) return;
      var p = Math.min(1, Math.max(0, -r.top / Math.max(1, tura.offsetHeight - window.innerHeight)));
      var tx = p * put;
      track.style.transform = 'translate3d(' + (-tx).toFixed(1) + 'px,0,0)';
      // aktivna je soba čija leva ivica je prešla 40 % širine ekrana (tu oko čita)
      var tacka = tx + window.innerWidth * 0.4, n = 0;
      sobe.forEach(function (s, i) { if (s.offsetLeft <= tacka) n = i; });
      postaviAktivnu(n);
    } else if (rezim === 'lista') {
      var n = 0;
      sobe.forEach(function (s, i) { if (s.getBoundingClientRect().top < window.innerHeight * 0.5) n = i; });
      if (r.top < window.innerHeight) postaviAktivnu(n);
    } else if (r.top < window.innerHeight * 0.6 && aktivna < 0) {
      postaviAktivnu(0);
    }
  });
  /* telefon: skrol same trake */
  var rafT = 0;
  track.addEventListener('scroll', function () {
    if (rezim !== 'swipe' || rafT) return;
    rafT = requestAnimationFrame(function () {
      rafT = 0;
      postaviAktivnu(najbliza(sobe.map(function (s) { return s.offsetLeft - padL(); }), track.scrollLeft));
    });
  }, { passive: true });

  function idiNa(n, glatko) {
    var s = sobe[n];
    if (rezim === 'tura') {
      var start = tura.getBoundingClientRect().top + window.scrollY;
      var cilj = Math.min(put, Math.max(0, s.offsetLeft - padL()));
      window.scrollTo({ top: start + (put ? cilj / put : 0) * (tura.offsetHeight - window.innerHeight), behavior: glatko ? 'smooth' : 'auto' });
    } else if (rezim === 'swipe') {
      var vrh = tura.getBoundingClientRect().top + window.scrollY - (MA.telefon.matches ? 56 : 84);
      if (Math.abs(window.scrollY - vrh) > 4) window.scrollTo({ top: vrh, behavior: glatko ? 'smooth' : 'auto' });
      track.scrollTo({ left: s.offsetLeft - padL(), behavior: glatko ? 'smooth' : 'auto' });
    } else {
      s.scrollIntoView({ block: 'start' });
    }
    postaviAktivnu(n);
  }

  linkovi.forEach(function (a, i) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      history.replaceState(null, '', a.getAttribute('href'));
      idiNa(i, !MA.reduced.matches);
    });
  });
  // tastatura: fokus unutar sobe dovodi sobu u kadar
  track.addEventListener('focusin', function (e) {
    var s = e.target.closest('.p-soba');
    if (s && rezim === 'tura') idiNa(sobe.indexOf(s), false);
  });

  odrediRezim();
  MA.resizeFns.push(function () { odrediRezim(); if (aktivna >= 0) { var n = aktivna; aktivna = -1; postaviAktivnu(n, true); } });
  window.addEventListener('load', function () {
    odrediRezim();
    var h = location.hash.replace('#', '');
    var n = sobe.findIndex(function (s) { return s.id === h; });
    if (n >= 0) idiNa(n, false);
    MA.tick();
  });
  MA.tick();
})();
