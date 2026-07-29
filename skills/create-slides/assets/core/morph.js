/*
 * Cross-slide shared-element transitions.
 *
 * A `data-morph-to` element and the `data-morph-from` element carrying the
 * same value are two separate elements on two separate slides. This measures
 * both and parks the target exactly on top of its source while the target's
 * slide is hidden, so that showing the slide transitions it back into place —
 * reading as one element moving between slides.
 *
 * Pairs are matched by attribute value, so a deck can run several at once:
 * valueless attributes pair as "" (the title morph), and any slug pairs with
 * its own twin. Text and non-text elements both work.
 *
 * It only writes CSS custom properties; navigation stays entirely in
 * slides.js.
 */
(function () {
  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-morph-to]'));
  if (!targets.length) return;

  /* Rotation may sit on the element or on an ancestor (scattered tiles rotate
     their figure, not the tile), so it has to be accumulated. */
  function rotationOf(el) {
    var deg = 0;
    for (var node = el; node && node !== document.body; node = node.parentElement) {
      var value = getComputedStyle(node).rotate;
      if (value && value !== 'none') deg += parseFloat(value.trim().split(/\s+/).pop()) || 0;
    }
    return deg;
  }

  function place(to) {
    var from = document.querySelector('[data-morph-from="' + to.getAttribute('data-morph-to') + '"]');
    if (!from) return;

    // Measure the target in its final (resting) state, ignoring the parked
    // offset that is currently applied to it.
    to.classList.add('is-measuring');
    var target = to.getBoundingClientRect();
    var targetWidth = to.offsetWidth;
    to.classList.remove('is-measuring');

    var source = from.getBoundingClientRect();
    // Layout width, so a rotated source is not read through its larger
    // axis-aligned bounding box. Rotation preserves the centre, so the rects
    // still give the offset.
    var sourceWidth = from.offsetWidth;
    if (!targetWidth || !sourceWidth) return;

    to.style.setProperty('--morph-x', (source.left + source.width / 2 - (target.left + target.width / 2)) + 'px');
    to.style.setProperty('--morph-y', (source.top + source.height / 2 - (target.top + target.height / 2)) + 'px');
    to.style.setProperty('--morph-scale', sourceWidth / targetWidth);
    to.style.setProperty('--morph-rotate', (rotationOf(from) - rotationOf(to)) + 'deg');
  }

  function update() {
    targets.forEach(place);
  }

  update();
  addEventListener('resize', update);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
})();
