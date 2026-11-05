// Site settings. The site's text lives in src/content/site.json: edit it there, or in the
// browser with the editor (`npm run dev`, then press E).

import content from './content/site.json';

export const CONTENT = content;
export const SITE = content.site;

// Shown at the bottom of the sidebar and on the About page. Remove any you don't use.
export const SOCIALS = [
  { name: 'github', url: 'https://github.com/ts0m1s' },
  { name: 'linkedin', url: 'https://www.linkedin.com/in/dimitris-kontoulis-56126524b/?isSelfProfile=true' },
  { name: 'email', url: 'mailto:dimkon2003@protonmail.com' },
];

export interface App {
  name: string;
  role: string;
  icon?: string;
  /** The app's own website or repo. */
  url?: string;
}

export interface Service {
  name: string;
  text: string;
  /** A guide to open when the card is clicked. */
  link?: string;
  icon?: string;
  /** The tool's own website, shown as a small ↗ on the card. */
  url?: string;
  /** Makes it a full-width card with sections of apps inside. */
  groups?: { name: string; apps: App[] }[];
}

// The Homelab page; its text and cards are in site.json under "homelab".
export const HOMELAB = content.homelab as Omit<typeof content.homelab, 'services'> & { services: Service[] };

// Guides that live in your GitHub repos. Each one is downloaded when the site builds,
// so editing the README/guide on GitHub updates the site on the next build.
export const HOMELAB_GUIDES = [
  {
    id: 'pihole',
    label: 'Pi-hole',
    title: 'Setting up Pi-hole on a Raspberry Pi',
    description:
      'Network-wide ad blocking at home: flashing the Pi, installing Pi-hole, pointing every device at it, and using it over Tailscale.',
    repo: 'ts0m1s/PiHole-Setup',
    file: 'index.md',
    order: 1,
  },
];

// Tags a post can use in its frontmatter, e.g. `tags: [security]`. Add more here (e.g. networking: 'Networking').
// Each tag gets a filter button on the Writing page and its own page at /tags/<tag>/.
export const TAGS = {
  security: 'Security',
} as const;

export type Tag = keyof typeof TAGS;
