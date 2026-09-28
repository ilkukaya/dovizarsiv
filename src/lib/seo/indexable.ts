/**
 * İndekslenebilirlik kararı (SPEC §1.1-2, §8). Geçemeyen sayfa `noindex,follow` alır ve sitemap'e girmez.
 * Test sorusu: "Google olmasaydı bu sayfa bir insana yine faydalı olur muydu?"
 */
export type PageKind = 'home' | 'hub' | 'year' | 'month' | 'day' | 'archive' | 'archive-year' | 'info' | 'tool' | 'guide' | 'legal' | 'notfound';

export interface IndexabilityInput {
  kind: PageKind;
  /** Kendi canonical'ı mı? (Query string'li, alternatif yol vb. değil) */
  isCanonical: boolean;
  /** Veri sayfaları için: en az bir geçerli gözlem var mı? */
  observationCount?: number;
  /** Döviz alış ve satış dönem boyunca hiç değişmedi mi (sabit kur)? */
  flat?: boolean;
  /** Veri sayfalarında kaynak gösterimi bileşeni basıldı mı? */
  hasSourceDisclosure?: boolean;
  /** Aynı içeriğin başka bir canonical URL'de olup olmadığı. */
  duplicateOf?: string | null;
}

export interface IndexabilityDecision {
  indexable: boolean;
  reasons: string[];
}

const DATA_KINDS: ReadonlySet<PageKind> = new Set(['hub', 'year', 'month', 'day']);

export function isIndexablePage(page: IndexabilityInput): IndexabilityDecision {
  const reasons: string[] = [];
  if (page.kind === 'notfound') reasons.push('404 sayfası');
  if (!page.isCanonical) reasons.push('canonical değil');
  if (page.duplicateOf) reasons.push(`duplike: ${page.duplicateOf}`);
  if (DATA_KINDS.has(page.kind)) {
    if (!page.observationCount || page.observationCount < 1) reasons.push('geçerli gözlem yok');
    if (page.hasSourceDisclosure !== true) reasons.push('kaynak gösterimi yok');
    // Sabit kur dönemlerinde (ör. 1950–1980) ay/yıl sayfası diğer aylardan farklı bilgi sunmaz (owner kararı Faz 1 #1).
    if ((page.kind === 'month' || page.kind === 'year') && page.flat) reasons.push('kur dönem boyunca değişmemiş (anlamlı istatistik yok)');
    // Tek gözlemli ay: ortalama/en düşük/en yüksek anlamsız.
    if (page.kind === 'month' && (page.observationCount ?? 0) < 2) reasons.push('ayda tek gözlem var');
  }
  return { indexable: reasons.length === 0, reasons };
}
