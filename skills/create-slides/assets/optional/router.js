/*
 * Hash router — deep links, and an address bar that follows the deck.
 *
 * OPT-IN. Copy to the deck's `core/` and add
 * `<script src="core/router.js"></script>` after slides.js and morph.js only
 * when the user asks for URL routing.
 *
 * A slide is addressed by its 1-based deck position — `#4` is the fourth
 * slide. Reveal steps are deliberately not addressable: a deep link always
 * lands on the slide before any of it has been revealed. (Putting the step in
 * the hash also means a history write per keypress, which browsers rate-limit.)
 *
 * Jumps land instantly. The deck is stepped to the target inside a single
 * task, so the browser only ever paints the destination, and that frame is
 * painted with transitions suppressed — a deep link never replays a
 * cross-slide morph out of context or drops in mid-fade. Entrance animations
 * still run: those belong to the slide, not to the move.
 *
 * Navigation itself stays entirely in slides.js; this only reads the
 * controller and rewrites the hash.
 */
(function () {
  'use strict';

  function start() {
    var runtime = globalThis.SlidesRuntime;
    var controller = runtime && runtime.controller;
    if (!controller) return;

    var last = document.querySelectorAll('.slide').length - 1;
    if (last < 0) return;

    /** The address for a deck position. Steps do not appear in the hash. */
    function addressOf(state) {
      return String(state.slide + 1);
    }

    /** Resolve an address to a deck position, or null when it names nothing. */
    function positionOf(address) {
      if (!/^[0-9]+$/.test(address)) return null;
      var index = parseInt(address, 10) - 1;
      if (index < 0 || index > last) return null;
      return { slide: index, step: 0 };
    }

    function jump(target) {
      var root = document.documentElement;
      root.classList.add('is-jumping');

      // Whole slides first, then steps: every send lands in the same task, so
      // the intermediate positions are never styled, let alone painted.
      while (controller.getState().slide > target.slide) controller.send('prevSlide');
      while (controller.getState().slide < target.slide) controller.send('nextSlide');
      while (controller.getState().step > target.step) controller.send('prev');
      while (controller.getState().step < target.step) controller.send('next');

      // The next frame is painted with the class still on, so nothing eases in
      // from wherever it sat before; the frame after takes it off with every
      // value already settled, which starts no transition of its own.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          root.classList.remove('is-jumping');
        });
      });
    }

    // Writes are coalesced into the next frame: a burst of sends, or a key
    // held down on repeat, costs one history call instead of one per step.
    var pending = false;
    function sync() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        var hash = '#' + addressOf(controller.getState());
        if (hash === location.hash) return;
        try {
          history.replaceState(history.state, '', hash);
        } catch (error) {
          /* Some browsers forbid replaceState on file://; the deck is fine
             without the address bar following along. */
        }
      });
    }

    function follow() {
      var target = positionOf(location.hash.slice(1));
      if (target) jump(target);
      sync();
    }

    // The hash is authoritative on arrival, and again whenever it is edited by
    // hand. Our own writes go through replaceState, which fires no event, so
    // this cannot loop.
    addEventListener('hashchange', follow);

    // Any key that moves the deck has been handled by the time the coalescing
    // frame runs, which keeps this independent of listener registration order.
    document.addEventListener('keydown', sync);

    follow();

    globalThis.SlidesRouter = {
      addressOf: addressOf,
      goTo: function (address) {
        var target = positionOf(String(address).replace(/^#/, ''));
        if (!target) return false;
        jump(target);
        sync();
        return true;
      }
    };
  }

  if (globalThis.SlidesRuntime && globalThis.SlidesRuntime.controller) start();
  else addEventListener('DOMContentLoaded', start);
})();
