/* Kontakt: forma u 3 koraka, inline validacija, prelaz translateX(16px) + opacity 240 ms,
   slanje preko Web3Forms (fetch + preventDefault), fotografija u tonu izabranog materijala. */
(function () {
  'use strict';
  var MA = window.MA;
  var EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var forma = document.querySelector('.forma');
  if (!forma) return;
  var koraci = [].slice.call(forma.querySelectorAll('.korak'));
  var traka = [].slice.call(document.querySelectorAll('.kt-stavka'));
  var trenutni = 0;
  var MAX_SLIKA = 10 * 1024 * 1024;

  /* ---------- greške ---------- */
  function greska(id, poruka, polje) {
    var g = document.getElementById(id);
    if (poruka) { if (typeof poruka === 'string') g.textContent = poruka; g.hidden = false; }
    else g.hidden = true;
    if (polje) [].concat(polje).forEach(function (p) { if (poruka) p.setAttribute('aria-invalid', 'true'); else p.removeAttribute('aria-invalid'); });
    return !poruka;
  }
  var $ = function (s) { return forma.querySelector(s); };

  var provere = {
    prostorije: function () {
      var ok = forma.querySelectorAll('[name="prostorije"]:checked').length > 0;
      return greska('g-prostorije', !ok, document.querySelector('#p-prostorije .cipovi'));
    },
    mesto: function () {
      if ($('[name="grad"]:checked').value !== 'Drugo mesto') return greska('g-mesto', false, $('#mesto'));
      return greska('g-mesto', !$('#mesto').value.trim(), $('#mesto'));
    },
    adresa: function () { return greska('g-adresa', !$('#adresa').value.trim(), $('#adresa')); },
    mere: function () {
      var polja = [].slice.call(forma.querySelectorAll('[data-mera]'));
      var lose = polja.filter(function (p) {
        var v = p.value.trim(); if (!v) return false;
        var n = Number(v); return !/^\d+$/.test(v) || n < 1 || n > 2000;
      });
      polja.forEach(function (p) { if (lose.indexOf(p) >= 0) p.setAttribute('aria-invalid', 'true'); else p.removeAttribute('aria-invalid'); });
      return greska('g-mere', lose.length > 0);
    },
    ime: function () { return greska('g-ime', !$('#ime').value.trim(), $('#ime')); },
    telefon: function () {
      var cifre = $('#telefon').value.replace(/\D/g, '');
      return greska('g-telefon', cifre.length < 6 || cifre.length > 15, $('#telefon'));
    },
    email: function () {
      var v = $('#email').value.trim();
      return greska('g-email', v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), $('#email'));
    },
    slika: function () {
      var f = $('#slika').files[0];
      if (f && !/^image\//.test(f.type)) return greska('g-slika', 'Izabrani fajl nije fotografija.', $('#slika'));
      return greska('g-slika', f && f.size > MAX_SLIKA ? 'Fotografija je veća od 10 MB. Izaberite manju ili je pošaljite na Viber.' : false, $('#slika'));
    }
  };
  var poKoraku = [['prostorije'], ['mesto', 'adresa', 'mere'], ['ime', 'telefon', 'email', 'slika']];

  function proveriKorak(k) {
    var ok = true, prvo = null;
    poKoraku[k].forEach(function (ime) {
      if (!provere[ime]()) {
        ok = false;
        if (!prvo) prvo = koraci[k].querySelector('[aria-invalid="true"] input, input[aria-invalid="true"], textarea[aria-invalid="true"], [aria-invalid="true"]');
      }
    });
    if (prvo) {
      var cilj = prvo.matches('input, textarea, select') ? prvo : prvo.querySelector('input');
      if (cilj) cilj.focus();
    }
    return ok;
  }

  // inline: posle prvog napuštanja polja proveravamo dok kuca
  forma.addEventListener('focusout', function (e) {
    var n = e.target.name;
    var mapa = { mesto: 'mesto', adresa: 'adresa', sirina: 'mere', visina: 'mere', dubina: 'mere', ime: 'ime', telefon: 'telefon', email: 'email' };
    if (mapa[n] && e.target.value) provere[mapa[n]]();
  });
  forma.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true' || e.target.closest('[aria-invalid="true"]')) {
      var n = e.target.name;
      var mapa = { prostorije: 'prostorije', mesto: 'mesto', adresa: 'adresa', sirina: 'mere', visina: 'mere', dubina: 'mere', ime: 'ime', telefon: 'telefon', email: 'email' };
      if (mapa[n]) provere[mapa[n]]();
    }
  });
  // mere: samo cifre
  [].forEach.call(forma.querySelectorAll('[data-mera]'), function (p) {
    p.addEventListener('input', function () { var c = p.value.replace(/\D/g, ''); if (c !== p.value) p.value = c; });
  });

  /* ---------- koraci ---------- */
  function idiNa(n) {
    if (n === trenutni) return;
    var napred = n > trenutni;
    var stari = koraci[trenutni], novi = koraci[n];
    stari.hidden = true;
    novi.hidden = false;
    trenutni = n;
    traka.forEach(function (t, i) {
      t.classList.toggle('gotov', i < n);
      if (i === n) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
    });
    if (!MA.reduced.matches) {
      novi.animate([{ opacity: 0, transform: 'translateX(' + (napred ? 16 : -16) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: EASE_OUT });
    }
    var vrh = document.querySelector('.kt').getBoundingClientRect().top;
    if (vrh < 0 || vrh > window.innerHeight * 0.5) document.querySelector('.kt').scrollIntoView({ block: 'start', behavior: MA.reduced.matches ? 'auto' : 'smooth' });
    var prvo = novi.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), input[type=checkbox]');
    if (prvo) prvo.focus({ preventScroll: true });
  }
  forma.addEventListener('click', function (e) {
    if (e.target.closest('.dalje')) { if (proveriKorak(trenutni)) idiNa(trenutni + 1); }
    else if (e.target.closest('.nazad')) idiNa(trenutni - 1);
  });
  // Enter u polju ne šalje formu pre poslednjeg koraka
  forma.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && trenutni < 2) { e.preventDefault(); if (proveriKorak(trenutni)) idiNa(trenutni + 1); }
  });

  /* ---------- grad: drugo mesto ---------- */
  [].forEach.call(forma.querySelectorAll('[name="grad"]'), function (r) {
    r.addEventListener('change', function () {
      var drugo = r.value === 'Drugo mesto' && r.checked;
      document.getElementById('p-mesto').hidden = !drugo;
      if (drugo) $('#mesto').focus(); else provere.mesto();
    });
  });

  /* ---------- datum: ne u prošlosti ---------- */
  var d = new Date(); $('#datum').min = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  /* ---------- poruka: brojač ---------- */
  var poruka = $('#poruka'), brojac = document.getElementById('brojac');
  function broji() { var n = poruka.value.length; brojac.textContent = n + ' / 2000'; brojac.classList.toggle('blizu', n > 1800); }
  poruka.addEventListener('input', broji);

  /* ---------- fotografija: provera i pregled ---------- */
  var slika = $('#slika'), pregled = forma.querySelector('.pregled'), url = null;
  slika.addEventListener('change', function () {
    if (url) { URL.revokeObjectURL(url); url = null; }
    var f = slika.files[0];
    if (!provere.slika() || !f) { pregled.hidden = true; if (!f) return; slika.value = ''; return; }
    url = URL.createObjectURL(f);
    pregled.querySelector('img').src = url;
    pregled.querySelector('.pregled-ime').textContent = f.name + ' · ' + (f.size / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
    pregled.hidden = false;
  });
  forma.querySelector('.ukloni').addEventListener('click', function () {
    slika.value = ''; pregled.hidden = true; if (url) { URL.revokeObjectURL(url); url = null; } slika.focus();
  });

  /* ---------- fotografija desno prati izabrani materijal ---------- */
  var slike = [].slice.call(document.querySelectorAll('.k-slike img'));
  [].forEach.call(forma.querySelectorAll('[name="materijal"]'), function (r) {
    r.addEventListener('change', function () {
      var m = r.value === 'Još ne znam' ? '' : r.value;
      slike.forEach(function (img) {
        var on = img.dataset.mat === m;
        if (on && img.dataset.src) { img.srcset = img.dataset.srcset; img.src = img.dataset.src; delete img.dataset.src; }
        img.classList.toggle('on', on);
      });
    });
  });

  /* ---------- slanje ---------- */
  var dugme = forma.querySelector('.posalji'), greskaSlanja = forma.querySelector('.greska-slanja');
  forma.addEventListener('submit', function (e) {
    e.preventDefault();
    if (trenutni < 2) { if (proveriKorak(trenutni)) idiNa(trenutni + 1); return; }
    if (!proveriKorak(2)) return;
    if (dugme.getAttribute('aria-busy') === 'true') return;
    greskaSlanja.hidden = true;
    dugme.setAttribute('aria-busy', 'true');
    var podaci = new FormData(forma);
    podaci.set('prostorije', [].map.call(forma.querySelectorAll('[name="prostorije"]:checked'), function (c) { return c.value; }).join(', '));
    if (!slika.files[0]) podaci.delete('attachment');
    fetch(forma.action, { method: 'POST', body: podaci, headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.success === false) throw new Error(j.message || r.status); }); })
      .then(function () {
        koraci.forEach(function (k) { k.hidden = true; });
        traka.forEach(function (t) { t.classList.add('gotov'); t.removeAttribute('aria-current'); });
        var hvala = forma.querySelector('.hvala');
        hvala.hidden = false; hvala.focus();
        if (!MA.reduced.matches) hvala.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE_OUT });
      })
      .catch(function () { greskaSlanja.hidden = false; })
      .then(function () { dugme.removeAttribute('aria-busy'); });
  });

  /* ---------- kopiraj telefon ---------- */
  var kop = document.querySelector('.kopiraj');
  if (kop) kop.addEventListener('click', function () {
    var t = kop.querySelector('.kop-t');
    var gotovo = function (ok) { t.textContent = ok ? 'Kopirano' : 'Kopirajte ručno'; setTimeout(function () { t.textContent = 'Kopiraj'; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(kop.dataset.tekst).then(function () { gotovo(true); }, function () { gotovo(false); });
    else gotovo(false);
  });

  /* ---------- Prekidač „Najgori slučaj“ (?najgori=1): poruka 2000 znakova, mera 99999, dugo ime, č ć đ š ž ---------- */
  if (/[?&]najgori=1/.test(location.search)) {
    var dugo = 'Treba nam kuhinja sa šankom, čivilukom i đačkim stolom u žutom tonu. ';
    var p = ''; while (p.length < 2000) p += dugo;
    poruka.value = p.slice(0, 2000); broji();
    forma.querySelector('[name="sirina"]').value = '99999';
    $('#ime').value = 'Aleksandra Đorđević-Šćekić Živković';
    $('#adresa').value = 'Bulevar cara Lazara 100, stan 23, ulaz iz dvorišta, Liman III';
    forma.querySelector('[name="prostorije"]').checked = true;
  }
})();
