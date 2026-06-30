import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    pillar: z.string(),
    tags: z.array(z.string()).default([]),
    description: z.string().default(''),
    summary: z.string().default(''),
    source: z.string().optional(),
    sourceName: z.string().optional(),
    heroImage: z.string().optional(),
  }),
});

export const collections = {
  blog: blogCollection,
};
