import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ session, redirect }) => {
  await session?.destroy();
  return redirect('/admin/login', 302);
};
