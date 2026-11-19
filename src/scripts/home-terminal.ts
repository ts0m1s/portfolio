// The home page terminal: types the command, then prints the "now" lines one by one.
// It plays when the home page is loaded fresh (Base.astro adds the `term` class then). Moving to
// the home page from another page shows it as is, and so does reduced motion.

const KEY = 'term';
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

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

document.addEventListener('astro:page-load', async () => {
  const terminal = document.querySelector<HTMLElement>('.term');
  if (!terminal || !root.classList.contains(KEY) || reduceMotion.matches || editing()) {
    root.classList.remove(KEY);
    return;
  }

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
