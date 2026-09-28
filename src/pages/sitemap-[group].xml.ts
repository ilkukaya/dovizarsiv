/**
 * Tür bazlı sitemap'ler. Yalnızca canonical, indekslenebilir (isIndexablePage), 200 dönen URL'ler girer.
 * lastmod build tarihi değildir (src/lib/seo/routes.ts).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { allRoutes, allSitemapGroups } from '../lib/seo/routes.ts';
import { absoluteUrl } from '../lib/seo/urls.ts';

export const getStaticPaths: GetStaticPaths = () => allSitemapGroups().map((group) => ({ params: { group } }));

export const GET: APIRoute = ({ params }) => {
  const urls = allRoutes()
    .filter((r) => r.sitemap === params.group && r.decision.indexable)
    .map((r) => `  <url><loc>${absoluteUrl(r.path)}</loc>${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ''}</url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
