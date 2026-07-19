import { defineMiddleware } from 'astro:middleware';
import { inline, twind, virtual } from '@twind/core';
import config from '@/styles/twind.config';

// Injects generated Tailwind utility CSS into the response HTML.
// Each request uses a fresh Twind instance to avoid rule accumulation across renders.
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();

  // Only process HTML responses.
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const sheet = virtual();
  const tw = twind(config, sheet);
  const html = await response.text();
  const inlined = inline(html, { tw });

  return new Response(inlined, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});
