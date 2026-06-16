import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.request.headers.get('host') ?? '';

  if (host.startsWith('chat.') && context.url.pathname === '/') {
    return context.redirect('/chat', 302);
  }

  if (host.startsWith('blog.') && context.url.pathname === '/') {
    return context.redirect('https://blog.hmrbot.com', 302);
  }

  return next();
});
