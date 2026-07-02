import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async () => {
  const token: string = (env as any).GH_TOKEN ?? '';

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'متغیر GH_TOKEN تنظیم نشده است. آن را در Cloudflare Worker Secrets اضافه کن.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const res = await fetch(
    'https://api.github.com/repos/wikigoo/HMR-Astro/actions/workflows/blog-autogen.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'HMR-Admin/1.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return new Response(
      JSON.stringify({ error: `GitHub API خطا داد: ${res.status}`, detail: body }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // GitHub returns 204 No Content on success
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
