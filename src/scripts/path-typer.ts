// Changing page works like `cd`: the part of the path that differs backspaces away,
// then the new part types in. Whatever both pages share stays still.

const STEP = 16;
const MAX_TIME = 420;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

let previous: string[] | undefined;
let run = 0;

const read = () =>
  [...document.querySelectorAll<HTMLElement>('.path .path__segment')].map((el) => el.dataset.segment ?? '');

const pathText = (segments: string[]) => segments.map((segment) => `/${segment}`).join('');

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

const animate = async (from: string[], to: string[]) => {
  const id = ++run;
  const path = document.querySelector<HTMLElement>('.path');
  if (!path) return;

  let shared = 0;
  while (shared < from.length && shared < to.length && from[shared] === to[shared]) shared++;

  const elements = [...path.querySelectorAll<HTMLElement>('.path__segment')];
  const incoming = elements.slice(shared);
  const removed = pathText(from.slice(shared));
  const added = pathText(to.slice(shared));
  const steps = removed.length + added.length;
  if (!steps) return;

  // Hold the real links back while a plain copy of the text is typed in their place.
  incoming.forEach((el) => (el.hidden = true));
  const typing = document.createElement('span');
  typing.className = 'path__typing';
  typing.setAttribute('aria-hidden', 'true');
  path.append(typing);

  const delay = Math.min(STEP, MAX_TIME / steps);

  for (let i = removed.length; i >= 0; i--) {
    if (id !== run) return typing.remove();
    typing.textContent = removed.slice(0, i);
    await wait(delay);
  }
  for (let i = 1; i <= added.length; i++) {
    if (id !== run) return typing.remove();
    typing.textContent = added.slice(0, i);
    await wait(delay);
  }

  typing.remove();
  incoming.forEach((el) => (el.hidden = false));
};

document.addEventListener('astro:page-load', () => {
  const current = read();
  const firstVisit = document.documentElement.classList.contains('intro');

  // On a fresh visit the whole path types in with the sidebar; a reload just shows it.
  if (reduceMotion.matches || (!previous && !firstVisit)) run++;
  else animate(previous ?? [], current);

  previous = current;
});
