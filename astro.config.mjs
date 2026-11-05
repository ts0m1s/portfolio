// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import siteEditor from './src/edit/integration.mjs';

// GitHub Pages:
// - Replace USERNAME with your GitHub username.
// - `base` must match the repo name (here: a repo called "portfolio").
//   If the repo is named USERNAME.github.io, set base to '/'.
export default defineConfig({
  site: 'https://ts0m1s.github.io',
  base: '/portfolio',
  // siteEditor: edit the site's text in the browser during `npm run dev`. Not in the built site.
  integrations: [sitemap(), siteEditor()],
  // Load pages on hover so transitions feel instant.
  prefetch: { prefetchAll: true },
  markdown: {
    shikiConfig: {
      themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
    },
  },
});
