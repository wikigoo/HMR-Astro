# HMR (همر) — hmrbot.com

The public site for HMR, a Persian-language AI mobile-hardware advisor: new/used
phone buying guides, fraud detection, troubleshooting, hardware education, and
accessory recommendations. Built with [Astro](https://astro.build) (`output: 'server'`)
on the [Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/),
deployed as a Cloudflare Worker.

## Stack

- **Astro 6**, SSR (`output: 'server'`) via `@astrojs/cloudflare`
- **React** islands where needed (`@astrojs/react`)
- **Cloudflare Workers** — deployed via Cloudflare's Git integration (auto-builds on push to `main`)
- **Chat backend**: Flowise at `srv.hmrbot.com`, proxied through `src/pages/api/chat.ts` so the
  Flowise URL/API key never reach the browser
- **Blog**: Astro content collection (`src/content/blog`, `.md`), populated by an AI
  content-generation pipeline that runs weekly

## Project structure

```text
src/
├── pages/
│   ├── index.astro          # homepage
│   ├── ai.astro              # the chat UI (full-page advisor at /ai)
│   ├── chat.astro            # legacy route, redirects to /ai
│   ├── about.astro, contact.astro, privacy.astro, disclaimer.astro, delete-account.astro
│   ├── blog/
│   │   ├── index.astro       # blog listing
│   │   └── [...slug].astro   # individual post (prerendered — see below)
│   ├── api/
│   │   ├── chat.ts           # Flowise proxy (SSE streaming, CORS locked to hmrbot.com)
│   │   └── health.ts         # uptime check endpoint
│   ├── 404.astro, 500.astro
├── content/blog/*.md          # blog posts (AI-generated, see pipeline below)
├── content.config.ts          # blog collection schema (Zod)
├── layouts/Layout.astro        # shared layout: meta/OG/Twitter tags, nav, footer
├── middleware.ts               # www->apex redirect, chat. subdomain redirect,
│                                # security headers on every SSR response
└── env.d.ts                    # ambient types (Google Identity Services globals)

public/
├── _headers                    # security headers for static assets (ASSETS binding)
├── fonts/, assets/, blog/images/
└── robots.txt

scripts/
├── blog_generator.py           # AI blog pipeline (see below)
└── published_topics.json       # dedup registry the pipeline maintains

.github/workflows/
├── blog-autogen.yml            # weekly cron: generates + publishes blog posts
└── ci.yml                      # astro check + astro build on every push/PR to main
```

## Local development

Requires Node >= 22.12.0.

```sh
npm install
npm run dev        # localhost:4321
npm run check       # astro check (type-checking) — also runs in CI
npm run build       # production build to ./dist/
npm run preview     # preview the build locally, using Cloudflare's workerd runtime
```

`npm run check` and `npm run build` both run in CI (`.github/workflows/ci.yml`) on every
push/PR to `main` — a red check there means the build would fail on deploy too.

## Environment variables

Copy `.env.example` and fill in real values for local dev (`.env` is gitignored):

```
FLOWISE_CHATFLOW_ID=...
FLOWISE_API_KEY=...
```

In production these are Cloudflare Worker secrets, not plain environment variables —
set them via the Cloudflare dashboard or `wrangler secret put`, never commit real values.

## Deployment

Cloudflare's Git integration builds and deploys automatically on every push to `main`
(`astro build`, output directory `dist`) — there is no separate `wrangler deploy` step
in CI. `wrangler.jsonc` holds the Worker's static config (name, compatibility date/flags);
KV/session bindings the Cloudflare adapter needs are auto-provisioned on deploy.

## The blog pipeline

`.github/workflows/blog-autogen.yml` runs every Monday (and can be triggered manually),
executes `scripts/blog_generator.py`, and — if new articles were generated — commits them
straight to `main` (which triggers a normal Cloudflare deploy) and posts to Telegram.
Failures alert a Telegram admin chat.

Blog post pages (`src/pages/blog/[...slug].astro`) are **prerendered** via `getStaticPaths()`
over the collection — not per-request SSR — both for performance (served from the edge/ASSETS
cache) and so `@astrojs/sitemap` can actually discover them (a pure SSR catch-all route with no
static path list is invisible to the sitemap integration).

## Security headers

`public/_headers` only applies to static assets served via the `ASSETS` binding. Since this
site is `output: 'server'`, every other response (all pages, all API routes) is rendered by
the Worker and gets its security headers from `src/middleware.ts` instead — the two are kept
manually in sync (same CSP, HSTS, etc. in both places).
