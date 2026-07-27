/*
 * Slides runtime — the only deck engine for the create-slides starter.
 *
 * Classic browser script (no modules, no dependencies). Slides follow DOM
 * order; stepped descendants opt in with positive-integer `data-enter` /
 * `data-exit` attributes. Rendering is fully determined by the pair
 * (current slide index, current step) — there is no per-slide history.
 *
 * The same file loads in Node for tests via the guarded CommonJS export at
 * the bottom; everything DOM-related is confined to `init` and the
 * auto-init block, both guarded on `typeof document`.
 */
(function () {
  'use strict';

  /**
   * Parse one step attribute value. Only positive integers ("1", "2", ...)
   * are valid; anything else (0, negatives, floats, non-numeric, missing)
   * yields null so the attribute is ignored deterministically.
   */
  function parseStep(value) {
    if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value.trim())) return null;
    return parseInt(value, 10);
  }

  /**
   * Normalize a node's raw enter/exit attribute values into a step pair.
   * Invalid-pair rule: when both values parse but exit <= enter, the pair
   * is contradictory, so BOTH attributes are ignored — the node behaves as
   * unstepped (always visible on its slide) and contributes nothing to the
   * slide's final step. This is the documented deterministic choice.
   */
  function stepPair(enterValue, exitValue) {
    var enter = parseStep(enterValue);
    var exit = parseStep(exitValue);
    if (enter !== null && exit !== null && exit <= enter) return { enter: null, exit: null };
    return { enter: enter, exit: exit };
  }

  /**
   * State of one stepped node at step `s`:
   *   before: has an enter value and s < enter
   *   exited: has an exit value and s >= exit
   *   active: otherwise (covers exit-only nodes at s < exit, which start
   *           visible, and unstepped nodes, which are always active)
   */
  function nodeState(step, pair) {
    if (pair.enter !== null && step < pair.enter) return 'before';
    if (pair.exit !== null && step >= pair.exit) return 'exited';
    return 'active';
  }

  /** Final step of a slide: max valid enter/exit across its nodes, or 0. */
  function finalStep(pairs) {
    var max = 0;
    for (var i = 0; i < pairs.length; i += 1) {
      if (pairs[i].enter !== null && pairs[i].enter > max) max = pairs[i].enter;
      if (pairs[i].exit !== null && pairs[i].exit > max) max = pairs[i].exit;
    }
    return max;
  }

  /**
   * Pure navigation reducer. `state` is { slide, step }; `finalSteps` is
   * the per-slide array of final step values. Returns the same object when
   * nothing changes (no wrapping; Shift jumps to a missing slide leave both
   * slide and step untouched).
   */
  function reduce(state, action, finalSteps) {
    var last = finalSteps.length - 1;
    if (action === 'next') {
      if (state.step < finalSteps[state.slide]) return { slide: state.slide, step: state.step + 1 };
      if (state.slide < last) return { slide: state.slide + 1, step: 0 };
      return state;
    }
    if (action === 'prev') {
      if (state.step > 0) return { slide: state.slide, step: state.step - 1 };
      if (state.slide > 0) return { slide: state.slide - 1, step: finalSteps[state.slide - 1] };
      return state;
    }
    if (action === 'nextSlide') {
      if (state.slide < last) return { slide: state.slide + 1, step: 0 };
      return state;
    }
    if (action === 'prevSlide') {
      if (state.slide > 0) return { slide: state.slide - 1, step: finalSteps[state.slide - 1] };
      return state;
    }
    return state;
  }

  /** True for targets whose keystrokes the deck must not steal. */
  function isEditableTarget(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    var tag = typeof target.tagName === 'string' ? target.tagName.toUpperCase() : '';
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  /**
   * Map a keyboard event (or event-shaped object) to a reducer action, or
   * null when the event must be ignored: non-arrow keys, IME composition,
   * Ctrl/Alt/Meta-modified arrows, and editable targets.
   */
  function actionForKey(event) {
    if (event.isComposing) return null;
    if (event.ctrlKey || event.altKey || event.metaKey) return null;
    if (isEditableTarget(event.target)) return null;
    var forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    var backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (!forward && !backward) return null;
    if (event.shiftKey) return forward ? 'nextSlide' : 'prevSlide';
    return forward ? 'next' : 'prev';
  }

  /**
   * Pure render model: for a deck described as an array of step-pair arrays
   * (one array per slide), compute what every slide and node shows at
   * `state`. Non-current slides are hidden, so their nodes render at step 0
   * — this keeps output a pure function of (slide, step).
   */
  function renderModel(state, deck) {
    return deck.map(function (pairs, index) {
      var current = index === state.slide;
      var step = current ? state.step : 0;
      return {
        current: current,
        nodes: pairs.map(function (pair) {
          return nodeState(step, pair);
        })
      };
    });
  }

  /**
   * DOM initializer. Binds the reducer to `.slide` elements under `root`
   * (default: document) and to document-level keydown. Returns a small
   * controller for manual driving/inspection.
   */
  function init(root) {
    var scope = root || document;
    var slideEls = Array.prototype.slice.call(scope.querySelectorAll('.slide'));
    var slides = slideEls.map(function (el) {
      var nodeEls = Array.prototype.slice.call(el.querySelectorAll('[data-enter], [data-exit]'));
      var pairs = nodeEls.map(function (node) {
        return stepPair(node.getAttribute('data-enter'), node.getAttribute('data-exit'));
      });
      return { el: el, nodeEls: nodeEls, pairs: pairs, finalStep: finalStep(pairs) };
    });
    var finalSteps = slides.map(function (slide) {
      return slide.finalStep;
    });
    var state = { slide: 0, step: 0 };

    function render() {
      var model = renderModel(state, slides.map(function (slide) {
        return slide.pairs;
      }));
      slides.forEach(function (slide, index) {
        var view = model[index];
        slide.el.setAttribute('data-state', view.current ? 'current' : 'hidden');
        slide.el.setAttribute('aria-hidden', view.current ? 'false' : 'true');
        // `inert` removes hidden slides from focus and interaction order.
        if (view.current) slide.el.removeAttribute('inert');
        else slide.el.setAttribute('inert', '');
        slide.nodeEls.forEach(function (node, nodeIndex) {
          node.setAttribute('data-step-state', view.nodes[nodeIndex]);
        });
      });
    }

    function send(action) {
      var next = reduce(state, action, finalSteps);
      if (next !== state) {
        state = next;
        render();
      }
      return state;
    }

    function onKeydown(event) {
      var action = actionForKey(event);
      if (action === null) return;
      event.preventDefault();
      send(action);
    }

    document.addEventListener('keydown', onKeydown);
    render();

    return {
      getState: function () {
        return { slide: state.slide, step: state.step };
      },
      finalSteps: finalSteps.slice(),
      send: send,
      destroy: function () {
        document.removeEventListener('keydown', onKeydown);
      }
    };
  }

  var SlidesRuntime = {
    parseStep: parseStep,
    stepPair: stepPair,
    nodeState: nodeState,
    finalStep: finalStep,
    reduce: reduce,
    isEditableTarget: isEditableTarget,
    actionForKey: actionForKey,
    renderModel: renderModel,
    init: init
  };

  globalThis.SlidesRuntime = SlidesRuntime;

  // Guarded CommonJS export so Node tests can require() this classic script.
  if (typeof module !== 'undefined' && module.exports) module.exports = SlidesRuntime;

  // Auto-init in the browser only; Node (tests) has no document. The live
  // controller is exposed for console/automation use — never call init()
  // a second time, that would register a competing keydown listener.
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        SlidesRuntime.controller = init();
      });
    } else {
      SlidesRuntime.controller = init();
    }
  }
})();
