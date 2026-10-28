// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages:
// - Replace USERNAME with your GitHub username.
// - `base` must match the repo name (here: a repo called "portfolio").
//   If the repo is named USERNAME.github.io, set base to '/'.
export default defineConfig({
  site: 'https://dimitrisk.github.io',
  base: '/portfolio',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
    },
  },
});
