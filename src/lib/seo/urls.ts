/**
 * URL şeması (SPEC §6.1–6.2). DOKUNULMAZ (HANDOFF.md). Tüm iç linkler bu yardımcılarla üretilir.
 * Kurallar: küçük harf, sonda eğik çizgi, ISO sayısal tarih/ay, tek host.
 */
import { SITE } from '../../config/site.ts';
import { CURRENCY_INFO } from '../../config/currencies.ts';
import type { CurrencyCode } from '../providers/types.ts';
import type { IsoDate } from '../data/dates.ts';

export const paths = {
  home: () => '/',
  hub: (c: CurrencyCode) => `/${CURRENCY_INFO[c].slug}/`,
  year: (c: CurrencyCode, year: number | string) => `/${CURRENCY_INFO[c].slug}/${year}/`,
  month: (c: CurrencyCode, yearMonth: string) => `/${CURRENCY_INFO[c].slug}/${yearMonth.slice(0, 4)}/${yearMonth.slice(5, 7)}/`,
  day: (date: IsoDate) => `/tarih/${date}/`,
  archive: () => '/tarih-arsivi/',
  archiveYear: (year: number | string) => `/tarih-arsivi/${year}/`,
  methodology: () => '/metodoloji/',
  sources: () => '/veri-kaynaklari/',
  csv: (c: CurrencyCode) => `/indir/${CURRENCY_INFO[c].slug}-kuru-arsivi.csv`,
  yearData: (year: number | string) => `/veri/kurlar/${year}.json`,
  dayIndex: () => '/veri/gunler.json',
  // Sonnet'in sayfaları (FEATURES bayrakları açılınca linklenir)
  historicalCalculator: () => '/hesaplama/gecmis-doviz/',
  changeCalculator: () => '/hesaplama/kur-degisimi/',
  compare: () => '/karsilastir/',
  guides: () => '/rehber/',
  guide: (slug: string) => `/rehber/${slug}/`,
} as const;

export function absoluteUrl(path: string): string {
  if (!path.startsWith('/')) throw new Error(`Göreli yol "/" ile başlamalı: ${path}`);
  return new URL(path, SITE.url).href;
}

/** Canonical: query string ve hash atılır, sonda eğik çizgi zorunlu (dosya uzantılı yollar hariç). */
export function canonicalUrl(path: string): string {
  const clean = path.split(/[?#]/)[0]!;
  const withSlash = /\.[a-z0-9]+$/i.test(clean) || clean.endsWith('/') ? clean : `${clean}/`;
  if (withSlash !== withSlash.toLowerCase()) throw new Error(`Canonical küçük harf olmalı: ${path}`);
  return absoluteUrl(withSlash);
}
