// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages:
// - Replace USERNAME with your GitHub username.
// - `base` must match the repo name (here: a repo called "portfolio").
//   If the repo is named USERNAME.github.io, set base to '/'.
export default defineConfig({
  site: 'https://ts0m1s.github.io',
  base: '/portfolio',
  integrations: [sitemap()],
  // Load pages on hover so transitions feel instant.
  prefetch: { prefetchAll: true },
  markdown: {
    shikiConfig: {
      themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
    },
  },
});
