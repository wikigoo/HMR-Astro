import type { APIRoute } from 'astro';

const FLOWISE_URL = 'https://srv.hmrbot.com';
const MAX_CHARS = 2000;
const ALLOWED_ORIGIN = 'https://hmrbot.com';

export const OPTIONS: APIRoute = ({ request }) => {
  const origin = request.headers.get('origin') ?? '';
  if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const origin = request.headers.get('origin') ?? '';
  if (origin && origin !== ALLOWED_ORIGIN) {
    return json({ error: 'دسترسی مجاز نیست' }, 403);
  }
  const env = (locals as any).runtime?.env ?? {};
  const CHATFLOW_ID: string = env.FLOWISE_CHATFLOW_ID ?? '463b566b-f0f1-44d8-b498-3827c188783a';
  const FLOWISE_API_KEY: string = env.FLOWISE_API_KEY ?? '';

  // Parse and validate body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'درخواست نامعتبر' }, 400);
  }

  const question = String(body.question ?? '').trim().slice(0, MAX_CHARS);
  if (!question) return json({ error: 'پیام خالی است' }, 400);

  const sessionId = String(body.sessionId ?? '').replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 64);

  // Build upstream request headers
  const upHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (FLOWISE_API_KEY) upHeaders['Authorization'] = `Bearer ${FLOWISE_API_KEY}`;

  let upstream: Response;
  try {
    upstream = await fetch(`${FLOWISE_URL}/api/v1/prediction/${CHATFLOW_ID}`, {
      method: 'POST',
      headers: upHeaders,
      body: JSON.stringify({ question, streaming: true, chatId: sessionId, overrideConfig: { sessionId } }),
    });
  } catch {
    return json({ error: 'سرویس در دسترس نیست. لطفاً چند لحظه دیگر تلاش کن.' }, 503);
  }

  if (!upstream.ok) {
    return json({ error: `خطای سرویس (${upstream.status})` }, upstream.status >= 500 ? 502 : upstream.status);
  }

  // Stream the SSE response back to the client
  const ct = upstream.headers.get('content-type') ?? 'text/event-stream';
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
      ...corsHeaders(origin),
    },
  });
};

function corsHeaders(origin: string): Record<string, string> {
  if (origin !== ALLOWED_ORIGIN) return {};
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data: object, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
