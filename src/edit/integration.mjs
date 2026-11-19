// The in-browser editors, for `npm run dev` only:
// - the text editor (press E on any page) reads and saves src/content/site.json;
// - the writing editor (/write) loads, previews and saves posts in src/content/posts/.
// None of this exists in `npm run build`, so the published site can't be edited by anyone.

import { existsSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Reads and writes post front matter (a dev dependency in package.json).
import YAML from 'yaml';

const MAX_BYTES = 1024 * 1024;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const kind = (value) => (Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value);

/** Saves may change text and add or remove rows, but not rename keys or change what kind of value something is. */
function shapeProblem(before, after, path = 'the file') {
  if (kind(before) !== kind(after)) return `${path} changed from ${kind(before)} to ${kind(after)}`;
  if (kind(before) === 'object') {
    const keys = Object.keys(before).sort().join();
    if (Object.keys(after).sort().join() !== keys) return `the keys in ${path} changed`;
    for (const key of Object.keys(before)) {
      const problem = shapeProblem(before[key], after[key], key);
      if (problem) return problem;
    }
  }
  if (kind(before) === 'array' && before.length) {
    const rowKind = kind(before[0]);
    const article = rowKind === 'object' || rowKind === 'array' ? 'an' : 'a';
    if (after.some((row) => kind(row) !== rowKind)) return `a row in ${path} is not ${article} ${rowKind}`;
  }
  return null;
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new Error('too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const isoDate = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? ''));

/** Splits a post file into its front matter (as an object) and its Markdown body. */
function readPost(text) {
  const match = FRONT_MATTER.exec(text);
  const data = match ? (YAML.parse(match[1]) ?? {}) : {};
  const body = match ? text.slice(match[0].length) : text;
  return { data, body: body.replace(/^\n+/, '') };
}

/** Builds a post file. Known fields first, in a fixed order; anything else already in the file is kept. */
function writePost({ title, description, date, tags, draft, body }, extra = {}) {
  const data = { title, description, date, ...extra, tags };
  if (draft) data.draft = true;
  const doc = new YAML.Document(data);
  // Short lists on one line, the way hand-written posts do it: tags: [security]
  for (const pair of doc.contents.items) {
    if (YAML.isSeq(pair.value) && pair.value.items.every(YAML.isScalar)) pair.value.flow = true;
  }
  const front = doc.toString({ lineWidth: 0, flowCollectionPadding: false });
  return `---\n${front}---\n\n${body.replace(/^\n+/, '').replace(/\s*$/, '')}\n`;
}

/** Write to a temporary file first, so a failed save can never leave the real file half written. */
async function writeSafely(file, content) {
  const temporary = `${file}.saving`;
  await writeFile(temporary, content);
  await rename(temporary, file);
}

export default function siteEditor() {
  let siteFile;
  let postsDir;
  const routes = {};
  let config;
  let renderer;

  // Answer with or without the site's base in front (/__edit and /portfolio/__edit), so the
  // editors reach this whichever way the address is written.
  const routeFor = (path) => {
    for (const [name, paths] of Object.entries(routes)) if (paths.has(path)) return name;
    return null;
  };

  return {
    name: 'site-editor',
    hooks: {
      'astro:config:setup': ({ command, config: setup, injectScript, injectRoute }) => {
        siteFile = fileURLToPath(new URL('src/content/site.json', setup.root));
        postsDir = fileURLToPath(new URL('src/content/posts/', setup.root));
        const base = setup.base.replace(/\/?$/, '/');
        for (const name of ['edit', 'posts', 'preview']) routes[name] = new Set([`/__${name}`, `${base}__${name}`]);

        if (command === 'dev') {
          // The writing page has its own editor, so the text editor stays off there.
          injectScript('page', `if (!document.body.hasAttribute('data-no-site-editor')) import('/src/edit/editor.ts');`);
          injectRoute({ pattern: '/write', entrypoint: './src/edit/write.astro' });
        }
      },

      'astro:config:done': ({ config: done }) => {
        config = done;
      },

      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? '/', 'http://localhost');
          const route = routeFor(url.pathname);
          if (!route) return next();

          const send = (status, body) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(body));
          };

          // Only the site's own pages may use these. Another website open in the same browser
          // can't read or change anything, even while the dev server is running.
          const site = req.headers['sec-fetch-site'];
          if (site && site !== 'same-origin') return send(403, { error: 'Not allowed from another site.' });
          if (req.headers.origin) {
            let host;
            try {
              host = new URL(req.headers.origin).host;
            } catch {}
            if (host !== req.headers.host) return send(403, { error: 'Not allowed from another site.' });
          }
          if (req.method !== 'GET' && req.method !== 'POST') return send(405, { error: 'Use GET or POST.' });
          // A JSON body can't be sent cross-site without the browser asking first, which this never allows.
          if (req.method === 'POST' && !String(req.headers['content-type']).startsWith('application/json')) {
            return send(415, { error: 'Send JSON.' });
          }

          try {
            // ---- site text ----
            if (route === 'edit') {
              if (req.method === 'GET') return send(200, JSON.parse(await readFile(siteFile, 'utf8')));
              const next = JSON.parse(await readBody(req));
              const current = JSON.parse(await readFile(siteFile, 'utf8'));
              const problem = shapeProblem(current, next);
              if (problem) return send(400, { error: `Not saved: ${problem}.` });
              await writeSafely(siteFile, `${JSON.stringify(next, null, 2)}\n`);
              return send(200, { saved: true });
            }

            // ---- preview: the same Markdown renderer the site's posts use ----
            if (route === 'preview') {
              if (req.method !== 'POST') return send(405, { error: 'Use POST.' });
              const { body } = JSON.parse(await readBody(req));
              renderer ??= await config.markdown.processor.createRenderer({
                image: config.image,
                syntaxHighlight: config.markdown.syntaxHighlight,
                shikiConfig: config.markdown.shikiConfig,
                gfm: config.markdown.gfm,
                smartypants: config.markdown.smartypants,
              });
              const { code } = await renderer.render(String(body ?? ''), { frontmatter: {} });
              return send(200, { html: code });
            }

            // ---- posts ----
            const { TAGS } = await server.ssrLoadModule('/src/config.ts');
            const tagIds = Object.keys(TAGS);

            if (req.method === 'GET') {
              const slug = url.searchParams.get('slug') ?? '';
              if (!SLUG.test(slug)) return send(400, { error: 'That is not a valid post name.' });
              const file = `${postsDir}${slug}.md`;
              if (!existsSync(file)) return send(404, { error: `There is no post called ${slug}.` });
              const { data, body } = readPost(await readFile(file, 'utf8'));
              return send(200, {
                slug,
                title: String(data.title ?? ''),
                description: String(data.description ?? ''),
                date: isoDate(data.date),
                tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
                draft: data.draft === true,
                body,
              });
            }

            const post = JSON.parse(await readBody(req));
            const slug = String(post.slug ?? '');
            const problems = [];
            if (!SLUG.test(slug) || slug.length > 80) {
              problems.push('the file name can only use lowercase letters, numbers and single dashes');
            }
            if (!String(post.title ?? '').trim()) problems.push('it needs a title');
            if (!String(post.description ?? '').trim()) problems.push('it needs a short description');
            if (!DATE.test(String(post.date ?? '')) || Number.isNaN(Date.parse(post.date))) {
              problems.push('the date is not valid');
            }
            const tags = Array.isArray(post.tags) ? post.tags.map(String) : [];
            const unknown = tags.filter((tag) => !tagIds.includes(tag));
            if (unknown.length) problems.push(`unknown topic: ${unknown.join(', ')}`);
            if (problems.length) return send(400, { error: `Not saved: ${problems.join('; ')}.` });

            const file = `${postsDir}${slug}.md`;
            const exists = existsSync(file);
            if (post.isNew && exists) {
              return send(409, { error: `Not saved: a post called ${slug} already exists. Choose another file name.` });
            }
            if (!post.isNew && !exists) return send(404, { error: `Not saved: ${slug} no longer exists.` });

            // Keep any other front matter the file already has (like `updated`).
            let extra = {};
            if (exists) {
              const { data } = readPost(await readFile(file, 'utf8'));
              const { title: _t, description: _d, date: _a, tags: _g, draft: _r, ...rest } = data;
              // Dates come back from YAML as Date objects; keep them as plain YYYY-MM-DD.
              extra = Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, value instanceof Date ? isoDate(value) : value]));
            }
            await writeSafely(
              file,
              writePost(
                {
                  title: String(post.title).trim(),
                  description: String(post.description).trim(),
                  date: post.date,
                  tags,
                  draft: post.draft === true,
                  body: String(post.body ?? ''),
                },
                extra,
              ),
            );
            return send(200, { saved: true, slug, draft: post.draft === true });
          } catch (error) {
            return send(400, { error: `Not saved: ${error.message}.` });
          }
        });
      },
    },
  };
}
