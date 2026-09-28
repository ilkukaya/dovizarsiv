/** robots.txt (SPEC §8): sade; sitemap index'i gösterir. noindex sayfalar burada engellenmez. */
import type { APIRoute } from 'astro';
import { absoluteUrl } from '../lib/seo/urls.ts';

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('/sitemap-index.xml')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
