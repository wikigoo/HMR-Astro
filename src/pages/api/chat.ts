import type { APIRoute } from 'astro';

const CHATFLOW_ID = import.meta.env.FLOWISE_CHATFLOW_ID ?? '';
const FLOWISE_API = 'https://srv.hmrbot.com';
const FLOWISE_API_KEY = import.meta.env.FLOWISE_API_KEY ?? '';

export const POST: APIRoute = async ({ request }) => {
  if (!CHATFLOW_ID) {
    return new Response(JSON.stringify({ error: 'chatflow not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { question?: string; chatId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { question, chatId } = body;
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'question required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (FLOWISE_API_KEY) headers['Authorization'] = `Bearer ${FLOWISE_API_KEY}`;

  const upstream = await fetch(`${FLOWISE_API}/api/v1/prediction/${CHATFLOW_ID}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question: question.trim(),
      streaming: true,
      chatId,
      overrideConfig: { sessionId: chatId },
    }),
  });

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: `upstream ${upstream.status}` }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Proxy the SSE stream as-is
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
};
