/* Radovi: filter po vrsti nameštaja. Bez animacije (manje pokreta, brif v5): stavke se samo sakriju ili pokažu.
   Projekat se sakrije ako u njemu nema nijedne fotografije te vrste; video uz projekat ostaje dok je projekat vidljiv. */
(function () {
  'use strict';
  var dugmad = [].slice.call(document.querySelectorAll('.f-dugme'));
  var projekti = [].slice.call(document.querySelectorAll('.r-projekat'));
  var stanje = document.querySelector('.f-stanje');
  var prazno = document.querySelector('.r-prazno');
  var IME = { '': 'Svi radovi', kuhinje: 'Kuhinje', plakari: 'Plakari', sobe: 'Sobe', kupatila: 'Kupatila', hodnici: 'Hodnici' };
  function radova(n) { var d = n % 10, s = n % 100; return d === 1 && s !== 11 ? 'rad' : (d >= 2 && d <= 4 && (s < 12 || s > 14) ? 'rada' : 'radova'); }

  function primeni(kat) {
    var ukupno = 0;
    projekti.forEach(function (p) {
      var n = 0;
      [].forEach.call(p.querySelectorAll('[data-kat]'), function (el) {
        var vid = !kat || el.dataset.kat === kat;
        el.hidden = !vid;
        if (vid) n++;
      });
      p.hidden = n === 0;
      ukupno += n;
    });
    prazno.hidden = ukupno > 0;
    stanje.textContent = IME[kat] + ' · ' + ukupno + ' ' + radova(ukupno);
    dugmad.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.kat === kat)); });
    if (window.MA && MA.videoIzbor) MA.videoIzbor();
    if (window.MA && MA.osveziTacke) MA.osveziTacke();
  }
  dugmad.forEach(function (b) { b.addEventListener('click', function () { primeni(b.dataset.kat); }); });
  primeni('');
})();
