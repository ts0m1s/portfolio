// The in-page editor (dev only, added by src/edit/integration.mjs).
// Press E or click Edit, click any outlined text and type, then Save. Changes are written to
// src/content/site.json, and the page reloads with them.

import styles from './editor.css?inline';

type Json = Record<string, any>;

const ENDPOINT = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}__edit`;
const STORAGE = 'site-editor';
const root = document.documentElement;
const supportsPlainText = (() => {
  const probe = document.createElement('div');
  probe.contentEditable = 'plaintext-only';
  return probe.contentEditable === 'plaintext-only';
})();

// Astro swaps the <head> on every page change and drops styles the new page didn't arrive with,
// which would leave the editor unstyled after the first click. So the editor keeps its own
// <style> and puts it back after each swap.
const ensureStyles = () => {
  if (document.getElementById('se-styles')) return;
  const style = document.createElement('style');
  style.id = 'se-styles';
  style.textContent = styles;
  document.head.append(style);
};
ensureStyles();

const changes = new Map<string, unknown>();
let editing = sessionStorage.getItem(STORAGE) === 'on';
let busy = false;

// ---- reading and writing paths like "about.experience.0.what" ----

const keysOf = (path: string) => path.split('.').map((key) => (/^\d+$/.test(key) ? Number(key) : key));

const getAt = (data: Json, path: string) => keysOf(path).reduce<any>((value, key) => value?.[key], data);

const setAt = (data: Json, path: string, value: unknown) => {
  const keys = keysOf(path);
  const last = keys.pop()!;
  const parent = keys.reduce<any>((value, key) => value[key], data);
  parent[last] = value;
};

const valueOf = (element: HTMLElement) => {
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  return element.dataset.editType === 'list'
    ? text.split(',').map((item) => item.trim()).filter(Boolean)
    : text;
};

// ---- talking to the dev server ----

/** Reads the save function's reply, and says plainly what happened if it isn't the reply we expect. */
const reply = async (response: Response) => {
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    const page = text.trimStart().startsWith('<');
    throw new Error(
      page
        ? `The dev server answered with a web page (status ${response.status}) instead of saving. Stop npm run dev and start it again, then retry.`
        : `The dev server sent an unexpected reply (status ${response.status}): ${text.slice(0, 120)}`,
    );
  }
  if (!response.ok) throw new Error(body.error ?? `Status ${response.status}.`);
  return body;
};

const load = async (): Promise<Json> => reply(await fetch(ENDPOINT, { cache: 'no-store' }));

const save = async (change?: (data: Json) => void) => {
  if (busy) return;
  busy = true;
  render('Saving…');
  try {
    // Start from the file as it is now, so edits made by hand meanwhile aren't lost.
    const data = await load();
    changes.forEach((value, path) => setAt(data, path, value));
    change?.(data);
    await reply(
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    );
    changes.clear();
    render('Saved');
    location.reload();
  } catch (error) {
    busy = false;
    render(`${(error as Error).message} Your edits are still here.`, true);
  }
};

// ---- the controls: Edit button and the save bar ----

let toggle: HTMLButtonElement;
let bar: HTMLDivElement;

const buildControls = () => {
  if (document.querySelector('.se-toggle')) return;

  toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'se-toggle';
  toggle.addEventListener('click', () => setEditing(!editing));

  bar = document.createElement('div');
  bar.className = 'se-bar';
  bar.setAttribute('role', 'status');
  bar.innerHTML = `
    <span class="se-bar__text"></span>
    <button type="button" class="se-bar__discard">Discard</button>
    <button type="button" class="se-bar__save">Save</button>`;
  bar.querySelector('.se-bar__discard')!.addEventListener('click', () => {
    changes.clear();
    location.reload();
  });
  bar.querySelector('.se-bar__save')!.addEventListener('click', () => save());

  document.body.append(toggle, bar);
};

const render = (message?: string, isError = false) => {
  if (!toggle) return;
  toggle.textContent = editing ? 'Done editing' : 'Edit';
  toggle.setAttribute('aria-pressed', String(editing));
  toggle.title = editing ? 'Stop editing (E)' : 'Edit the text on this page (E)';

  const count = changes.size;
  const text = message ?? `${count} unsaved ${count === 1 ? 'change' : 'changes'}`;
  bar.querySelector('.se-bar__text')!.textContent = text;
  bar.classList.toggle('se-bar--error', isError);
  bar.classList.toggle('se-bar--shown', Boolean(message) || count > 0);
  bar.querySelectorAll('button').forEach((button) => (button.disabled = busy || (count === 0 && !isError)));
};

// ---- edit mode ----

const markPage = () => {
  document.querySelectorAll<HTMLElement>('[data-edit]').forEach((element) => {
    element.contentEditable = editing ? (supportsPlainText ? 'plaintext-only' : 'true') : 'false';
    element.spellcheck = editing;
    if (!editing) element.removeAttribute('contenteditable');
  });

  document.querySelectorAll('.se-add, .se-remove').forEach((control) => control.remove());
  if (!editing) return;

  document.querySelectorAll<HTMLElement>('[data-edit-list]').forEach((list) => {
    const path = list.dataset.editList!;

    list.querySelectorAll<HTMLElement>(':scope > [data-edit-item]').forEach((row) => {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'se-remove';
      remove.textContent = '×';
      remove.title = 'Remove this row';
      remove.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!confirm('Remove this row? This saves straight away.')) return;
        const index = Number(row.dataset.editItem);
        save((data) => getAt(data, path).splice(index, 1));
      });
      row.append(remove);
    });

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'se-add';
    add.textContent = '+ Add a row';
    add.addEventListener('click', () => {
      const template = JSON.parse(list.dataset.editNew ?? '{}');
      save((data) => getAt(data, path).push(template));
    });
    list.after(add);
  });
};

const setEditing = (on: boolean) => {
  if (!on && changes.size && !confirm('You have unsaved changes. Stop editing and throw them away?')) return;
  if (!on && changes.size) {
    changes.clear();
    location.reload();
    return;
  }
  editing = on;
  sessionStorage.setItem(STORAGE, on ? 'on' : 'off');
  root.classList.toggle('se-editing', on);
  markPage();
  render();
};

// Typing updates the change list; the same text shown twice (like your name) stays in sync.
document.addEventListener('input', (event) => {
  const element = (event.target as Element).closest?.<HTMLElement>('[data-edit]');
  if (!element || !editing) return;
  const path = element.dataset.edit!;
  changes.set(path, valueOf(element));
  document.querySelectorAll<HTMLElement>(`[data-edit="${CSS.escape(path)}"]`).forEach((other) => {
    if (other !== element) other.textContent = element.textContent;
  });
  render();
});

document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  const inText = target.closest?.('[data-edit]');

  // Text here is single paragraphs: Enter and Escape finish the edit instead of adding a line.
  if (inText && editing && (event.key === 'Enter' || event.key === 'Escape')) {
    event.preventDefault();
    target.blur();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 's' && editing) {
    event.preventDefault();
    if (changes.size) save();
    return;
  }
  const typing = inText || target.closest?.('input, textarea, select, [contenteditable="true"]');
  if (event.key.toLowerCase() === 'e' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
    setEditing(!editing);
  }
});

// Pasting keeps only the text, never formatting.
document.addEventListener('paste', (event) => {
  const element = (event.target as Element).closest?.('[data-edit]');
  if (!element || !editing || supportsPlainText) return;
  event.preventDefault();
  document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') ?? '');
});

// While editing, clicking text inside a link edits it instead of following the link.
document.addEventListener(
  'click',
  (event) => {
    if (!editing) return;
    const target = event.target as Element;
    if (target.closest('[data-edit]') && target.closest('a')) event.preventDefault();
  },
  { capture: true },
);

// Don't lose unsaved edits by leaving the page.
addEventListener('beforeunload', (event) => {
  if (changes.size && !busy) event.preventDefault();
});
document.addEventListener('astro:before-preparation', (event) => {
  if (changes.size && !confirm('You have unsaved changes. Leave this page and throw them away?')) {
    event.preventDefault();
  } else {
    changes.clear();
  }
});

// The new page replaces <head> and <body>: restore the editor's styles and controls right away,
// before the new page is shown, so nothing flashes unstyled.
document.addEventListener('astro:after-swap', () => {
  ensureStyles();
  buildControls();
  root.classList.toggle('se-editing', editing);
  render();
});

document.addEventListener('astro:page-load', () => {
  ensureStyles();
  buildControls();
  root.classList.toggle('se-editing', editing);
  markPage();
  render();
});
