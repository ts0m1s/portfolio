// The lamp pull, simulated as a pendulum (angle) with a springy cord (stretch).
// Tugs, swings, drags and releases all move the same state, so the rope can be grabbed
// at any moment and always settles on its own instead of snapping back.

import { switchTheme } from './theme';

const STRETCH = { stiffness: 170, damping: 14 };
const SWING = { stiffness: 38, damping: 2.6 };

const MOVED = 4; // px of movement before a press counts as a drag
const THRESHOLD = 28; // px of stretch needed for a drag to switch the theme
const MAX_STRETCH = 90;
const MAX_ANGLE = 0.35; // radians
const AT_REST = 0.002;

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

interface Rope {
  element: HTMLElement;
  pull: HTMLElement;
  stretch: number;
  stretchSpeed: number;
  angle: number;
  angleSpeed: number;
  held: boolean;
  frame: number;
  lastTime: number;
}

const ropes = new WeakMap<Element, Rope>();

const ropeFor = (element: HTMLElement): Rope => {
  let rope = ropes.get(element);
  if (!rope) {
    rope = {
      element,
      pull: element.querySelector<HTMLElement>('.rope__pull')!,
      stretch: 0,
      stretchSpeed: 0,
      angle: 0,
      angleSpeed: 0,
      held: false,
      frame: 0,
      lastTime: 0,
    };
    ropes.set(element, rope);
  }
  return rope;
};

const draw = (rope: Rope) => {
  rope.element.style.transform = `rotate(${rope.angle}rad)`;
  rope.pull.style.transform = `translateY(${rope.stretch}px)`;
};

const isAtRest = (rope: Rope) =>
  Math.abs(rope.angle) < AT_REST &&
  Math.abs(rope.angleSpeed) < AT_REST * 4 &&
  Math.abs(rope.stretch) < 0.2 &&
  Math.abs(rope.stretchSpeed) < 1;

const step = (rope: Rope, now: number) => {
  // Clamp the step so a stalled frame can't throw the rope.
  const dt = Math.min((now - rope.lastTime) / 1000, 1 / 30);
  rope.lastTime = now;

  rope.stretchSpeed += (-STRETCH.stiffness * rope.stretch - STRETCH.damping * rope.stretchSpeed) * dt;
  rope.stretch += rope.stretchSpeed * dt;
  rope.angleSpeed += (-SWING.stiffness * rope.angle - SWING.damping * rope.angleSpeed) * dt;
  rope.angle += rope.angleSpeed * dt;

  if (isAtRest(rope)) {
    rope.stretch = rope.stretchSpeed = rope.angle = rope.angleSpeed = 0;
    rope.frame = 0;
    draw(rope);
    return;
  }

  draw(rope);
  rope.frame = requestAnimationFrame((time) => step(rope, time));
};

const settle = (rope: Rope) => {
  if (reduceMotion.matches) {
    rope.stretch = rope.stretchSpeed = rope.angle = rope.angleSpeed = 0;
    draw(rope);
    return;
  }
  if (rope.frame) return;
  rope.lastTime = performance.now();
  rope.frame = requestAnimationFrame((time) => step(rope, time));
};

const hold = (rope: Rope) => {
  cancelAnimationFrame(rope.frame);
  rope.frame = 0;
  rope.held = true;
  rope.stretchSpeed = rope.angleSpeed = 0;
};

/** A quick pull: the cord stretches, and the swing goes a little to one side. */
const tug = (rope: Rope) => {
  rope.stretchSpeed += 420;
  rope.angleSpeed += (Math.random() < 0.5 ? -1 : 1) * 0.35;
  settle(rope);
};

// Clicks that end a drag are ignored here: the drag decides what happens by itself.
let ignoreClicksUntil = 0;

document.addEventListener(
  'click',
  (event) => {
    const button = (event.target as Element).closest('.rope .theme-toggle');
    if (button && performance.now() < ignoreClicksUntil) {
      event.stopPropagation();
      event.preventDefault();
    }
  },
  { capture: true },
);

document.addEventListener('click', (event) => {
  const element = (event.target as Element).closest<HTMLElement>('.rope');
  if (element && !ropeFor(element).held) tug(ropeFor(element));
});

/** While the theme reveal runs, the browser sends pointer events to the page, not the rope. */
const handleUnder = ({ clientX: x, clientY: y }: PointerEvent) =>
  [...document.querySelectorAll<HTMLButtonElement>('.rope .theme-toggle')].find((button) => {
    const box = button.getBoundingClientRect();
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  });

document.addEventListener('pointerdown', (event) => {
  const direct = (event.target as Element).closest<HTMLButtonElement>('.rope .theme-toggle');
  const button = direct ?? handleUnder(event);
  const element = button?.closest<HTMLElement>('.rope');
  if (!button || !element || event.button !== 0) return;

  const rope = ropeFor(element);
  const startX = event.clientX;
  const startY = event.clientY;
  const startStretch = rope.stretch;
  const length = element.offsetHeight;
  let dragged = false;

  const done = new AbortController();
  const { signal } = done;
  button.setPointerCapture(event.pointerId);

  const move = (moveEvent: PointerEvent) => {
    const x = moveEvent.clientX - startX;
    const y = moveEvent.clientY - startY;

    if (!dragged) {
      if (Math.hypot(x, y) < MOVED) return;
      dragged = true;
      hold(rope);
    }

    // The further it's pulled, the harder it gets, and it can't be pushed far upwards.
    const pulled = Math.max(-12, startStretch + y);
    rope.stretch = pulled > 0 ? MAX_STRETCH * (1 - Math.exp(-pulled / MAX_STRETCH)) : pulled;
    const angle = Math.atan2(x, length + rope.stretch);
    rope.angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, -angle));
    draw(rope);
  };

  const release = () => {
    done.abort();
    if (!dragged) {
      if (!direct) tug(rope); // no click event arrives during a reveal
      return;
    }

    ignoreClicksUntil = performance.now() + 350;
    rope.held = false;
    if (rope.stretch >= THRESHOLD) switchTheme(button);
    settle(rope);
  };

  button.addEventListener('pointermove', move, { signal });
  button.addEventListener('pointerup', release, { signal });
  button.addEventListener('pointercancel', release, { signal });
});

// Stop the browser treating a pull as a text selection or an element drag.
document.addEventListener('dragstart', (event) => {
  if ((event.target as Element).closest?.('.rope')) event.preventDefault();
});

// On a new visit the rope drops in after the sidebar unfolds, then sways once.
document.addEventListener(
  'astro:page-load',
  () => {
    const element = document.querySelector<HTMLElement>('.rope--desktop');
    if (!element || !document.documentElement.classList.contains('intro')) return;

    setTimeout(() => {
      const rope = ropeFor(element);
      rope.stretch = -rope.pull.offsetHeight;
      rope.angleSpeed = 0.5;
      draw(rope);
      element.classList.add('rope--arrived');
      settle(rope);
    }, 1500);
  },
  { once: true },
);
