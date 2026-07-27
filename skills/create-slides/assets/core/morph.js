/*
 * Cross-slide shared-element transition.
 *
 * The big question on the statement slide and the border title on the next
 * slide are two separate elements. This measures both and parks the border
 * title exactly on top of the statement while its slide is hidden, so that
 * showing the slide transitions it up into the border — reading as one
 * element moving between slides.
 *
 * It only writes CSS custom properties; navigation stays entirely in
 * slides.js.
 */
(function () {
  var from = document.querySelector('[data-morph-from]');
  var to = document.querySelector('[data-morph-to]');
  if (!from || !to) return;

  function update() {
    // Measure the target in its final (border) state, ignoring the parked
    // offset that is currently applied to it.
    to.classList.add('is-measuring');
    var target = to.getBoundingClientRect();
    to.classList.remove('is-measuring');

    var source = from.getBoundingClientRect();
    if (!target.width || !source.width) return;

    var fontFrom = parseFloat(getComputedStyle(from).fontSize);
    var fontTo = parseFloat(getComputedStyle(to).fontSize);

    to.style.setProperty('--morph-x', (source.left + source.width / 2 - (target.left + target.width / 2)) + 'px');
    to.style.setProperty('--morph-y', (source.top + source.height / 2 - (target.top + target.height / 2)) + 'px');
    to.style.setProperty('--morph-scale', fontFrom / fontTo);
  }

  update();
  addEventListener('resize', update);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
})();
