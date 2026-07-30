/*
 * Cross-slide shared-element transitions.
 *
 * A `data-morph-to` element and the `data-morph-from` element carrying the
 * same value are two separate elements on two separate slides. This measures
 * both and parks the target exactly on top of its source while the target's
 * slide is hidden, so that showing the slide transitions it back into place —
 * reading as one element moving between slides.
 *
 * It only writes CSS custom properties; navigation stays entirely in
 * slides.js.
 */
(function () {
  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-morph-to]'));
  if (!targets.length) return;

  var pairs = targets.map(function (to) {
    var name = to.getAttribute('data-morph-to');
    return {
      to: to,
      from: document.querySelector('[data-morph-from="' + name + '"]')
    };
  }).filter(function (pair) {
    return pair.from;
  });

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

  function place(pair) {
    var to = pair.to;
    var from = pair.from;

    // Measure the target in its final (resting) state, ignoring the parked
    // offset that is currently applied to it.
    to.classList.add('is-measuring');
    var target = to.getBoundingClientRect();
    var targetWidth = to.offsetWidth;
    to.classList.remove('is-measuring');

    var source = from.getBoundingClientRect();
    // Layout width, so a rotated source is not read through its larger
    // axis-aligned bounding box. Rotation keeps the centre, so the rects
    // still give the offset.
    var sourceWidth = from.offsetWidth;
    if (!targetWidth || !sourceWidth) return;

    to.style.setProperty('--morph-x', (source.left + source.width / 2 - (target.left + target.width / 2)) + 'px');
    to.style.setProperty('--morph-y', (source.top + source.height / 2 - (target.top + target.height / 2)) + 'px');
    to.style.setProperty('--morph-scale', sourceWidth / targetWidth);
    to.style.setProperty('--morph-rotate', (rotationOf(from) - rotationOf(to)) + 'deg');
  }

  // Park a target only while its paired source slide is current. Keeping every
  // hidden target parked made it visibly reverse-morph when leaving the target
  // for the following slide.
  function syncParked() {
    pairs.forEach(function (pair) {
      var sourceSlide = pair.from.closest('.slide');
      pair.to.classList.toggle(
        'is-morph-parked',
        Boolean(sourceSlide && sourceSlide.getAttribute('data-state') === 'current')
      );
    });
  }

  // Measuring must never run on navigation. `is-measuring` sets
  // `transition: none`, and reading the rect flushes style synchronously — so
  // the browser records the *resting* position as the start state and the
  // handoff jumps instead of moving. Measure on load and on resize only.
  function update() {
    pairs.forEach(place);
    syncParked();
  }

  update();
  addEventListener('resize', update);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);

  // slides.js renders navigation by changing data-state. Mutation observers
  // run before the next paint, so the parked class is ready for both forward
  // and backward shared-element handoffs without coupling the two runtimes.
  new MutationObserver(syncParked).observe(document.querySelector('main') || document.body, {
    attributes: true,
    attributeFilter: ['data-state'],
    subtree: true
  });
})();
