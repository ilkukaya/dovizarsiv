/**
 * Provider soyutlaması (SPEC §4.3). Sayfalar ve hesaplamalar ham EVDS alan adlarına bağımlı olmaz;
 * yalnızca buradaki tipleri kullanır. Kaynak değişirse yalnızca provider ve registry değişir.
 */
import type { IsoDate } from '../data/dates.ts';

export const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const RATE_FIELDS = ['forexBuying', 'forexSelling', 'cashBuying', 'cashSelling'] as const;
export type RateField = (typeof RATE_FIELDS)[number];

export type SourceId = 'TCMB_EVDS';

/** Kaynaktan gelen tek satır: kaynak tarihi + seri kodu → ham string (yoksa null). */
export interface SourceRow {
  /** Kaynağın kendi tarih alanı (EVDS "Tarih"), ISO biçiminde. */
  sourceDate: IsoDate;
  values: Record<string, string | null>;
}

export interface SeriesMetadata {
  code: string;
  datagroupCode: string;
  name: string;
  frequency: string;
  startDate: IsoDate;
  endDate: IsoDate;
}

export interface DatagroupMetadata {
  code: string;
  name: string;
  frequency: string;
  unit: string;
  startDate: IsoDate;
  endDate: IsoDate;
  note: string;
  lastUpdated: string;
}

export interface RateProvider {
  readonly id: SourceId;
  readonly label: string;
  /** [start, end] kapalı aralığındaki satırlar. Parçalama ve yeniden deneme provider'ın işidir. */
  fetchRows(seriesCodes: readonly string[], start: IsoDate, end: IsoDate): Promise<SourceRow[]>;
  fetchDatagroup(code: string): Promise<DatagroupMetadata>;
  fetchSeriesList(datagroupCode: string): Promise<SeriesMetadata[]>;
}
