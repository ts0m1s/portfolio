// A copy button on every code block in posts and guides.

const addButton = (pre: HTMLPreElement) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'code-block';
  pre.replaceWith(wrapper);
  wrapper.append(pre);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'code-copy';
  button.textContent = 'Copy';
  wrapper.append(button);

  let timer: number | undefined;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.querySelector('code')?.innerText ?? pre.innerText);
      button.textContent = 'Copied';
      button.classList.add('code-copy--done');
    } catch {
      button.textContent = 'Copy failed';
    }
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      button.textContent = 'Copy';
      button.classList.remove('code-copy--done');
    }, 1600);
  });
};

document.addEventListener('astro:page-load', () => {
  document.querySelectorAll<HTMLPreElement>('.prose pre').forEach(addButton);
});
