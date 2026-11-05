// The home page terminal: types the command, then prints the "now" lines one by one.
// Once per visit; after that, and for anyone who prefers reduced motion, it's simply shown.

const KEY = 'term';
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

const played = () => {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
};

// The in-browser editor (npm run dev) needs the text still, not typing.
const editing = () => {
  try {
    return sessionStorage.getItem('site-editor') === 'on';
  } catch {
    return false;
  }
};

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

let run = 0;

// Arriving on the home page from another page: hide the lines before the new page is shown.
document.addEventListener('astro:before-swap', (event) => {
  if (!played() && !reduceMotion.matches && !editing()) event.newDocument.documentElement.classList.add(KEY);
});

document.addEventListener('astro:page-load', async () => {
  const terminal = document.querySelector<HTMLElement>('.term');
  if (!terminal || played() || reduceMotion.matches || editing()) {
    root.classList.remove(KEY);
    return;
  }

  try {
    sessionStorage.setItem(KEY, '1');
  } catch {}
  const id = ++run;

  // On a fresh visit, start as the sidebar finishes unfolding, so it all plays as one sequence.
  await wait(root.classList.contains('intro') ? 1500 : 250);

  for (const step of terminal.querySelectorAll<HTMLElement>('[data-step]')) {
    if (id !== run) return;

    if (step.dataset.step === 'cmd') {
      const typed = step.querySelector<HTMLElement>('.term__typed');
      const text = typed?.textContent ?? '';
      if (typed) typed.textContent = '';
      step.classList.add('is-shown');
      typed?.classList.add('is-typing');
      await wait(180);
      for (const char of text) {
        if (typed) typed.textContent += char;
        await wait(45 + Math.random() * 55);
      }
      await wait(200);
      typed?.classList.remove('is-typing');
    } else {
      // Output appears at once, like a real terminal.
      step.classList.add('is-shown');
      await wait(step.dataset.step === 'row' ? 90 : 160);
    }
  }

  root.classList.remove(KEY);
});
