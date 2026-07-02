import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request, redirect }) => {
  const data = await request.formData();
  const current = String(data.get('current') ?? '');
  const next = String(data.get('next') ?? '');
  const confirm = String(data.get('confirm') ?? '');

  if (next.length < 8) return redirect('/admin/settings?error=short', 302);
  if (next !== confirm) return redirect('/admin/settings?error=mismatch', 302);

  // KV-stored password takes precedence over the env-var secret
  const kv = (env as any).SESSION as KVNamespace | undefined;
  const kvPassword: string | null = kv ? await kv.get('_cfg_admin_password') : null;
  const currentStored: string = kvPassword ?? ((env as any).ADMIN_PASSWORD ?? '');

  if (!timingSafeEqual(current, currentStored)) {
    return redirect('/admin/settings?error=wrong', 302);
  }

  if (!kv) return redirect('/admin/settings?error=nokv', 302);

  await kv.put('_cfg_admin_password', next);
  return redirect('/admin/settings?ok=1', 302);
};

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}
