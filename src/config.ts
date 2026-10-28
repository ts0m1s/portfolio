// Edit this file to make the site yours.

export const SITE = {
  name: 'Dimitrios Kontoulis',
  // Home page headline and intro.
  tagline: 'Things that confused me about security, explained plainly.',
  intro:
    "I'm Dimitrios Kontoulis. I keep notes on the security and networking ideas that took me a while to understand, and write each one up the way I wish it had been explained to me.",
  description: 'Plain-language explainers on cybersecurity and networking, plus my homelab.',
};

// Shown at the bottom of the sidebar and on the About page. Remove any you don't use.
export const SOCIALS = [
  { name: 'github', url: 'https://github.com/ts0m1s' },
  { name: 'linkedin', url: 'https://www.linkedin.com/in/dimitris-kontoulis-56126524b/?isSelfProfile=true' },
  { name: 'email', url: 'mailto:dimkon2003@protonmail.com' },
];

// The Homelab page.
export const HOMELAB = {
  intro:
    'A Raspberry Pi at home where I learn networking and security hands-on. Everything here is something I set up, broke and fixed myself, and each guide documents how.',
  // What's running. Add a line for each new service.
  // `link` makes the card clickable: a guide id ('pihole'), a guide id plus a section
  // ('pihole#setup-for-tailscale-vpn-networks'), or a full URL. Leave it out for a plain card.
  // `icon` is a file name in public/icons/ (without .svg), from https://dashboardicons.com (see public/icons/SOURCE.md).
  services: [
    {
      name: 'Pi-hole',
      text: 'Blocks ads and trackers for every device on my network, at the DNS level.',
      link: 'pihole',
      icon: 'pi-hole',
    },
    {
      name: 'Tailscale',
      text: "Private VPN, so my devices keep using Pi-hole even when I'm away from home.",
      link: 'pihole#setup-for-tailscale-vpn-networks',
      icon: 'tailscale',
    },
  ] as { name: string; text: string; link?: string; icon?: string }[],
};

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
