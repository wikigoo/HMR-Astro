import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hmrbot.com',
  adapter: cloudflare(),
  output: 'server',
  prefetch: true,
  integrations: [
    react(),
    sitemap({
      // /ai is noindex,nofollow by design; /chat is a pure redirect to /ai;
      // /admin/* is the auth-gated dashboard. None belong in the sitemap.
      filter: (page) => {
        const { pathname } = new URL(page);
        return (
          pathname !== '/ai/' &&
          pathname !== '/chat/' &&
          !pathname.startsWith('/admin/')
        );
      },
    }),
  ],
});