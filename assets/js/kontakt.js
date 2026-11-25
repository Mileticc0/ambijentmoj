/* Kontakt: kratka forma u jednom koraku. Obavezni su samo ime i telefon; slanje preko Web3Forms (fetch + preventDefault). */
(function () {
  'use strict';
  var forma = document.querySelector('.forma');
  if (!forma) return;
  var MAX = 10 * 1024 * 1024;
  var $ = function (s) { return forma.querySelector(s); };

  function greska(id, poruka, polje) {
    var g = document.getElementById(id);
    if (poruka) { if (typeof poruka === 'string') g.textContent = poruka; g.hidden = false; } else g.hidden = true;
    if (polje) { if (poruka) polje.setAttribute('aria-invalid', 'true'); else polje.removeAttribute('aria-invalid'); }
    return !poruka;
  }
  var provere = {
    ime: function () { return greska('g-ime', !$('#ime').value.trim(), $('#ime')); },
    telefon: function () { var c = $('#telefon').value.replace(/\D/g, ''); return greska('g-telefon', c.length < 6 || c.length > 15, $('#telefon')); },
    email: function () { var v = $('#email').value.trim(); return greska('g-email', v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), $('#email')); },
    prilog: function () {
      var f = $('#prilog').files[0];
      if (f && !/^image\/|application\/pdf/.test(f.type)) return greska('g-prilog', 'Izaberite fotografiju ili PDF.', $('#prilog'));
      return greska('g-prilog', f && f.size > MAX ? 'Fajl je veći od 10 MB. Pošaljite manji ili ga pošaljite na mojambijent@gmail.com.' : false, $('#prilog'));
    }
  };
  forma.addEventListener('focusout', function (e) { var n = e.target.name; if (provere[n] && e.target.value) provere[n](); });
  forma.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid') === 'true' && provere[e.target.name]) provere[e.target.name](); });

  var poruka = $('#poruka'), brojac = document.getElementById('brojac');
  function broji() { var n = poruka.value.length; brojac.textContent = n + ' / 2000'; brojac.classList.toggle('blizu', n > 1800); }
  poruka.addEventListener('input', broji);

  var prilog = $('#prilog'), pregled = forma.querySelector('.pregled');
  prilog.addEventListener('change', function () {
    var f = prilog.files[0];
    if (!f) { pregled.hidden = true; return; }
    if (!provere.prilog()) { pregled.hidden = true; prilog.value = ''; return; }
    pregled.querySelector('.pregled-ime').textContent = f.name + ' · ' + (f.size / 1048576).toFixed(1).replace('.', ',') + ' MB';
    pregled.hidden = false;
  });
  forma.querySelector('.ukloni').addEventListener('click', function () { prilog.value = ''; pregled.hidden = true; prilog.focus(); });

  var dugme = forma.querySelector('.posalji'), greskaSlanja = forma.querySelector('.greska-slanja');
  forma.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = ['ime', 'telefon', 'email', 'prilog'].map(function (n) { return provere[n](); }).every(Boolean);
    if (!ok) { var prvo = forma.querySelector('[aria-invalid="true"]'); if (prvo) prvo.focus(); return; }
    if (dugme.getAttribute('aria-busy') === 'true') return;
    greskaSlanja.hidden = true;
    dugme.setAttribute('aria-busy', 'true');
    var podaci = new FormData(forma);
    if (!prilog.files[0]) podaci.delete('attachment');
    fetch(forma.action, { method: 'POST', body: podaci, headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.success === false) throw new Error(j.message || r.status); }); })
      .then(function () {
        [].forEach.call(forma.children, function (el) { if (!el.classList.contains('hvala') && el.type !== 'hidden') el.hidden = true; });
        var hvala = forma.querySelector('.hvala'); hvala.hidden = false; hvala.focus();
      })
      .catch(function () { greskaSlanja.hidden = false; })
      .then(function () { dugme.removeAttribute('aria-busy'); });
  });

  /* Prekidač „Najgori slučaj“ (?najgori=1, samo za proveru): poruka 2000 znakova, dugo ime, č ć đ š ž */
  if (/[?&]najgori=1/.test(location.search)) {
    var t = 'Treba nam kuhinja sa šankom, čivilukom i đačkim stolom u žutom tonu. ', p = '';
    while (p.length < 2000) p += t;
    poruka.value = p.slice(0, 2000); broji();
    $('#ime').value = 'Aleksandra Đorđević-Šćekić Živković';
    $('#email').value = 'aleksandra.djordjevic-scekic.zivkovic@primer-dugog-domena.rs';
  }
})();
