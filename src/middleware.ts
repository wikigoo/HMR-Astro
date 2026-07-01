import { defineMiddleware } from 'astro:middleware';

// Kept in sync with public/_headers (which only covers static assets served
// via the ASSETS binding). output:'server' means every other response is
// rendered by this Worker, so security headers must be set here too.
const CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://accounts.google.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' data: https:; " +
  "connect-src 'self' https://srv.hmrbot.com https://accounts.google.com; " +
  "frame-src https://accounts.google.com; " +
  "object-src 'none'; " +
  "base-uri 'self'";

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': CSP,
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.request.headers.get('host') ?? '';

  // T030: redirect www to apex
  if (host.startsWith('www.')) {
    const url = context.url;
    return withSecurityHeaders(
      context.redirect(`https://hmrbot.com${url.pathname}${url.search}`, 301),
    );
  }

  if (host.startsWith('chat.') && context.url.pathname === '/') {
    return withSecurityHeaders(context.redirect('/chat', 302));
  }

<<<<<<< HEAD
=======
  // Auth guard for the admin dashboard -- covers both the dashboard pages
  // (/admin/*) and their API endpoints (/api/admin/*); the login page and
  // its own POST handler are the exceptions. startsWith (not ===) so every
  // sub-path is covered.
  const path = context.url.pathname;
  const isAdminPath = path.startsWith('/admin') || path.startsWith('/api/admin');
  const isLoginPath = path === '/admin/login' || path === '/api/admin/login';
  if (isAdminPath && !isLoginPath) {
    const user = await context.session?.get('user');
    if (!user) {
      if (path.startsWith('/api/admin')) {
        return withSecurityHeaders(
          new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return withSecurityHeaders(context.redirect('/admin/login', 302));
    }
    context.locals.user = user;
  }

>>>>>>> main
  const response = await next();
  return withSecurityHeaders(response);
});
