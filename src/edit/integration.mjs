// The in-page editor, for `npm run dev` only.
// Adds the editor script to pages and a small endpoint that reads and saves src/content/site.json.
// Neither exists in `npm run build`, so the published site can't be edited by anyone.

import { readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 256 * 1024;

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

export default function siteEditor() {
  let file;
  let routes;

  return {
    name: 'site-editor',
    hooks: {
      'astro:config:setup': ({ command, config, injectScript }) => {
        file = fileURLToPath(new URL('src/content/site.json', config.root));
        // Answer with or without the site's base in front (/__edit and /portfolio/__edit), so the
        // editor reaches this whichever way the address is written. A wrong match here showed up as a 404.
        routes = new Set(['/__edit', `${config.base.replace(/\/?$/, '/')}__edit`]);
        if (command === 'dev') injectScript('page', `import '/src/edit/editor.ts';`);
      },

      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          if (!routes.has(new URL(req.url ?? '/', 'http://localhost').pathname)) return next();

          const send = (status, body) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(body));
          };

          // Only the site's own pages may use this. Another website open in the same browser
          // can't read or change your text, even while the dev server is running.
          const site = req.headers['sec-fetch-site'];
          if (site && site !== 'same-origin') return send(403, { error: 'Not allowed from another site.' });
          if (req.headers.origin) {
            let host;
            try {
              host = new URL(req.headers.origin).host;
            } catch {}
            if (host !== req.headers.host) return send(403, { error: 'Not allowed from another site.' });
          }

          try {
            if (req.method === 'GET') return send(200, JSON.parse(await readFile(file, 'utf8')));
            if (req.method !== 'POST') return send(405, { error: 'Use GET or POST.' });

            // A JSON body can't be sent cross-site without the browser asking first, which this never allows.
            if (!String(req.headers['content-type']).startsWith('application/json')) {
              return send(415, { error: 'Send JSON.' });
            }

            const next = JSON.parse(await readBody(req));
            const current = JSON.parse(await readFile(file, 'utf8'));
            const problem = shapeProblem(current, next);
            if (problem) return send(400, { error: `Not saved: ${problem}.` });

            // Write to a temporary file first, so a failed save can never leave site.json half written.
            const temporary = `${file}.saving`;
            await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`);
            await rename(temporary, file);
            return send(200, { saved: true });
          } catch (error) {
            return send(400, { error: `Not saved: ${error.message}.` });
          }
        });
      },
    },
  };
}
