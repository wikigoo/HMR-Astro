import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hmrbot.com',
  adapter: cloudflare(),
  output: 'server',
  integrations: [react(), sitemap()],
});