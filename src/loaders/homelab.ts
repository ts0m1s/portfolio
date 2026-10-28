import { existsSync } from 'node:fs';
import { glob, type Loader } from 'astro/loaders';

/** A Markdown guide that lives in a GitHub repo and is pulled into the site at build time. */
export interface GitHubDoc {
  /** URL slug: /homelab/<id>/ */
  id: string;
  /** Short name used in buttons, e.g. "Read the Pi-hole guide". */
  label: string;
  title: string;
  description: string;
  /** owner/name */
  repo: string;
  /** Path of the Markdown file inside the repo. */
  file: string;
  branch?: string;
  /** Lower comes first in lists. */
  order?: number;
}

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
const FIRST_H1 = /^\s*# .*\r?\n/;
// [text](relative/path) or ![alt](relative/path); skips absolute URLs, anchors and mailto.
const RELATIVE_LINK = /(!?)\[([^\]]*)\]\((?!https?:|#|mailto:|\/)([^)\s]+)\)/g;
const IMAGE = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * Make a repo's Markdown work on this site: drop Jekyll front matter and the repo's own title,
 * point relative links and images at GitHub, and load images straight from GitHub as plain <img>.
 */
function adapt(markdown: string, doc: GitHubDoc, branch: string) {
  const dir = doc.file.includes('/') ? doc.file.slice(0, doc.file.lastIndexOf('/') + 1) : '';
  const raw = `https://raw.githubusercontent.com/${doc.repo}/${branch}/${dir}`;
  const blob = `https://github.com/${doc.repo}/blob/${branch}/${dir}`;
  return markdown
    .replace(FRONTMATTER, '')
    .replace(FIRST_H1, '')
    .replace(RELATIVE_LINK, (_, bang, text, path) => `${bang}[${text}](${bang ? raw : blob}${path})`)
    .replace(IMAGE, (_, alt, src) => `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />`);
}

/** Date of the last commit that touched the file, or undefined if GitHub can't be reached. */
async function lastCommit(doc: GitHubDoc, branch: string) {
  try {
    const api = `https://api.github.com/repos/${doc.repo}/commits?sha=${branch}&path=${encodeURIComponent(doc.file)}&per_page=1`;
    const res = await fetch(api, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return undefined;
    const [commit] = await res.json();
    return commit?.commit?.committer?.date as string | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Homelab pages come from two places:
 * - your own Markdown files in `base` (e.g. src/content/homelab/my-setup.md)
 * - guides in GitHub repos, listed in HOMELAB_GUIDES in src/config.ts
 */
export function homelabLoader({ base, github }: { base: string; github: GitHubDoc[] }): Loader {
  const local = glob({ base, pattern: '**/*.md' });

  return {
    name: 'homelab-loader',
    load: async (context) => {
      if (existsSync(base)) await local.load(context);

      for (const doc of github) {
        const branch = doc.branch ?? 'main';
        const source = `https://raw.githubusercontent.com/${doc.repo}/${branch}/${doc.file}`;
        try {
          const res = await fetch(source);
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          const body = adapt(await res.text(), doc, branch);
          const updated = await lastCommit(doc, branch);

          const data = await context.parseData({
            id: doc.id,
            data: {
              title: doc.title,
              label: doc.label,
              description: doc.description,
              updated,
              order: doc.order,
              source: { repo: doc.repo, url: `https://github.com/${doc.repo}` },
            },
          });

          context.store.set({
            id: doc.id,
            data,
            body,
            digest: context.generateDigest(body + (updated ?? '')),
            rendered: await context.renderMarkdown(body),
          });
        } catch (error) {
          context.logger.warn(`Couldn't load ${doc.repo}/${doc.file} from GitHub: ${error}`);
        }
      }
    },
  };
}
