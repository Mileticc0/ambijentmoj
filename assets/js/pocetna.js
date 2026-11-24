/* Početna: ulaz heroja. Fotografija clip-path odozdo (700 ms), naslov red po red (60 ms), ostalo posle. Ukupno ≤ 1 s. */
(function () {
  'use strict';
  var MA = window.MA;
  var EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var h1 = hero.querySelector('h1');

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function podeli(el) {
    var tekst = el.textContent.trim();
    el.innerHTML = tekst.split(/\s+/).map(function (w) { return '<span class="w">' + esc(w) + '</span>'; }).join(' ');
    var redovi = [], top = null;
    [].forEach.call(el.querySelectorAll('.w'), function (s) {
      if (s.offsetTop !== top) { redovi.push([]); top = s.offsetTop; }
      redovi[redovi.length - 1].push(s.textContent);
    });
    el.setAttribute('aria-label', tekst);
    el.innerHTML = redovi.map(function (r) { return '<span class="red" aria-hidden="true">' + esc(r.join(' ')) + '</span>'; }).join('');
    return tekst;
  }

  function ulaz() {
    if (MA.reduced.matches || !hero.animate) { hero.classList.remove('pre'); return; }
    var tekst = podeli(h1);
    var redovi = h1.querySelectorAll('.red');
    var ostalo = hero.querySelectorAll('[data-ulaz]:not(h1)');
    hero.classList.remove('pre');
    hero.querySelector('.hero-foto').animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 700, easing: EASE_OUT, fill: 'backwards' });
    [].forEach.call(redovi, function (r, i) {
      r.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 120 + i * 60, easing: EASE_OUT, fill: 'backwards' });
    });
    var posle = 120 + redovi.length * 60;
    [].forEach.call(ostalo, function (el, i) {
      el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: Math.min(posle + i * 60, 560), easing: EASE_OUT, fill: 'backwards' });
    });
    // posle ulaza naslov se vraća u običan tekst da bi se prelamao pri promeni širine
    setTimeout(function () {
      window.addEventListener('resize', function vrati() {
        if (h1.querySelector('.red')) { h1.textContent = tekst; h1.removeAttribute('aria-label'); }
        window.removeEventListener('resize', vrati);
      });
    }, 1100);
  }
  var fontovi = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontovi, new Promise(function (r) { setTimeout(r, 700); })]).then(ulaz);
})();

/* Prekidač „Najgori slučaj“ (?najgori=1, samo za proveru): dugi nazivi kategorija, dugo pitanje i odgovor,
   dug email, č ć đ š ž, jednoslovni naziv i video kome fajl ne postoji. */
(function () {
  'use strict';
  if (!/[?&]najgori=1/.test(location.search)) return;
  var t = function (sel, txt) { var el = document.querySelector(sel); if (el) el.textContent = txt; };
  var kat = document.querySelectorAll('.kat h3'), opis = document.querySelectorAll('.kat p');
  kat[0].textContent = 'Kuhinje sa šankom, ostrvom i ugradnim aparatima za velike porodice';
  kat[1].textContent = 'Ž';
  opis[2].textContent = 'Dnevne, spavaće i dečije sobe, TV zidovi, zidni kreveti, radni kutci, garderoberi i čivilukâ za đačke torbe u potkrovlju sa kosim plafonom.';
  t('#q1', 'Koliko traje izrada kompletnog stana sa kuhinjom, tri plakara, dečijom sobom i kupatilom u Novom Sadu?');
  document.querySelector('#q1').insertAdjacentHTML('beforeend', '<span class="znak-plus" aria-hidden="true"></span>');
  t('#o1 p', 'Izrada zavisi od obima posla: broja elemenata, izabranih materijala (Fundermax, EGGER, KRONOSPAN, medijapan, furnir, puno drvo), završne obrade i dinamike montaže na licu mesta. Za kuhinju sa šankom i ugradnim aparatima računajte više vremena nego za jedan plakar. Tačan rok dobijate uz ponudu, posle merenja i 3D projekta.');
  document.getElementById('q1').click();
  var mail = document.querySelector('.kontakt-lista a[href^="mailto"]');
  mail.textContent = 'aleksandra.djordjevic-scekic.zivkovic@mojambijent-namestaj-po-meri.rs';
  var src = document.querySelector('.projekat video source');
  src.src = 'assets/video/ne-postoji.mp4';
  var v = document.querySelector('.projekat video'); v.poster = 'assets/video/ne-postoji.jpg'; v.load();
})();
