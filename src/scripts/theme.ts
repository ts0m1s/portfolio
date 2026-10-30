type Theme = 'light' | 'dark';

const root = document.documentElement;
const themeColor: Record<Theme, string> = { light: '#faf6f1', dark: '#1d1814' };

const current = (): Theme => (root.dataset.theme === 'dark' ? 'dark' : 'light');

const syncMeta = (doc: Document, theme: Theme) =>
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor[theme]);

const apply = (theme: Theme) => {
  root.dataset.theme = theme;
  syncMeta(document, theme);
  const label = theme === 'dark' ? 'Turn the lights on' : 'Turn the lights off';
  document.querySelectorAll('.theme-toggle').forEach((button) => button.setAttribute('aria-label', label));
};

/** Switch theme with the circular reveal spreading out from `origin`. */
export const switchTheme = (origin: Element) => {
  // Starting a second reveal would cut the running one off, so wait for it to finish.
  if (root.classList.contains('theme-switching')) return;

  const next: Theme = current() === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('theme', next);
  } catch {}

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduceMotion) {
    apply(next);
    return;
  }

  const box = origin.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  root.classList.add('theme-switching');
  const transition = document.startViewTransition(() => apply(next));
  transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
  transition.finished.finally(() => root.classList.remove('theme-switching'));
};

// Pages swap, so listen on the document. Keyboard presses arrive here as clicks too.
document.addEventListener('click', (event) => {
  const button = (event.target as Element).closest('.theme-toggle');
  if (button) switchTheme(button);
});

// Page swaps replace <html>'s attributes, so carry the theme over to the incoming page.
document.addEventListener('astro:before-swap', (event) => {
  event.newDocument.documentElement.dataset.theme = current();
  syncMeta(event.newDocument, current());
});

document.addEventListener('astro:page-load', () => apply(current()));

// Follow the OS setting until the visitor picks a theme themselves.
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  let stored = null;
  try {
    stored = localStorage.getItem('theme');
  } catch {}
  if (!stored) apply(event.matches ? 'dark' : 'light');
});
