// The sidebar stays on screen between pages, so keep it in step here:
// mark the new section and glide the cursor to the end of its name.

const place = () => {
  const tree = document.querySelector<HTMLElement>('.sidebar .tree-wrap');
  const marker = tree?.querySelector<HTMLElement>('.tree__marker');
  if (!tree || !marker) return;

  const name = tree.querySelector('a[aria-current] .tree__name');
  marker.classList.toggle('tree__marker--on', Boolean(name));
  if (!name) return;

  // Sits at the end of the row: after the post count if there is one, else after the name.
  const box = name.getBoundingClientRect();
  const end = name.parentElement?.lastElementChild?.getBoundingClientRect() ?? box;
  const origin = tree.getBoundingClientRect();
  const x = end.right - origin.left + 6;
  const y = box.top - origin.top + (box.height - marker.offsetHeight) / 2;
  marker.style.transform = `translate(${x}px, ${y}px)`;
};

document.addEventListener('astro:before-swap', (event) => {
  const next = event.newDocument;
  const href = next.querySelector('.sidebar .tree a[aria-current]')?.getAttribute('href');
  document.querySelectorAll('.sidebar .tree a').forEach((link) => {
    if (link.getAttribute('href') === href) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const name = document.querySelector('.sidebar .site-name');
  if (next.querySelector('.sidebar .site-name[aria-current]')) name?.setAttribute('aria-current', 'page');
  else name?.removeAttribute('aria-current');

  place();
});

document.addEventListener('astro:page-load', place);
addEventListener('resize', place);
document.fonts?.ready.then(place);
