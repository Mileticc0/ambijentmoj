/* Kako radimo: accordion. Visina preko grid-template-rows (0fr → 1fr), 240 ms; prekidivo jer je CSS transition. */
(function () {
  'use strict';
  [].forEach.call(document.querySelectorAll('.acc-dugme'), function (b) {
    var telo = document.getElementById(b.getAttribute('aria-controls'));
    b.addEventListener('click', function () {
      var otv = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(otv));
      telo.classList.toggle('otvoreno', otv);
    });
  });
})();
