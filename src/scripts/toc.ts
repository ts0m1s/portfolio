// Highlights the section being read in the contents list. Re-runs on every page.

const wide = matchMedia('(min-width: 1280px)');
let cleanup = new AbortController();

document.addEventListener('astro:page-load', () => {
  cleanup.abort();
  cleanup = new AbortController();
  const { signal } = cleanup;

  const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a')];
  const box = document.querySelector<HTMLDetailsElement>('.toc__box');
  if (!links.length || !box) return;

  // Collapsed by default when the contents sit above the article (narrow screens).
  const sync = () => (box.open = wide.matches);
  sync();
  wide.addEventListener('change', sync, { signal });

  const idOf = (link: HTMLAnchorElement) => decodeURIComponent(link.hash.slice(1));
  const sections = links
    .map((link) => document.getElementById(idOf(link)))
    .filter((el): el is HTMLElement => el !== null);

  const mark = (id?: string) => links.forEach((link) => link.toggleAttribute('aria-current', idOf(link) === id));

  // A clicked entry stays highlighted until the reader scrolls on their own,
  // even if the page can't scroll far enough to bring that heading to the top.
  let pinned: string | undefined;

  const setActive = () => {
    if (pinned) return;
    const line = innerHeight * 0.25;
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    let current = sections[0];
    for (const section of sections) {
      const top = section.getBoundingClientRect().top;
      // At the very bottom, any heading still on screen counts as reached.
      if (top <= line || (atBottom && top < innerHeight)) current = section;
    }
    mark(current?.id);
  };

  links.forEach((link) =>
    link.addEventListener(
      'click',
      () => {
        pinned = idOf(link);
        mark(pinned);
      },
      { signal },
    ),
  );

  const unpin = () => {
    pinned = undefined;
    setActive();
  };
  for (const type of ['wheel', 'touchmove', 'keydown']) addEventListener(type, unpin, { passive: true, signal });

  setActive();
  addEventListener('scroll', setActive, { passive: true, signal });
});
