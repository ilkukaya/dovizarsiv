/**
 * Para birimi sunum bilgileri. URL şeması (SPEC §6.1–6.2) buradaki slug'lara dayanır; değiştirilmez.
 */
import type { CurrencyCode } from '../lib/providers/types.ts';

export interface CurrencyInfo {
  code: CurrencyCode;
  /** URL slug'ı: /dolar/, /euro/, /sterlin/ */
  slug: string;
  /** Başlıklarda: "Dolar Kuru Arşivi" */
  short: string;
  /** Tam ad: "ABD Doları" */
  name: string;
  /** Tamlama: "Doların", "Euronun"… (metin motorunda) */
  genitive: string;
  /** "dolar", "euro", "sterlin" (cümle içinde, küçük harf) */
  lower: string;
}

export const CURRENCY_INFO: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: 'USD', slug: 'dolar', short: 'Dolar', name: 'ABD Doları', genitive: 'Doların', lower: 'dolar' },
  EUR: { code: 'EUR', slug: 'euro', short: 'Euro', name: 'Euro', genitive: 'Euronun', lower: 'euro' },
  GBP: { code: 'GBP', slug: 'sterlin', short: 'Sterlin', name: 'İngiliz Sterlini', genitive: 'Sterlinin', lower: 'sterlin' },
};

export const CURRENCY_ORDER: CurrencyCode[] = ['USD', 'EUR', 'GBP'];

export function currencyBySlug(slug: string): CurrencyInfo | undefined {
  return Object.values(CURRENCY_INFO).find((c) => c.slug === slug);
}

export const FIELD_LABELS = {
  forexBuying: 'Döviz Alış',
  forexSelling: 'Döviz Satış',
  cashBuying: 'Efektif Alış',
  cashSelling: 'Efektif Satış',
} as const;

export const FIELD_DESCRIPTIONS = {
  forexBuying: 'TCMB\'nin döviz (hesaben, kaydi) alımı için belirlediği gösterge kur.',
  forexSelling: 'TCMB\'nin döviz (hesaben, kaydi) satışı için belirlediği gösterge kur.',
  cashBuying: 'Nakit (banknot) döviz alımı için belirlenen gösterge kur.',
  cashSelling: 'Nakit (banknot) döviz satışı için belirlenen gösterge kur.',
} as const;
