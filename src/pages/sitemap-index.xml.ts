/**
 * Sitemap index (SPEC §8): türe göre bölünmüş; gün sitemap'leri kademeli (src/config/indexing.ts).
 * DOKUNULMAZ (HANDOFF.md).
 */
import type { APIRoute } from 'astro';
import { activeSitemapGroups, allRoutes } from '../lib/seo/routes.ts';
import { absoluteUrl } from '../lib/seo/urls.ts';

export const GET: APIRoute = () => {
  const routes = allRoutes();
  const entries = activeSitemapGroups().map((group) => {
    const lastmod = routes
      .filter((r) => r.sitemap === group && r.decision.indexable && r.lastmod)
      .reduce((m, r) => (r.lastmod! > m ? r.lastmod! : m), '');
    return `  <sitemap><loc>${absoluteUrl(`/sitemap-${group}.xml`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</sitemap>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</sitemapindex>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
