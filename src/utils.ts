import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type HomelabDoc = CollectionEntry<'homelab'>;

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefix a site path with the configured `base`, e.g. url('writing/'). */
export const url = (path = '') => `${base}/${path.replace(/^\//, '')}`;

/** Published posts, newest first. Drafts only show up in `npm run dev`. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Homelab guides and notes, in the order set by `order`, then by title. */
export async function getHomelabDocs(): Promise<HomelabDoc[]> {
  const docs = await getCollection('homelab', ({ data }) => import.meta.env.DEV || !data.draft);
  return docs.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

/** Turn a homelab `link` ('pihole', 'pihole#section' or a full URL) into an href. */
export function homelabHref(link?: string) {
  if (!link) return undefined;
  if (/^https?:/.test(link)) return link;
  const [id, hash] = link.split('#');
  return url(`homelab/${id}/`) + (hash ? `#${hash}` : '');
}

/** 2026-10-01 */
export const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export const readingTime = (body = '') => {
  const words = body.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
};
