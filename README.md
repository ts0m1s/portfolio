# portfolio

My personal site and blog: plain-language explainers on cybersecurity and networking, plus my homelab. Built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Run locally

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev       # http://localhost:4321/portfolio/
npm run build     # outputs static files to dist/
npm run preview   # serve the built site
```

## Make it yours

- **Name, headline, intro, social links:** `src/config.ts`
- **About page text:** `src/pages/about.astro`
- **GitHub Pages URL:** `site` and `base` in `astro.config.mjs`
- **Colors and fonts:** the variables at the top of `src/styles/global.css`
- **Favicon:** `public/favicon.svg`

## Write a post

Create a Markdown file in `src/content/posts/`. The file name becomes the URL (`my-topic.md` → `/posts/my-topic/`).

```markdown
---
title: What is a vector embedding?
description: One sentence shown in post lists and search results.
date: 2026-10-10
tags: [security]    # one or more of the tags in TAGS (src/config.ts)
draft: true         # optional: visible in `npm run dev` only
---

Your post in Markdown…
```

To add a new tag, add it to `TAGS` in `src/config.ts`. It gets a filter button on the Writing page, and its page at `/tags/<tag>/` is created automatically.

## Homelab

The Homelab page shows a card for each thing that's running. Edit them in `HOMELAB` in `src/config.ts`. Give a service a `link` (a guide id like `pihole`, optionally with `#section`) and its card opens that guide. Give it an `icon` (the name of an SVG in `public/icons/`, e.g. `pi-hole`) to show its full-colour logo. Icons come from [Dashboard Icons](https://dashboardicons.com), the set Homarr uses; see `public/icons/SOURCE.md`.

Guides come from two places. Link to them from a service card on the Homelab page:

- **Guides in your GitHub repos.** Add an entry to `HOMELAB_GUIDES` in `src/config.ts` with the repo (`owner/name`) and the Markdown file to use. The site downloads it every time it builds, so you keep editing the guide on GitHub as usual. Relative images and links are pointed at GitHub automatically.
- **Your own notes.** Create a Markdown file in `src/content/homelab/`:

  ```markdown
  ---
  title: My network setup
  label: Network       # optional: short name used in buttons
  description: One sentence shown in the guide list.
  order: 2             # optional: lower comes first
  ---
  ```

Building needs an internet connection to fetch the GitHub guides. If GitHub can't be reached, the build still finishes and prints a warning; that guide is just left out.

## Deploy (GitHub Pages)

1. Create a GitHub repo named `portfolio` and push this folder to it.
2. In the repo, go to **Settings → Pages → Build and deployment** and set **Source: GitHub Actions**.
3. Every push to `main` builds and deploys via `.github/workflows/deploy.yml`.

The site will be live at `https://<username>.github.io/portfolio/`.
