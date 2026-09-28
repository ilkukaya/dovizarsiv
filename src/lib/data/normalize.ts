/**
 * Ham kaynak kayıtlarından normalize gözlemler üretir (SPEC §4.6, §4.7).
 *
 * - Alanlar (döviz alış/satış, efektif alış/satış) ayrı tutulur; hiçbir zaman birleştirilmez.
 * - 2005 dönüşümü değerin büyüklüğüne göre DEĞİL, kaynak satır TARİHİNE göre yapılır.
 * - Şüpheli değerler "tamir edilmez": reddedilir ve `issues` listesine yazılır.
 */
import { Decimal } from '../calculations/decimal.ts';
import { EVDS_SERIES, REDENOMINATION } from '../../config/evds-series.ts';
import { CURRENCIES, RATE_FIELDS, type CurrencyCode, type RateField } from '../providers/types.ts';
import { buildDeterminationIndex, type DeterminationIndex } from './convention.ts';
import type { IsoDate } from './dates.ts';
import type { Observation } from './model.ts';

export interface SourceRecord {
  raw: string;
  fetchedAt: string;
}

/** sourceDate → seri kodu → ham kayıt (yalnızca null olmayan değerler). */
export type SourceStore = Map<IsoDate, Map<string, SourceRecord>>;

export interface NormalizationIssue {
  sourceDate: IsoDate;
  seriesCode: string;
  raw: string;
  problem: 'not_a_number' | 'negative' | 'zero';
}

export interface NormalizeResult {
  observations: Observation[];
  issues: NormalizationIssue[];
  index: DeterminationIndex;
  /** Belirlenme günü bilinmediği için atlanan satırlar (serinin ilk satırı). */
  unmapped: IsoDate[];
}

export function isPreRedenomination(sourceDate: IsoDate): boolean {
  return sourceDate < REDENOMINATION.effectiveSourceDate;
}

/** Ham değeri TRY'ye çevirir: 2005 öncesi kaynak tarihli değerler ÷ 1.000.000 (tam, yuvarlamasız). */
export function toTry(raw: Decimal, sourceDate: IsoDate): Decimal {
  return isPreRedenomination(sourceDate) ? raw.shiftLeft(REDENOMINATION.factorExponent) : raw;
}

export function checkRawValue(raw: string): NormalizationIssue['problem'] | null {
  if (!Decimal.isValid(raw)) return 'not_a_number';
  const value = Decimal.parse(raw);
  if (value.isNegative()) return 'negative';
  if (value.isZero()) return 'zero';
  return null;
}

export function normalize(
  store: SourceStore,
  checksum: (payload: string) => string,
): NormalizeResult {
  const issues: NormalizationIssue[] = [];
  const valid: SourceStore = new Map();
  for (const [sourceDate, codes] of store) {
    const kept = new Map<string, SourceRecord>();
    for (const [code, record] of codes) {
      const problem = checkRawValue(record.raw);
      if (problem) issues.push({ sourceDate, seriesCode: code, raw: record.raw, problem });
      else kept.set(code, record);
    }
    if (kept.size > 0) valid.set(sourceDate, kept);
  }

  const index = buildDeterminationIndex(valid.keys());
  const observations: Observation[] = [];
  const unmapped: IsoDate[] = [];

  for (const sourceDate of index.calendar) {
    const codes = valid.get(sourceDate)!;
    const date = index.determinedOn(sourceDate);
    if (!date) {
      unmapped.push(sourceDate);
      continue;
    }
    for (const currency of CURRENCIES) {
      const obs = buildObservation(currency, date, sourceDate, codes, checksum);
      if (obs) observations.push(obs);
    }
  }
  observations.sort(compareObservations);
  return { observations, issues, index, unmapped };
}

function buildObservation(
  currency: CurrencyCode,
  date: IsoDate,
  sourceDate: IsoDate,
  codes: Map<string, SourceRecord>,
  checksum: (payload: string) => string,
): Observation | null {
  const raw: Partial<Record<RateField, string>> = {};
  const values: Partial<Record<RateField, string>> = {};
  let fetchedAt = '';
  const payload: string[] = [];
  for (const field of RATE_FIELDS) {
    const code = EVDS_SERIES[currency][field].raw;
    const record = codes.get(code);
    if (!record) continue;
    raw[field] = record.raw;
    values[field] = toTry(Decimal.parse(record.raw), sourceDate).toString();
    if (record.fetchedAt > fetchedAt) fetchedAt = record.fetchedAt;
    payload.push(`${code}=${record.raw}`);
  }
  if (payload.length === 0) return null;
  const obs: Observation = {
    date,
    sourceDate,
    currency,
    ...values,
    raw,
    fetchedAt,
    rawChecksum: checksum(`${sourceDate}|${currency}|${payload.join(';')}`),
  };
  if (isPreRedenomination(sourceDate)) {
    obs.normalization = { reason: REDENOMINATION.reason, factor: REDENOMINATION.factor };
  }
  return obs;
}

export function compareObservations(a: Observation, b: Observation): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return CURRENCIES.indexOf(a.currency) - CURRENCIES.indexOf(b.currency);
}

/** Normalize dosyalardan ham kaynak deposunu geri kurar (artımlı güncelleme ve revizyon takibi için). */
export function storeFromObservations(observations: Iterable<Observation>): SourceStore {
  const store: SourceStore = new Map();
  for (const obs of observations) {
    let codes = store.get(obs.sourceDate);
    if (!codes) {
      codes = new Map();
      store.set(obs.sourceDate, codes);
    }
    for (const field of RATE_FIELDS) {
      const raw = obs.raw[field];
      if (raw === undefined) continue;
      codes.set(EVDS_SERIES[obs.currency][field].raw, { raw, fetchedAt: obs.fetchedAt });
    }
  }
  return store;
}
