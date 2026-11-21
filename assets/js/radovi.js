/* Radovi: dva filtera koji rade zajedno (prostorija + materijal), pozadina prati materijal,
   FLIP 300 ms (prekidivo), lightbox iz slike. */
(function () {
  'use strict';
  var MA = window.MA;
  var EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var reduced = MA.reduced.matches;
  var IME = { orah: 'Orah', hrast: 'Hrast', lak: 'Beli mat', krem: 'Krem', kamen: 'Kamen', antracit: 'Antracit' };

  var sek = document.querySelector('.galerija');
  var grupe = [].slice.call(document.querySelectorAll('.m-grupa'));
  var prDugmad = [].slice.call(document.querySelectorAll('.f-dugme'));
  var tonDugmad = [].slice.call(document.querySelectorAll('.f-uz'));
  var stanje = document.querySelector('.f-stanje');
  var prazno = document.querySelector('.m-prazno');

  /* Prekidač „Najgori slučaj“ (?najgori=1): materijal bez ijedne slike, 40 slika u jednom tonu, dug naziv */
  if (/[?&]najgori=1/.test(location.search)) {
    [].forEach.call(document.querySelectorAll('.m-rad[data-mat="kamen"]'), function (li) { li.remove(); });
    var uzor = document.querySelector('#kuhinje .m-rad[data-mat="krem"]');
    var ul = uzor.parentNode;
    for (var n = 0; n < 40; n++) {
      var k = uzor.cloneNode(true);
      k.querySelector('.label').textContent = 'Kuhinja sa trpezarijskim delom, šankom, čivilukom i đačkim stolom · Krem';
      ul.insertBefore(k, uzor);
    }
  }

  var stavke = function () { return [].slice.call(document.querySelectorAll('.m-rad')); };
  var pr = '', ton = '';

  function radova(n) { var d = n % 10, s = n % 100; return d === 1 && s !== 11 ? 'rad' : (d >= 2 && d <= 4 && (s < 12 || s > 14) ? 'rada' : 'radova'); }

  function primeni(animiraj) {
    var sve = stavke();
    var vidljive = sve.filter(function (li) { return !li.hidden; });
    var prvi = new Map();
    if (animiraj) {
      vidljive.forEach(function (li) { prvi.set(li, li.getBoundingClientRect()); });
      sve.forEach(function (li) { li.getAnimations().forEach(function (a) { a.cancel(); }); });
    }

    var ukupno = 0;
    grupe.forEach(function (g) {
      var uSobi = !pr || g.dataset.pr === pr;
      var broj = 0;
      [].forEach.call(g.querySelectorAll('.m-rad'), function (li) {
        var vid = uSobi && (!ton || li.dataset.mat === ton);
        li.hidden = !vid;
        if (vid) broj++;
      });
      g.hidden = broj === 0;
      ukupno += broj;
    });
    prazno.hidden = ukupno > 0;

    if (animiraj) {
      var i = 0;
      sve.forEach(function (li) {
        if (li.hidden) return;
        var b = li.getBoundingClientRect();
        if (b.bottom < -200 || b.top > window.innerHeight + 200) return;
        var a = prvi.get(li);
        if (a) {
          var dx = a.left - b.left, dy = a.top - b.top;
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) li.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 300, easing: EASE_OUT });
        } else {
          li.animate([{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: Math.min(i++ * 30, 240), easing: EASE_OUT, fill: 'backwards' });
        }
      });
    }

    var delovi = [];
    if (pr) delovi.push(document.querySelector('.f-dugme[data-pr="' + pr + '"]').textContent);
    if (ton) delovi.push(IME[ton]);
    delovi.push(ukupno ? ukupno + ' ' + radova(ukupno) : 'nema radova');
    stanje.textContent = (pr || ton ? '' : 'Svi radovi · ') + delovi.join(' · ');

    prDugmad.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.pr === pr)); });
    tonDugmad.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mat === ton)); });
  }

  function postaviTon(t) {
    ton = t;
    var boja = ton || 'lak';
    MA.setPageTone(boja);
    clearTimeout(postaviTon.t);
    postaviTon.t = setTimeout(function () { sek.setAttribute('data-ton', boja); MA.tick(); }, reduced ? 0 : 200);
  }

  prDugmad.forEach(function (b) {
    b.addEventListener('click', function () {
      pr = b.dataset.pr;
      history.replaceState(null, '', pr ? '#' + pr : location.pathname + location.search);
      primeni(!reduced);
    });
  });
  tonDugmad.forEach(function (b) {
    b.addEventListener('click', function () {
      postaviTon(ton === b.dataset.mat ? '' : b.dataset.mat);
      primeni(!reduced);
    });
  });

  function izHasha() {
    var h = location.hash.replace('#', '');
    pr = grupe.some(function (g) { return g.dataset.pr === h; }) ? h : '';
  }
  window.addEventListener('hashchange', function () { izHasha(); primeni(false); });
  izHasha();
  primeni(false);
  if (pr) { var g = document.getElementById(pr); if (g) requestAnimationFrame(function () { document.querySelector('.filteri').scrollIntoView({ block: 'start' }); }); }

  /* ---------- Lightbox ---------- */
  function stavkaIz(btn) {
    var img = btn.querySelector('img');
    return { src: img.currentSrc || img.src, srcset: img.getAttribute('srcset'), w: img.getAttribute('width'), h: img.getAttribute('height'), alt: img.alt, label: (btn.querySelector('.label') || {}).textContent || '' };
  }
  document.querySelector('.m-grupe').addEventListener('click', function (e) {
    var btn = e.target.closest('.m-btn');
    if (!btn) return;
    var dugmad = stavke().filter(function (li) { return !li.hidden; }).map(function (li) { return li.querySelector('.m-btn'); });
    MA.lightbox.otvori(dugmad.map(stavkaIz), dugmad.indexOf(btn), { slicica: function (i) { return dugmad[i].querySelector('img'); } });
  });

  var pula = [].slice.call(document.querySelectorAll('.s-pula'));
  var pulaStavke = function () { return pula.map(function (b) { var s = stavkaIz(b); s.label = 'Stan u Puli'; return s; }); };
  pula.forEach(function (b, i) {
    b.addEventListener('click', function () { MA.lightbox.otvori(pulaStavke(), i, { slicica: function (n) { return pula[n].querySelector('img'); } }); });
  });
  document.querySelector('.s-otvori').addEventListener('click', function () {
    MA.lightbox.otvori(pulaStavke(), 0, { slicica: function (n) { return pula[n].querySelector('img'); } });
  });
})();
