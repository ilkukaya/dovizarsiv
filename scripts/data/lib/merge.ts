/**
 * Çekilen satırları mevcut depoyla birleştirir (SPEC §4.5, §4.6).
 * - Yeni değer → eklenir.
 * - Değişmiş değer → revizyon olarak kaydedilir (eski, yeni, tespit zamanı) ve güncellenir. Sessiz üzerine yazma yok.
 * - Kaynakta kaybolan değer → SİLİNMEZ; "disappeared" olarak raporlanır (hata güvenliği).
 */
import { EVDS_SERIES } from '../../../src/config/evds-series.ts';
import type { IsoDate } from '../../../src/lib/data/dates.ts';
import type { Revision } from '../../../src/lib/data/model.ts';
import type { SourceStore } from '../../../src/lib/data/normalize.ts';
import { CURRENCIES, RATE_FIELDS, type CurrencyCode, type RateField, type SourceRow } from '../../../src/lib/providers/types.ts';

export interface MergeResult {
  added: number;
  unchanged: number;
  revisions: Revision[];
  disappeared: Array<{ sourceDate: IsoDate; seriesCode: string; storedRaw: string }>;
}

const codeIndex = new Map<string, { currency: CurrencyCode; field: RateField }>();
for (const currency of CURRENCIES) {
  for (const field of RATE_FIELDS) codeIndex.set(EVDS_SERIES[currency][field].raw, { currency, field });
}

export function mergeRows(store: SourceStore, rows: readonly SourceRow[], now: string): MergeResult {
  const result: MergeResult = { added: 0, unchanged: 0, revisions: [], disappeared: [] };
  for (const row of rows) {
    for (const [code, value] of Object.entries(row.values)) {
      const meta = codeIndex.get(code);
      if (!meta) throw new Error(`Registry dışı seri kodu birleştirilemez: ${code}`);
      const existing = store.get(row.sourceDate)?.get(code);
      if (value === null) {
        if (existing) result.disappeared.push({ sourceDate: row.sourceDate, seriesCode: code, storedRaw: existing.raw });
        continue;
      }
      if (!existing) {
        let codes = store.get(row.sourceDate);
        if (!codes) store.set(row.sourceDate, (codes = new Map()));
        codes.set(code, { raw: value, fetchedAt: now });
        result.added++;
      } else if (existing.raw !== value) {
        result.revisions.push({
          detectedAt: now,
          sourceDate: row.sourceDate,
          currency: meta.currency,
          field: meta.field,
          seriesCode: code,
          oldRaw: existing.raw,
          newRaw: value,
        });
        store.get(row.sourceDate)!.set(code, { raw: value, fetchedAt: now });
      } else {
        result.unchanged++;
      }
    }
  }
  return result;
}
