import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Read-only, non-secret config snapshot. Deliberately does not return
// FLOWISE_API_KEY or anything else sensitive. Auth is enforced by
// src/middleware.ts (this path matches /api/admin/*), not here.
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      backendUrl: 'https://srv.hmrbot.com',
      chatflowId: (env as any).FLOWISE_CHATFLOW_ID ?? '463b566b-f0f1-44d8-b498-3827c188783a',
      apiKeyConfigured: Boolean((env as any).FLOWISE_API_KEY),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
