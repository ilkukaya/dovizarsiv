/**
 * Veriden türemeyen sayfaların rota kaydı (araçlar, rehberler, güven/yasal sayfalar). Sonnet sayfa ekledikçe buraya yazar.
 * Rota kaydı (src/lib/seo/routes.ts) bu listeyi okur: indekslenebilirlik kararı isIndexablePage'den gelir, sitemap'e
 * yalnızca buradan girer. seo:validate, indekslenebilir olup hiçbir sitemap'te olmayan sayfada build'i düşürür.
 *
 * - path: trailing slash'lı, küçük harf canonical yol (src/lib/seo/urls.ts `paths` yardımcılarını kullanın)
 * - kind: 'tool' | 'guide' | 'legal' | 'info'
 * - sitemap: 'pages' (araç, güven, yasal) ya da 'guides' (rehber yazıları ve /rehber/)
 * - updated: son ANLAMLI içerik değişikliği (YYYY-MM-DD). Build tarihi yazılmaz.
 */
import type { PageKind } from '../lib/seo/indexable.ts';

export interface StaticRoute {
  path: string;
  kind: Extract<PageKind, 'tool' | 'guide' | 'legal' | 'info'>;
  sitemap: 'pages' | 'guides';
  updated: string;
}

export const STATIC_ROUTES: readonly StaticRoute[] = [];
