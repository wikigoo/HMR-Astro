import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const ALLOWED_ORIGIN = 'https://hmrbot.com';

export const POST: APIRoute = async ({ request, session, redirect }) => {
  const origin = request.headers.get('origin') ?? '';
  if (origin && origin !== ALLOWED_ORIGIN) {
    return new Response('دسترسی مجاز نیست', { status: 403 });
  }

  const ADMIN_USERNAME: string = (env as any).ADMIN_USERNAME ?? '';
  const ADMIN_PASSWORD: string = (env as any).ADMIN_PASSWORD ?? '';

  const data = await request.formData();
  const username = String(data.get('username') ?? '');
  const password = String(data.get('password') ?? '');

  const isValid =
    ADMIN_USERNAME !== '' &&
    ADMIN_PASSWORD !== '' &&
    username === ADMIN_USERNAME &&
    timingSafeEqual(password, ADMIN_PASSWORD);

  if (!isValid) {
    return redirect('/admin/login?error=1', 302);
  }

  await session?.set('user', { username, role: 'admin' });
  return redirect('/admin', 302);
};

// Constant-time string compare -- avoids leaking password length/prefix
// via response-time differences on a plain `===` check.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}
