// Click an image in a post or guide to see it full size.

const getDialog = () => {
  let dialog = document.querySelector<HTMLDialogElement>('dialog.zoom');
  if (dialog) return dialog;

  dialog = document.createElement('dialog');
  dialog.className = 'zoom';
  dialog.setAttribute('aria-label', 'Enlarged image');
  dialog.append(document.createElement('img'));
  dialog.addEventListener('click', () => dialog?.close());
  document.body.append(dialog);
  return dialog;
};

document.addEventListener('click', (event) => {
  const image = (event.target as Element).closest<HTMLImageElement>('.prose img');
  if (!image || image.closest('a')) return;

  const dialog = getDialog();
  const large = dialog.querySelector('img');
  if (!large) return;
  large.src = image.currentSrc || image.src;
  large.alt = image.alt;
  dialog.showModal();
});
