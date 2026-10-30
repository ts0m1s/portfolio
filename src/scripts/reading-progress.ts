// A thin line across the top of posts and guides showing how far through you are.

let cleanup = new AbortController();

document.addEventListener('astro:page-load', () => {
  cleanup.abort();
  cleanup = new AbortController();

  const article = document.querySelector<HTMLElement>('.post .prose');
  if (!article) return;

  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);

  const update = () => {
    const box = article.getBoundingClientRect();
    const read = (innerHeight - box.top) / box.height;
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, read))})`;
  };

  update();
  addEventListener('scroll', update, { passive: true, signal: cleanup.signal });
  addEventListener('resize', update, { signal: cleanup.signal });
});
