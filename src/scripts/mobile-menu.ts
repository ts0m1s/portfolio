const setOpen = (open: boolean) => {
  const menu = document.getElementById('mobile-menu');
  const openButton = document.querySelector<HTMLButtonElement>('.mobile-header .menu-button');
  const closeButton = menu?.querySelector<HTMLButtonElement>('[data-close]');
  if (!menu || !openButton || !closeButton) return;

  menu.hidden = !open;
  openButton.setAttribute('aria-expanded', String(open));
  document.documentElement.classList.toggle('menu-open', open);
  (open ? closeButton : openButton).focus();
};

const isOpen = () => document.getElementById('mobile-menu')?.hidden === false;

document.addEventListener('click', (event) => {
  const target = event.target as Element;
  if (target.closest('.mobile-header .menu-button')) setOpen(true);
  else if (target.closest('#mobile-menu [data-close]')) setOpen(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isOpen()) setOpen(false);
});

// Close if the window is widened past the sidebar breakpoint while open.
matchMedia('(min-width: 900px)').addEventListener('change', (event) => {
  if (event.matches && isOpen()) setOpen(false);
});
