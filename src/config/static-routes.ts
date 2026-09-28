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

export const STATIC_ROUTES: readonly StaticRoute[] = [
  { path: '/hesaplama/gecmis-doviz/', kind: 'tool', sitemap: 'pages', updated: '2026-09-28' },
  { path: '/hesaplama/kur-degisimi/', kind: 'tool', sitemap: 'pages', updated: '2026-09-28' },
  { path: '/karsilastir/', kind: 'tool', sitemap: 'pages', updated: '2026-09-28' },
  { path: '/rehber/', kind: 'guide', sitemap: 'guides', updated: '2026-09-28' },
  { path: '/rehber/2005-para-reformu-eski-tl/', kind: 'guide', sitemap: 'guides', updated: '2026-09-28' },
  { path: '/rehber/doviz-alis-satis-kuru-farki/', kind: 'guide', sitemap: 'guides', updated: '2026-09-28' },
  { path: '/rehber/doviz-kuru-nedir/', kind: 'guide', sitemap: 'guides', updated: '2026-09-28' },
  { path: '/rehber/efektif-alis-satis-nedir/', kind: 'guide', sitemap: 'guides', updated: '2026-09-28' },
  { path: '/rehber/gecmis-dolar-kuru-nasil-hesaplanir/', kind: 'guide', sitemap: 'guides', updated: '2026-09-28' },
  { path: '/rehber/gecmis-doviz-kuru-nasil-bulunur/', kind: 'guide', sitemap: 'guides', updated: '2026-09-28' },
  { path: '/rehber/gosterge-niteliginde-kurlar/', kind: 'guide', sitemap: 'guides', updated: '2026-09-28' },
  { path: '/rehber/hafta-sonu-tcmb-kuru/', kind: 'guide', sitemap: 'guides', updated: '2026-09-28' },
  { path: '/rehber/kurda-yuzde-degisim-nasil-hesaplanir/', kind: 'guide', sitemap: 'guides', updated: '2026-09-28' },
  { path: '/rehber/tcmb-doviz-kuru-nedir/', kind: 'guide', sitemap: 'guides', updated: '2026-09-28' },
  { path: '/hakkimizda/', kind: 'legal', sitemap: 'pages', updated: '2026-09-28' },
  { path: '/iletisim/', kind: 'legal', sitemap: 'pages', updated: '2026-09-28' },
  { path: '/gizlilik/', kind: 'legal', sitemap: 'pages', updated: '2026-09-28' },
  { path: '/cerez-politikasi/', kind: 'legal', sitemap: 'pages', updated: '2026-09-28' },
  { path: '/kullanim-kosullari/', kind: 'legal', sitemap: 'pages', updated: '2026-09-28' },
  { path: '/reklam-politikasi/', kind: 'legal', sitemap: 'pages', updated: '2026-09-28' },
];
