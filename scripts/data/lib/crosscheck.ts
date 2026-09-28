/**
 * Ham (arşiv) seri ↔ .YTL seri çapraz kontrolü (owner kararı Faz 1 #3).
 * Ham değer kaynak tarihine göre TRY'ye çevrilir ve .YTL değeriyle TAM eşitlik aranır.
 * Fark çıkarsa otomatik düzeltme yapılmaz; raporlanır.
 */
import { Decimal } from '../../../src/lib/calculations/decimal.ts';
import { EVDS_SERIES } from '../../../src/config/evds-series.ts';
import { toTry } from '../../../src/lib/data/normalize.ts';
import type { IsoDate } from '../../../src/lib/data/dates.ts';
import { CURRENCIES, RATE_FIELDS, type CurrencyCode, type RateField, type SourceRow } from '../../../src/lib/providers/types.ts';

/** EVDS değerleri 8 ondalık basamakla verir. */
const EVDS_SCALE = 8;

export interface CrosscheckDiff {
  sourceDate: IsoDate;
  currency: CurrencyCode;
  field: RateField;
  raw: string | null;
  rawAsTry: string | null;
  crosscheck: string | null;
}

export interface CrosscheckResult {
  range: { start: IsoDate; end: IsoDate } | null;
  comparisons: number;
  exact: number;
  /** .YTL değeri, ham değerin TRY karşılığının 8 basamağa yuvarlanmış hâli (EVDS hassasiyet sınırı). */
  roundingOnly: CrosscheckDiff[];
  mismatches: CrosscheckDiff[];
  missingInCrosscheck: CrosscheckDiff[];
  missingInRaw: CrosscheckDiff[];
}

export function crosscheck(rawRows: readonly SourceRow[], ytlRows: readonly SourceRow[]): CrosscheckResult {
  const raw = new Map(rawRows.map((r) => [r.sourceDate, r.values]));
  const ytl = new Map(ytlRows.map((r) => [r.sourceDate, r.values]));
  const dates = [...new Set([...raw.keys(), ...ytl.keys()])].sort();
  const result: CrosscheckResult = {
    range: dates.length ? { start: dates[0]!, end: dates[dates.length - 1]! } : null,
    comparisons: 0,
    exact: 0,
    roundingOnly: [],
    mismatches: [],
    missingInCrosscheck: [],
    missingInRaw: [],
  };
  for (const sourceDate of dates) {
    for (const currency of CURRENCIES) {
      for (const field of RATE_FIELDS) {
        const codes = EVDS_SERIES[currency][field];
        const r = raw.get(sourceDate)?.[codes.raw] ?? null;
        const y = ytl.get(sourceDate)?.[codes.crosscheck] ?? null;
        if (r === null && y === null) continue;
        const rawAsTry = r !== null && Decimal.isValid(r) ? toTry(Decimal.parse(r), sourceDate) : null;
        const diff: CrosscheckDiff = {
          sourceDate,
          currency,
          field,
          raw: r,
          rawAsTry: rawAsTry?.toString() ?? null,
          crosscheck: y,
        };
        if (r === null) {
          result.missingInRaw.push(diff);
          continue;
        }
        if (y === null) {
          result.missingInCrosscheck.push(diff);
          continue;
        }
        result.comparisons++;
        if (!rawAsTry || !Decimal.isValid(y)) {
          result.mismatches.push(diff);
          continue;
        }
        const yv = Decimal.parse(y);
        if (rawAsTry.eq(yv)) result.exact++;
        else if (rawAsTry.round(EVDS_SCALE).eq(yv)) result.roundingOnly.push(diff);
        else result.mismatches.push(diff);
      }
    }
  }
  return result;
}
