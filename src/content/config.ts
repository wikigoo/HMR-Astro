import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    pubDate: z.string(),
    pillar: z.string(),
    tags: z.array(z.string()).default([]),
    summary: z.string().default(''),
    source: z.string().optional(),
    sourceName: z.string().optional(),
    heroImage: z.string().optional(),
  }),
});

export const collections = {
  blog: blogCollection,
};