/* Kontakt: forma u 2 koraka, provera polja dok se kuca, slanje preko Web3Forms (fetch + preventDefault).
   Bez animacije prelaza (brif v5: malo pokreta). */
(function () {
  'use strict';
  var forma = document.querySelector('.forma');
  if (!forma) return;
  var koraci = [].slice.call(forma.querySelectorAll('.korak'));
  var oznaka = document.querySelector('.k-korak');
  var trenutni = 0;
  var MAX_SLIKA = 10 * 1024 * 1024;
  var $ = function (s) { return forma.querySelector(s); };

  function greska(id, poruka, polje) {
    var g = document.getElementById(id);
    if (poruka) { if (typeof poruka === 'string') g.textContent = poruka; g.hidden = false; } else g.hidden = true;
    if (polje) [].concat(polje).forEach(function (p) { if (poruka) p.setAttribute('aria-invalid', 'true'); else p.removeAttribute('aria-invalid'); });
    return !poruka;
  }
  var provere = {
    kategorije: function () { return greska('g-kategorije', !forma.querySelectorAll('[name="kategorije"]:checked').length, document.querySelector('#p-kategorije .cipovi')); },
    mere: function () {
      var polja = [].slice.call(forma.querySelectorAll('[data-mera]'));
      var lose = polja.filter(function (p) { var v = p.value.trim(); if (!v) return false; var n = Number(v); return !/^\d+$/.test(v) || n < 1 || n > 2000; });
      polja.forEach(function (p) { if (lose.indexOf(p) >= 0) p.setAttribute('aria-invalid', 'true'); else p.removeAttribute('aria-invalid'); });
      return greska('g-mere', lose.length > 0);
    },
    slika: function () {
      var f = $('#slika').files[0];
      if (f && !/^image\//.test(f.type)) return greska('g-slika', 'Izabrani fajl nije fotografija.', $('#slika'));
      return greska('g-slika', f && f.size > MAX_SLIKA ? 'Fotografija je veća od 10 MB. Izaberite manju ili je pošaljite na Viber.' : false, $('#slika'));
    },
    ime: function () { return greska('g-ime', !$('#ime').value.trim(), $('#ime')); },
    telefon: function () { var c = $('#telefon').value.replace(/\D/g, ''); return greska('g-telefon', c.length < 6 || c.length > 15, $('#telefon')); },
    email: function () { var v = $('#email').value.trim(); return greska('g-email', v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), $('#email')); }
  };
  var poKoraku = [['kategorije', 'mere', 'slika'], ['ime', 'telefon', 'email']];
  var MAPA = { kategorije: 'kategorije', sirina: 'mere', visina: 'mere', dubina: 'mere', ime: 'ime', telefon: 'telefon', email: 'email' };

  function proveriKorak(k) {
    var ok = true;
    poKoraku[k].forEach(function (n) { if (!provere[n]()) ok = false; });
    if (!ok) {
      var prvo = koraci[k].querySelector('[aria-invalid="true"]');
      if (prvo) (prvo.matches('input, textarea') ? prvo : prvo.querySelector('input')).focus();
    }
    return ok;
  }
  forma.addEventListener('focusout', function (e) { var n = MAPA[e.target.name]; if (n && e.target.value) provere[n](); });
  forma.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true' || e.target.closest('[aria-invalid="true"]')) { var n = MAPA[e.target.name]; if (n) provere[n](); }
  });
  [].forEach.call(forma.querySelectorAll('[data-mera]'), function (p) {
    p.addEventListener('input', function () { var c = p.value.replace(/\D/g, ''); if (c !== p.value) p.value = c; });
  });

  function idiNa(n) {
    koraci[trenutni].hidden = true; koraci[n].hidden = false; trenutni = n;
    oznaka.innerHTML = 'Korak <span class="num">' + (n + 1) + '</span> od 2 · ' + (n ? 'Vaši podaci' : 'Šta vam treba');
    var r = oznaka.getBoundingClientRect();
    if (r.top < 0) oznaka.scrollIntoView({ block: 'start' });
    var prvo = koraci[n].querySelector('input:not([type=hidden]):not([type=file])');
    if (prvo) prvo.focus({ preventScroll: true });
  }
  forma.addEventListener('click', function (e) {
    if (e.target.closest('.dalje')) { if (proveriKorak(0)) idiNa(1); }
    else if (e.target.closest('.nazad')) idiNa(0);
  });
  forma.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && trenutni === 0) { e.preventDefault(); if (proveriKorak(0)) idiNa(1); }
  });

  var poruka = $('#poruka'), brojac = document.getElementById('brojac');
  function broji() { var n = poruka.value.length; brojac.textContent = n + ' / 2000'; brojac.classList.toggle('blizu', n > 1800); }
  poruka.addEventListener('input', broji);

  var slika = $('#slika'), pregled = forma.querySelector('.pregled'), url = null;
  slika.addEventListener('change', function () {
    if (url) { URL.revokeObjectURL(url); url = null; }
    var f = slika.files[0];
    if (!f) { pregled.hidden = true; return; }
    if (!provere.slika()) { pregled.hidden = true; slika.value = ''; return; }
    url = URL.createObjectURL(f);
    var img = pregled.querySelector('img');
    if (!img) { img = document.createElement('img'); img.alt = 'Pregled izabrane fotografije'; pregled.prepend(img); }
    img.src = url;
    pregled.querySelector('.pregled-ime').textContent = f.name + ' · ' + (f.size / 1048576).toFixed(1).replace('.', ',') + ' MB';
    pregled.hidden = false;
  });
  forma.querySelector('.ukloni').addEventListener('click', function () { slika.value = ''; pregled.hidden = true; if (url) { URL.revokeObjectURL(url); url = null; } slika.focus(); });

  var dugme = forma.querySelector('.posalji'), greskaSlanja = forma.querySelector('.greska-slanja');
  forma.addEventListener('submit', function (e) {
    e.preventDefault();
    if (trenutni === 0) { if (proveriKorak(0)) idiNa(1); return; }
    if (!proveriKorak(1) || dugme.getAttribute('aria-busy') === 'true') return;
    greskaSlanja.hidden = true;
    dugme.setAttribute('aria-busy', 'true');
    var podaci = new FormData(forma);
    podaci.set('kategorije', [].map.call(forma.querySelectorAll('[name="kategorije"]:checked'), function (c) { return c.value; }).join(', '));
    if (!slika.files[0]) podaci.delete('attachment');
    fetch(forma.action, { method: 'POST', body: podaci, headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.success === false) throw new Error(j.message || r.status); }); })
      .then(function () {
        koraci.forEach(function (k) { k.hidden = true; });
        oznaka.hidden = true;
        var hvala = forma.querySelector('.hvala'); hvala.hidden = false; hvala.focus();
      })
      .catch(function () { greskaSlanja.hidden = false; })
      .then(function () { dugme.removeAttribute('aria-busy'); });
  });

  /* Prekidač „Najgori slučaj“ (?najgori=1, samo za proveru): poruka 2000 znakova, mera 99999, dugo ime, č ć đ š ž */
  if (/[?&]najgori=1/.test(location.search)) {
    var t = 'Treba nam kuhinja sa šankom, čivilukom i đačkim stolom u žutom tonu. ', p = '';
    while (p.length < 2000) p += t;
    poruka.value = p.slice(0, 2000); broji();
    forma.querySelector('[name="sirina"]').value = '99999';
    forma.querySelector('[name="kategorije"]').checked = true;
    $('#ime').value = 'Aleksandra Đorđević-Šćekić Živković';
  }
})();
