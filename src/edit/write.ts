// The writing editor (dev only). Loads a post (or starts a new one), shows a live preview
// rendered by the site's own Markdown renderer, and saves the .md file through the dev server.

const BASE = document.body.dataset.base ?? '/';
const POSTS = `${BASE}__posts`;
const PREVIEW = `${BASE}__preview`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;
const title = $<HTMLInputElement>('.w-title');
const description = $<HTMLInputElement>('.w-description');
const slug = $<HTMLInputElement>('.w-slug');
const date = $<HTMLInputElement>('.w-date');
const body = $<HTMLTextAreaElement>('.w-body');
const tags = () => [...document.querySelectorAll<HTMLInputElement>('input[name="tags"]')];
const status = $<HTMLElement>('.w-status');
const mode = $<HTMLElement>('.w-mode');
const view = $<HTMLAnchorElement>('.w-view');
const saveDraft = $<HTMLButtonElement>('.w-save-draft');
const publish = $<HTMLButtonElement>('.w-publish');

let isNew = true;
let isDraft = true;
let dirty = false;
let slugEdited = false;
let saving = false;

// ---- helpers ----

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatDate = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : '';
};

/** "What is a vector embedding?" -> "what-is-a-vector-embedding" */
const toSlug = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');

const say = (message: string, isError = false) => {
  status.textContent = message;
  status.classList.toggle('w-status--error', isError);
};

/** Reads a reply from the dev server, saying plainly what went wrong if it isn't one. */
const reply = async (response: Response) => {
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`The dev server answered with something unexpected (status ${response.status}). Restart npm run dev and try again.`);
  }
  if (!response.ok) throw new Error(data.error ?? `Status ${response.status}.`);
  return data;
};

const setMode = () => {
  mode.textContent = isNew ? 'New post' : `Editing ${slug.value}${isDraft ? ' (draft)' : ''}`;
  slug.readOnly = !isNew;
  slug.title = isNew ? '' : "A post's file name can't change once it's saved, so links to it keep working.";
  view.hidden = isNew;
  view.href = `${BASE}posts/${slug.value}/`;
  saveDraft.textContent = isDraft ? 'Save draft' : 'Unpublish';
  publish.textContent = isDraft ? 'Publish' : 'Save';
};

// ---- preview ----

const pTitle = $<HTMLElement>('.w-p-title');
const pMeta = $<HTMLElement>('.w-p-meta');
const pBody = $<HTMLElement>('.w-p-body');
let previewTimer: number | undefined;
let previewRun = 0;

const renderMeta = () => {
  pTitle.textContent = title.value.trim();
  const topics = tags()
    .filter((tag) => tag.checked)
    .map((tag) => tag.parentElement?.textContent?.trim())
    .join(' and ');
  const words = body.value.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  pMeta.textContent = `Posted ${formatDate(date.value)}${topics ? ` in ${topics}` : ''}. ${minutes} min read.`;
};

const renderBody = async () => {
  const run = ++previewRun;
  try {
    const { html } = await reply(
      await fetch(PREVIEW, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.value }),
      }),
    );
    if (run === previewRun) pBody.innerHTML = html;
  } catch (error) {
    if (run === previewRun) say(`Preview unavailable: ${(error as Error).message}`, true);
  }
};

const changed = () => {
  dirty = true;
  if (!saving) say('Unsaved changes');
  renderMeta();
  clearTimeout(previewTimer);
  previewTimer = window.setTimeout(renderBody, 300);
};

// ---- saving ----

const save = async (asDraft: boolean) => {
  if (saving) return;
  if (isNew) slug.value = slug.value ? slug.value.replace(/^-+|-+$/g, '') : toSlug(title.value);
  const missing = [
    !title.value.trim() && 'a title',
    !description.value.trim() && 'a description',
    !slug.value && 'a file name',
    !date.value && 'a date',
  ].filter(Boolean);
  if (missing.length) {
    say(`Add ${missing.join(', ')} before saving.`, true);
    return;
  }

  saving = true;
  say('Saving…');
  try {
    const result = await reply(
      await fetch(POSTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isNew,
          slug: slug.value,
          title: title.value,
          description: description.value,
          date: date.value,
          tags: tags()
            .filter((tag) => tag.checked)
            .map((tag) => tag.value),
          draft: asDraft,
          body: body.value,
        }),
      }),
    );
    isNew = false;
    isDraft = result.draft;
    dirty = false;
    history.replaceState(null, '', `?post=${encodeURIComponent(result.slug)}`);
    setMode();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    say(isDraft ? `Saved as a draft at ${time}. Only you can see it, in npm run dev.` : `Published at ${time}. It goes live when you push.`);
  } catch (error) {
    say((error as Error).message, true);
  } finally {
    saving = false;
  }
};

saveDraft.addEventListener('click', () => save(true));
publish.addEventListener('click', () => save(false));

// ---- typing ----

title.addEventListener('input', () => {
  if (isNew && !slugEdited) slug.value = toSlug(title.value);
  changed();
});
slug.addEventListener('input', () => {
  slugEdited = true;
  slug.value = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-');
  changed();
});
[description, date, body].forEach((field) => field.addEventListener('input', changed));
tags().forEach((tag) => tag.addEventListener('change', changed));

// Tab indents inside the post instead of leaving the box.
body.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab' || event.shiftKey) return;
  event.preventDefault();
  body.setRangeText('  ', body.selectionStart, body.selectionEnd, 'end');
  changed();
});

// Cmd+S / Ctrl+S saves, keeping the post as it is (draft stays draft, published stays published).
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 's') {
    event.preventDefault();
    save(isDraft);
  }
});

addEventListener('beforeunload', (event) => {
  if (dirty) event.preventDefault();
});

// ---- start: load the post, or begin a new one ----

const start = async () => {
  const name = new URLSearchParams(location.search).get('post');
  if (name) {
    try {
      const post = await reply(await fetch(`${POSTS}?slug=${encodeURIComponent(name)}`, { cache: 'no-store' }));
      isNew = false;
      isDraft = post.draft;
      title.value = post.title;
      description.value = post.description;
      slug.value = post.slug;
      date.value = post.date;
      body.value = post.body;
      tags().forEach((tag) => (tag.checked = post.tags.includes(tag.value)));
      say('');
    } catch (error) {
      say((error as Error).message, true);
    }
  } else {
    date.value = today();
    const first = tags()[0];
    if (first) first.checked = true;
    title.focus();
  }
  setMode();
  renderMeta();
  renderBody();
};

start();
