import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { HOMELAB_GUIDES, TAGS, type Tag } from './config';
import { homelabLoader } from './loaders/homelab';

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.enum(Object.keys(TAGS) as [Tag, ...Tag[]])).default([]),
    draft: z.boolean().default(false),
  }),
});

const homelab = defineCollection({
  loader: homelabLoader({ base: './src/content/homelab', github: HOMELAB_GUIDES }),
  schema: z.object({
    title: z.string(),
    /** Short name used in buttons; defaults to the title. */
    label: z.string().optional(),
    description: z.string(),
    updated: z.coerce.date().optional(),
    order: z.number().default(100),
    /** Set automatically for guides pulled from GitHub. */
    source: z.object({ repo: z.string(), url: z.string() }).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, homelab };
