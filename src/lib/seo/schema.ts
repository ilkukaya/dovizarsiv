/**
 * Structured data yardımcıları (SPEC §8). Görünür içerikle birebir uyumlu olmalı.
 * Kullanılmayanlar: FAQPage, Review, AggregateRating, Product, NewsArticle.
 */
import { SITE, EVDS_URL } from '../../config/site.ts';
import { absoluteUrl } from './urls.ts';

export type JsonLd = Record<string, unknown>;

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbList(crumbs: readonly Crumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };
}

export function website(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url + '/',
    inLanguage: SITE.language,
    description: SITE.tagline,
  };
}

/** Organization yalnızca yayıncı adı doluysa basılır (uydurma bilgi yok). */
export function organization(): JsonLd | null {
  if (!SITE.publisherName) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.publisherName,
    url: SITE.url + '/',
    ...(SITE.contactEmail ? { email: SITE.contactEmail } : {}),
  };
}

export interface DatasetInput {
  name: string;
  description: string;
  path: string;
  temporalCoverage: string; // "1950-01-02/2026-09-25"
  csvPath: string;
  keywords: string[];
}

/** Google Dataset Search yönergeleri: name, description, creator/source, license notu, temporalCoverage, distribution. */
export function dataset(input: DatasetInput): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    inLanguage: SITE.language,
    keywords: input.keywords,
    temporalCoverage: input.temporalCoverage,
    isAccessibleForFree: true,
    creator: {
      '@type': 'Organization',
      name: 'Türkiye Cumhuriyet Merkez Bankası (TCMB)',
      url: 'https://www.tcmb.gov.tr/',
    },
    isBasedOn: { '@type': 'CreativeWork', name: 'TCMB Elektronik Veri Dağıtım Sistemi (EVDS)', url: EVDS_URL },
    publisher: { '@type': 'Organization', name: SITE.publisherName || SITE.name, url: SITE.url + '/' },
    usageInfo: absoluteUrl('/veri-kaynaklari/'),
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: absoluteUrl(input.csvPath) },
    ],
  };
}

export interface ArticleInput {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
}

/** Rehber yazıları için Article. Yazar/uzman UYDURULMAZ: yayıncı olarak yalnızca site (ya da site.ts'deki yayıncı adı) yazılır. */
export function article(input: ArticleInput): JsonLd {
  const org = { '@type': 'Organization', name: SITE.publisherName || SITE.name, url: SITE.url + '/' };
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    inLanguage: SITE.language,
    mainEntityOfPage: absoluteUrl(input.path),
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: org,
    publisher: org,
  };
}

/** `</script>` kaçışı ile güvenli JSON-LD metni. */
export function jsonLdText(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
