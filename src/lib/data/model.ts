/**
 * Normalize veri modeli (SPEC §4.6). Sayfalar, araçlar ve istatistikler yalnızca bu tipleri kullanır.
 */
import type { IsoDate } from './dates.ts';
import type { CurrencyCode, RateField, SourceId } from '../providers/types.ts';

export const SCHEMA_VERSION = 1;

export interface Normalization {
  reason: '2005_redenomination';
  /** Ham değer bu sayıya bölünerek TRY (yeni TL) karşılığı hesaplandı. */
  factor: string;
}

export interface Observation {
  /**
   * Sitenin tarihi: TCMB'nin bu kurları 15.30'da BELİRLEDİĞİ gün (owner kararı "B", DECISIONS D-012).
   * Tek eşleme fonksiyonu: src/lib/data/convention.ts → determinedOn().
   */
  date: IsoDate;
  /** Kaynaktaki (EVDS) satır tarihi = kurun geçerli olduğu gün. İzlenebilirlik için saklanır. */
  sourceDate: IsoDate;
  currency: CurrencyCode;
  /** TRY cinsinden (2005 öncesi için yeni TL karşılığı) kanonik ondalık string'ler. Yoksa alan hiç yoktur. */
  forexBuying?: string;
  forexSelling?: string;
  cashBuying?: string;
  cashSelling?: string;
  /** Kaynaktaki metin, birebir (EVDS 8 ondalık basamakla verir; 2005 öncesi eski TL). */
  raw: Partial<Record<RateField, string>>;
  /** Bu gözlemin ilk çekildiği ya da en son değiştiği an (ISO 8601). */
  fetchedAt: string;
  /** Ham değerlerin SHA-256 özeti (ilk 16 hex). */
  rawChecksum: string;
  normalization?: Normalization;
}

export interface YearFile {
  schemaVersion: typeof SCHEMA_VERSION;
  year: number;
  source: SourceId;
  /** Değerlerin birimi: 1 birim döviz karşılığı Türk lirası. */
  unit: 'TRY';
  dateConvention: 'determination-date';
  /** Alan → para birimi → ham seri kodu. */
  sourceSeries: Record<CurrencyCode, Partial<Record<RateField, string>>>;
  observations: Observation[];
}

export interface Revision {
  detectedAt: string;
  sourceDate: IsoDate;
  currency: CurrencyCode;
  field: RateField;
  seriesCode: string;
  oldRaw: string | null;
  newRaw: string | null;
}
