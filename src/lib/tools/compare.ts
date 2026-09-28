/**
 * Yıllara göre karşılaştırma (SPEC §6.9): seçilen yıllar ve para birimleri için ortalama, en düşük, en yüksek, yıl sonu.
 * Tanımlar yıl sayfalarıyla aynıdır (stats.ts `summarize`: gözlem ortalaması, eşitlikte en erken tarih).
 * "Yıl sonu": yılın son belirlenme gününün kuru.
 */
import { Decimal } from '../calculations/decimal.ts';
import { summarize, type Point, type Summary } from '../calculations/stats.ts';
import type { CurrencyCode, RateField } from '../providers/types.ts';
import type { RateStore } from './rates.ts';

export interface YearRow {
  year: number;
  count: number;
  summary: Summary;
  yearEnd: Point;
}

export interface CompareTable {
  currency: CurrencyCode;
  rows: YearRow[];
  /** Verisi olmayan yıllar (ör. EUR 1999 öncesi). */
  emptyYears: number[];
}

export const MAX_COMPARE_YEARS = 15;

export function compareYears(store: RateStore, currencies: readonly CurrencyCode[], fromYear: number, toYear: number, field: RateField): CompareTable[] {
  const tables: CompareTable[] = [];
  for (const currency of currencies) {
    const rows: YearRow[] = [];
    const emptyYears: number[] = [];
    for (let year = fromYear; year <= toYear; year++) {
      const points: Point[] = store
        .pointsOf(currency)
        .filter((p) => p.date.startsWith(`${year}-`) && p.values[field] !== null)
        .map((p) => ({ date: p.date, value: Decimal.parse(p.values[field]!) }));
      const summary = summarize(points);
      if (!summary) {
        emptyYears.push(year);
        continue;
      }
      rows.push({ year, count: points.length, summary, yearEnd: points[points.length - 1]! });
    }
    tables.push({ currency, rows, emptyYears });
  }
  return tables;
}
