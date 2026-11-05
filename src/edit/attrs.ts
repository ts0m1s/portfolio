// Marks text the in-page editor can change. Only while running `npm run dev`:
// the published site gets none of these attributes.

const DEV = import.meta.env.DEV;

/** Text that lives at `path` in src/content/site.json, e.g. 'site.tagline'. */
export const edit = (path: string, type?: 'list') =>
  DEV ? { 'data-edit': path, ...(type ? { 'data-edit-type': type } : {}) } : {};

/** A list in site.json that rows can be added to. `template` is what a new row starts as. */
export const editList = (path: string, template: Record<string, unknown>) =>
  DEV ? { 'data-edit-list': path, 'data-edit-new': JSON.stringify(template) } : {};

/** One row of an editable list, so it can be removed. */
export const editItem = (index: number) => (DEV ? { 'data-edit-item': String(index) } : {});
