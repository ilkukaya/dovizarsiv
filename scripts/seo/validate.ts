/**
 * npm run seo:validate — build sonrası dist/ kontrolü (SPEC §11.1). Ciddi hatada çıkış kodu 1.
 * - eksik/duplike title ve description, eksik/yanlış/duplike canonical, birden fazla ya da hiç H1
 * - sitemap'te noindex URL; sitemap'te olmayan indekslenebilir URL (kademeli gün sitemap'leri hariç)
 * - kaynak gösterimi olmayan veri sayfası; hatalı structured data; yasak ifadeler
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, pageMeta, readHtmlPages } from './lib/dist.ts';

const SITE = 'https://dovizarsiv.net';
const DATA_KINDS = new Set(['hub', 'year', 'month', 'day']);
const FORBIDDEN_LD_TYPES = new Set(['FAQPage', 'Review', 'AggregateRating', 'Product', 'NewsArticle']);
const FORBIDDEN_PHRASES = [
  'TCMB onaylı',
  'TCMB tarafından doğrulanmış',
  'resmî TCMB sitesi',
  'resmi TCMB sitesi',
  'TCMB partneri',
  'en doğru',
  '1 numara',
  'SEO garantili',
  'AdSense onaylı',
  'Google doğrulanmış',
  'canlı kurlar',
  'canlı döviz',
];

const errors: string[] = [];
const warnings: string[] = [];

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
}

function main(): void {
  const pages = readHtmlPages();
  const titles = new Map<string, string[]>();
  const descriptions = new Map<string, string[]>();
  const canonicals = new Map<string, string[]>();
  const indexable = new Set<string>();
  const noindex = new Set<string>();

  for (const page of pages) {
    const m = pageMeta(page.html);
    const where = page.path;
    const isNotFound = m.kind === 'notfound' || where === '/404.html';
    if (!m.kind) errors.push(`${where}: data-page-kind yok (BaseLayout kullanılmamış)`);
    if (!m.title) errors.push(`${where}: title yok`);
    if (!m.description) errors.push(`${where}: description yok`);
    if (m.h1Count !== 1) errors.push(`${where}: ${m.h1Count} adet H1`);
    if (!m.robots) errors.push(`${where}: robots meta yok`);
    if (m.indexable === true && m.robots !== 'index,follow') errors.push(`${where}: indekslenebilir ama robots="${m.robots}"`);
    if (m.indexable === false && m.robots !== 'noindex,follow') errors.push(`${where}: noindex ama robots="${m.robots}"`);
    if (!isNotFound) {
      const expected = `${SITE}${where}`;
      if (!m.canonical) errors.push(`${where}: canonical yok`);
      else if (m.canonical !== expected) errors.push(`${where}: canonical ${m.canonical}, beklenen ${expected}`);
      if (m.canonical) canonicals.set(m.canonical, [...(canonicals.get(m.canonical) ?? []), where]);
    }
    if (m.indexable) {
      indexable.add(`${SITE}${where}`);
      if (m.title) titles.set(m.title, [...(titles.get(m.title) ?? []), where]);
      if (m.description) descriptions.set(m.description, [...(descriptions.get(m.description) ?? []), where]);
    } else if (!isNotFound) {
      noindex.add(`${SITE}${where}`);
    }
    if (m.kind && DATA_KINDS.has(m.kind) && !m.hasSourceDisclosure) errors.push(`${where}: veri sayfasında kaynak gösterimi yok`);
    for (const raw of m.jsonLd) {
      try {
        const ld = JSON.parse(raw) as Record<string, unknown>;
        if (ld['@context'] !== 'https://schema.org') errors.push(`${where}: JSON-LD @context hatalı`);
        const type = String(ld['@type']);
        if (FORBIDDEN_LD_TYPES.has(type)) errors.push(`${where}: yasak structured data türü ${type}`);
        if (type === 'BreadcrumbList') {
          const items = (ld.itemListElement as Array<{ position: number; item: string; name: string }>) ?? [];
          items.forEach((it, i) => {
            if (it.position !== i + 1 || !it.item?.startsWith(SITE) || !it.name) errors.push(`${where}: BreadcrumbList öğesi ${i + 1} hatalı`);
          });
          if (m.canonical && items.length && items[items.length - 1]!.item !== m.canonical) errors.push(`${where}: BreadcrumbList son öğesi canonical değil`);
        }
        if (type === 'Dataset') {
          for (const key of ['name', 'description', 'temporalCoverage', 'creator', 'distribution']) if (!(key in ld)) errors.push(`${where}: Dataset ${key} eksik`);
        }
      } catch {
        errors.push(`${where}: JSON-LD ayrıştırılamadı`);
      }
    }
    const text = page.html.replace(/<[^>]+>/g, ' ');
    for (const phrase of FORBIDDEN_PHRASES) if (text.includes(phrase)) errors.push(`${where}: yasak ifade "${phrase}"`);
  }

  for (const [title, where] of titles) if (where.length > 1) errors.push(`Duplike title "${title}": ${where.slice(0, 5).join(', ')}`);
  for (const [d, where] of descriptions) if (where.length > 1) errors.push(`Duplike description: ${where.slice(0, 5).join(', ')} ("${d.slice(0, 60)}…")`);
  for (const [c, where] of canonicals) if (where.length > 1) errors.push(`Duplike canonical ${c}: ${where.join(', ')}`);

  // Sitemap tutarlılığı
  const indexPath = join(DIST, 'sitemap-index.xml');
  if (!existsSync(indexPath)) errors.push('sitemap-index.xml yok');
  const inIndex = new Set<string>();
  const inAnySitemap = new Set<string>();
  const sitemapFiles = existsSync(indexPath) ? locs(readFileSync(indexPath, 'utf8')) : [];
  const allSitemaps = [...new Set(sitemapFiles.map((u) => u.replace(SITE, '')))];
  for (const sm of allSitemaps) {
    const file = join(DIST, sm);
    if (!existsSync(file)) {
      errors.push(`sitemap index'teki ${sm} dosyası yok`);
      continue;
    }
    for (const u of locs(readFileSync(file, 'utf8'))) inIndex.add(u);
  }
  // Kademeli gün sitemap'leri: dosya var ama index'te olmayabilir.
  for (const f of readdirSync(DIST).filter((n) => /^sitemap-.+\.xml$/.test(n) && n !== 'sitemap-index.xml')) {
    for (const u of locs(readFileSync(join(DIST, f), 'utf8'))) inAnySitemap.add(u);
  }
  for (const u of inAnySitemap) {
    if (noindex.has(u)) errors.push(`Sitemap'te noindex URL: ${u}`);
    else if (!indexable.has(u)) errors.push(`Sitemap'te sayfası olmayan URL: ${u}`);
  }
  let staged = 0;
  for (const u of indexable) {
    if (!inAnySitemap.has(u)) errors.push(`İndekslenebilir ama hiçbir sitemap'te yok: ${u}`);
    else if (!inIndex.has(u)) {
      if (/\/tarih\/\d{4}-\d{2}-\d{2}\/$/.test(u)) staged++;
      else errors.push(`İndekslenebilir ama sitemap index'ten ulaşılamıyor: ${u}`);
    }
  }

  console.log(`seo:validate: ${pages.length} HTML sayfası; ${indexable.size} indekslenebilir, ${noindex.size} noindex; sitemap index'te ${inIndex.size} URL, kademeli indeksleme bekleyen gün sayfası ${staged}`);
  for (const w of warnings.slice(0, 50)) console.log(`UYARI: ${w}`);
  if (errors.length) {
    for (const e of errors.slice(0, 100)) console.error(`HATA: ${e}`);
    console.error(`seo:validate BAŞARISIZ: ${errors.length} hata`);
    process.exit(1);
  }
  console.log('seo:validate TAMAM');
}

main();
