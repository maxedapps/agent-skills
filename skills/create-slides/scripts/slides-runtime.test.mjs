import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// slides.js is a classic browser script with a guarded CommonJS export;
// createRequire loads that exact file without any build step.
const require = createRequire(import.meta.url);
const runtimePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'assets',
  'slides.js'
);
const R = require(runtimePath);

const pair = (enter, exit) => R.stepPair(enter, exit);

describe('parseStep', () => {
  test('accepts positive integers only', () => {
    assert.equal(R.parseStep('1'), 1);
    assert.equal(R.parseStep('42'), 42);
  });

  test('rejects zero, negatives, floats, non-numeric, and missing values', () => {
    for (const bad of ['0', '-1', '1.5', 'abc', '', '1x', null, undefined]) {
      assert.equal(R.parseStep(bad), null, `expected null for ${JSON.stringify(bad)}`);
    }
  });
});

describe('stepPair invalid-pair handling', () => {
  test('exit greater than enter is kept', () => {
    assert.deepEqual(pair('2', '4'), { enter: 2, exit: 4 });
  });

  test('exit equal to enter invalidates both attributes', () => {
    assert.deepEqual(pair('3', '3'), { enter: null, exit: null });
  });

  test('exit less than enter invalidates both attributes', () => {
    assert.deepEqual(pair('4', '2'), { enter: null, exit: null });
  });

  test('an unparsable value is dropped without invalidating the other', () => {
    assert.deepEqual(pair('2', 'nope'), { enter: 2, exit: null });
    assert.deepEqual(pair('0', '2'), { enter: null, exit: 2 });
  });

  test('invalid pair behaves as unstepped: always active, no final-step contribution', () => {
    const invalid = pair('5', '2');
    for (const s of [0, 1, 2, 5, 9]) {
      assert.equal(R.nodeState(s, invalid), 'active');
    }
    assert.equal(R.finalStep([invalid]), 0);
  });
});

describe('nodeState predicates', () => {
  test('enter-only: before while s < enter, active from s >= enter', () => {
    const p = pair('2', null);
    assert.equal(R.nodeState(0, p), 'before');
    assert.equal(R.nodeState(1, p), 'before');
    assert.equal(R.nodeState(2, p), 'active');
    assert.equal(R.nodeState(3, p), 'active');
  });

  test('exit-only: starts visible, exited from s >= exit', () => {
    const p = pair(null, '2');
    assert.equal(R.nodeState(0, p), 'active');
    assert.equal(R.nodeState(1, p), 'active');
    assert.equal(R.nodeState(2, p), 'exited');
    assert.equal(R.nodeState(5, p), 'exited');
  });

  test('enter and exit: before, then active, then exited', () => {
    const p = pair('1', '3');
    assert.equal(R.nodeState(0, p), 'before');
    assert.equal(R.nodeState(1, p), 'active');
    assert.equal(R.nodeState(2, p), 'active');
    assert.equal(R.nodeState(3, p), 'exited');
  });

  test('unstepped node is always active', () => {
    const p = pair(null, null);
    for (const s of [0, 1, 7]) assert.equal(R.nodeState(s, p), 'active');
  });

  test('grouped steps: equal values change state at the same step', () => {
    const a = pair('2', null);
    const b = pair('2', null);
    assert.equal(R.nodeState(1, a), R.nodeState(1, b));
    assert.equal(R.nodeState(2, a), 'active');
    assert.equal(R.nodeState(2, b), 'active');
  });
});

describe('finalStep', () => {
  test('no stepped nodes yields 0', () => {
    assert.equal(R.finalStep([]), 0);
    assert.equal(R.finalStep([pair(null, null)]), 0);
  });

  test('maximum across enter and exit values', () => {
    assert.equal(R.finalStep([pair('1', null), pair('2', '4'), pair(null, '3')]), 4);
  });

  test('invalid pairs are excluded from the maximum', () => {
    assert.equal(R.finalStep([pair('9', '9'), pair('1', null)]), 1);
  });
});

// Deck used by navigation tests: slide 0 has 2 steps, slide 1 has none,
// slide 2 has 3 steps.
const finalSteps = [2, 0, 3];

describe('reduce: one-step traversal', () => {
  test('next advances steps, then moves to the next slide at step 0', () => {
    let s = { slide: 0, step: 0 };
    s = R.reduce(s, 'next', finalSteps);
    assert.deepEqual(s, { slide: 0, step: 1 });
    s = R.reduce(s, 'next', finalSteps);
    assert.deepEqual(s, { slide: 0, step: 2 });
    s = R.reduce(s, 'next', finalSteps);
    assert.deepEqual(s, { slide: 1, step: 0 });
  });

  test('next from a slide with no steps goes straight to the next slide', () => {
    assert.deepEqual(R.reduce({ slide: 1, step: 0 }, 'next', finalSteps), { slide: 2, step: 0 });
  });

  test('prev reverses one step within a slide', () => {
    assert.deepEqual(R.reduce({ slide: 2, step: 2 }, 'prev', finalSteps), { slide: 2, step: 1 });
  });

  test('prev across a boundary opens the previous slide at its final step', () => {
    assert.deepEqual(R.reduce({ slide: 1, step: 0 }, 'prev', finalSteps), { slide: 0, step: 2 });
    assert.deepEqual(R.reduce({ slide: 2, step: 0 }, 'prev', finalSteps), { slide: 1, step: 0 });
  });

  test('no wrap: next at the last slide final step is unchanged', () => {
    const s = { slide: 2, step: 3 };
    assert.equal(R.reduce(s, 'next', finalSteps), s);
  });

  test('no wrap: prev at the first slide step 0 is unchanged', () => {
    const s = { slide: 0, step: 0 };
    assert.equal(R.reduce(s, 'prev', finalSteps), s);
  });
});

describe('reduce: Shift jumps', () => {
  test('nextSlide skips remaining steps to the next slide at step 0', () => {
    assert.deepEqual(R.reduce({ slide: 0, step: 1 }, 'nextSlide', finalSteps), { slide: 1, step: 0 });
  });

  test('prevSlide opens the previous slide at its final step', () => {
    assert.deepEqual(R.reduce({ slide: 2, step: 1 }, 'prevSlide', finalSteps), { slide: 1, step: 0 });
    assert.deepEqual(R.reduce({ slide: 1, step: 0 }, 'prevSlide', finalSteps), { slide: 0, step: 2 });
  });

  test('nextSlide with no next slide leaves slide AND step unchanged', () => {
    const s = { slide: 2, step: 1 };
    const out = R.reduce(s, 'nextSlide', finalSteps);
    assert.equal(out, s);
    assert.deepEqual(out, { slide: 2, step: 1 });
  });

  test('prevSlide with no previous slide leaves slide AND step unchanged', () => {
    const s = { slide: 0, step: 2 };
    const out = R.reduce(s, 'prevSlide', finalSteps);
    assert.equal(out, s);
    assert.deepEqual(out, { slide: 0, step: 2 });
  });
});

describe('actionForKey', () => {
  const key = (overrides) => ({
    key: 'ArrowRight',
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    isComposing: false,
    target: { tagName: 'DIV' },
    ...overrides,
  });

  test('plain arrows map to one-step actions', () => {
    assert.equal(R.actionForKey(key({ key: 'ArrowRight' })), 'next');
    assert.equal(R.actionForKey(key({ key: 'ArrowDown' })), 'next');
    assert.equal(R.actionForKey(key({ key: 'ArrowLeft' })), 'prev');
    assert.equal(R.actionForKey(key({ key: 'ArrowUp' })), 'prev');
  });

  test('shifted arrows map to slide jumps', () => {
    assert.equal(R.actionForKey(key({ key: 'ArrowRight', shiftKey: true })), 'nextSlide');
    assert.equal(R.actionForKey(key({ key: 'ArrowDown', shiftKey: true })), 'nextSlide');
    assert.equal(R.actionForKey(key({ key: 'ArrowLeft', shiftKey: true })), 'prevSlide');
    assert.equal(R.actionForKey(key({ key: 'ArrowUp', shiftKey: true })), 'prevSlide');
  });

  test('non-arrow keys are ignored', () => {
    for (const k of [' ', 'Enter', 'a', 'PageDown', 'Tab']) {
      assert.equal(R.actionForKey(key({ key: k })), null);
    }
  });

  test('Ctrl/Alt/Meta arrows are ignored', () => {
    assert.equal(R.actionForKey(key({ ctrlKey: true })), null);
    assert.equal(R.actionForKey(key({ altKey: true })), null);
    assert.equal(R.actionForKey(key({ metaKey: true })), null);
  });

  test('composition events are ignored', () => {
    assert.equal(R.actionForKey(key({ isComposing: true })), null);
  });

  test('editable targets are ignored', () => {
    for (const target of [
      { tagName: 'INPUT' },
      { tagName: 'TEXTAREA' },
      { tagName: 'SELECT' },
      { tagName: 'DIV', isContentEditable: true },
    ]) {
      assert.equal(R.actionForKey(key({ target })), null, `expected null for ${JSON.stringify(target)}`);
    }
    assert.equal(R.isEditableTarget(null), false);
    assert.equal(R.isEditableTarget({ tagName: 'P' }), false);
  });
});

describe('deterministic rendering', () => {
  // Deck as node step-pairs per slide, mirroring what init() builds from DOM.
  const deck = [
    [pair('1', null), pair(null, '1')],
    [],
    [pair('1', '3'), pair('2', null), pair('2', null)],
  ];

  test('renderModel depends only on (slide, step), not navigation history', () => {
    // Reach (slide 2, step 3) via two different key paths.
    const steps = deck.map((nodes) => R.finalStep(nodes));
    let a = { slide: 0, step: 0 };
    for (const action of ['next', 'next', 'next', 'next', 'next', 'next']) {
      a = R.reduce(a, action, steps);
    }
    let b = { slide: 0, step: 0 };
    for (const action of ['nextSlide', 'nextSlide', 'next', 'next', 'prev', 'next', 'next']) {
      b = R.reduce(b, action, steps);
    }
    assert.deepEqual(a, b);
    assert.deepEqual(R.renderModel(a, deck), R.renderModel(b, deck));
  });

  test('repeated evaluation at the same state is identical', () => {
    const state = { slide: 2, step: 2 };
    assert.deepEqual(R.renderModel(state, deck), R.renderModel(state, deck));
  });

  test('only the current slide is current; hidden slides render at step 0', () => {
    const model = R.renderModel({ slide: 2, step: 3 }, deck);
    assert.deepEqual(model.map((s) => s.current), [false, false, true]);
    // Slide 0 (hidden) shows its step-0 states: enter-only before, exit-only active.
    assert.deepEqual(model[0].nodes, ['before', 'active']);
    // Current slide at step 3: enter+exit node exited, grouped nodes active.
    assert.deepEqual(model[2].nodes, ['exited', 'active', 'active']);
  });
});

describe('global export', () => {
  test('runtime is also exposed on globalThis for browser use', () => {
    assert.equal(globalThis.SlidesRuntime, R);
  });
});
