/**
 * Derleme zamanı veri erişimi. Sayfalar veriye YALNIZCA buradan erişir (EVDS'ye build sırasında istek atılmaz;
 * yalnızca data/ altındaki yerel dosyalar okunur — SPEC §4.5).
 *
 * Tüm tarihler sitenin konvansiyonundadır: `date` = TCMB'nin kuru belirlediği gün (DECISIONS D-012).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DAY_PAGES_START } from '../../config/evds-series.ts';
import { CURRENCIES, RATE_FIELDS, type CurrencyCode, type RateField } from '../providers/types.ts';
import { Decimal } from '../calculations/decimal.ts';
import { dailyChanges, isFlat, seriesOf, summarize, type DailyChange, type Summary } from '../calculations/stats.ts';
import { indexOnOrBefore } from './lookup.ts';
import { monthKey, type IsoDate } from './dates.ts';
import type { Observation, YearFile } from './model.ts';

const DATA_DIR = resolve(process.env.DOVIZARSIV_DATA_DIR ?? 'data');

interface Store {
  all: Observation[];
  byCurrency: Record<CurrencyCode, Observation[]>;
  byCurrencyDates: Record<CurrencyCode, IsoDate[]>;
  byDate: Map<IsoDate, Partial<Record<CurrencyCode, Observation>>>;
  /** Tüm belirlenme günleri (sıralı). */
  dates: IsoDate[];
  /** Geçerlilik araması için: kaynak tarihine göre sıralı gözlemler. */
  bySourceDate: Record<CurrencyCode, Observation[]>;
  bySourceDateKeys: Record<CurrencyCode, IsoDate[]>;
}

let cache: Store | null = null;

function load(): Store {
  if (cache) return cache;
  const dir = join(DATA_DIR, 'normalized');
  if (!existsSync(dir)) throw new Error(`Veri yok: ${dir}. Önce npm run data:update -- --full`);
  const all: Observation[] = [];
  for (const file of readdirSync(dir).filter((f) => /^\d{4}\.json$/.test(f)).sort()) {
    const year = JSON.parse(readFileSync(join(dir, file), 'utf8')) as YearFile;
    if (year.source !== 'TCMB_EVDS') throw new Error(`${file}: bilinmeyen kaynak (production'da mock veri yasak)`);
    all.push(...year.observations);
  }
  const byCurrency = { USD: [], EUR: [], GBP: [] } as Record<CurrencyCode, Observation[]>;
  const byDate = new Map<IsoDate, Partial<Record<CurrencyCode, Observation>>>();
  for (const obs of all) {
    byCurrency[obs.currency].push(obs);
    const day = byDate.get(obs.date) ?? {};
    day[obs.currency] = obs;
    byDate.set(obs.date, day);
  }
  const byCurrencyDates = {} as Record<CurrencyCode, IsoDate[]>;
  const bySourceDate = {} as Record<CurrencyCode, Observation[]>;
  const bySourceDateKeys = {} as Record<CurrencyCode, IsoDate[]>;
  for (const c of CURRENCIES) {
    byCurrency[c].sort((a, b) => (a.date < b.date ? -1 : 1));
    byCurrencyDates[c] = byCurrency[c].map((o) => o.date);
    bySourceDate[c] = [...byCurrency[c]].sort((a, b) => (a.sourceDate < b.sourceDate ? -1 : 1));
    bySourceDateKeys[c] = bySourceDate[c].map((o) => o.sourceDate);
  }
  cache = { all, byCurrency, byCurrencyDates, byDate, dates: [...byDate.keys()].sort(), bySourceDate, bySourceDateKeys };
  return cache;
}

export function allDates(): IsoDate[] {
  return load().dates;
}

/** Gün sayfası üretilen belirlenme günleri (DAY_PAGES_START ve sonrası). */
export function dayPageDates(): IsoDate[] {
  return load().dates.filter((d) => d >= DAY_PAGES_START);
}

export function hasDayPage(date: IsoDate): boolean {
  return date >= DAY_PAGES_START && load().byDate.has(date);
}

export function lastDate(): IsoDate {
  const d = load().dates;
  return d[d.length - 1]!;
}

export function firstDate(currency?: CurrencyCode): IsoDate {
  return currency ? load().byCurrencyDates[currency][0]! : load().dates[0]!;
}

export function observationsOf(currency: CurrencyCode): Observation[] {
  return load().byCurrency[currency];
}

export function datesOf(currency: CurrencyCode): IsoDate[] {
  return load().byCurrencyDates[currency];
}

export function dayObservations(date: IsoDate): Partial<Record<CurrencyCode, Observation>> {
  return load().byDate.get(date) ?? {};
}

export function observation(currency: CurrencyCode, date: IsoDate): Observation | undefined {
  return load().byDate.get(date)?.[currency];
}

/** Belirlenme günleri arasında önceki/sonraki gerçek gözlem günü (tüm para birimleri birlikte). */
export function adjacentDates(date: IsoDate): { prev: IsoDate | null; next: IsoDate | null } {
  const dates = load().dates;
  const i = indexOnOrBefore(dates, date);
  const exact = dates[i] === date;
  return {
    prev: exact ? (dates[i - 1] ?? null) : (dates[i] ?? null),
    next: dates[i + 1] ?? null,
  };
}

/** Bir para biriminin `date`'ten önceki gözlemi. */
export function previousObservation(currency: CurrencyCode, date: IsoDate): Observation | undefined {
  const dates = load().byCurrencyDates[currency];
  const i = indexOnOrBefore(dates, date);
  const idx = dates[i] === date ? i - 1 : i;
  return idx >= 0 ? load().byCurrency[currency][idx] : undefined;
}

/**
 * `date` gününde GEÇERLİ olan kur: kaynak (EVDS) tarihi `date`'e eşit ya da ondan önceki son gözlem.
 * Owner kararı B'nin ikinci satırı: "Bu tarihte geçerli olan kur (bir önceki iş günü belirlenen)".
 */
export function validOn(currency: CurrencyCode, date: IsoDate): Observation | undefined {
  const keys = load().bySourceDateKeys[currency];
  const i = indexOnOrBefore(keys, date);
  return i >= 0 ? load().bySourceDate[currency][i] : undefined;
}

export function yearsOf(currency: CurrencyCode): number[] {
  return [...new Set(load().byCurrencyDates[currency].map((d) => Number(d.slice(0, 4))))];
}

export function monthsOf(currency: CurrencyCode, year?: number): string[] {
  const months = [...new Set(load().byCurrencyDates[currency].map((d) => monthKey(d)))];
  return year === undefined ? months : months.filter((m) => m.startsWith(`${year}-`));
}

/** Tüm para birimlerinde en az bir gözlemi olan yıllar. */
export function allYears(): number[] {
  return [...new Set(load().dates.map((d) => Number(d.slice(0, 4))))];
}

export function periodObservations(currency: CurrencyCode, prefix: string): Observation[] {
  return load().byCurrency[currency].filter((o) => o.date.startsWith(prefix));
}

export type FieldSummaries = Partial<Record<RateField, Summary>>;

const summaryCache = new Map<string, FieldSummaries>();
/** Dönem özeti (prefix: "2020" ya da "2020-01"). "Döviz Arşiv hesaplaması". */
export function periodSummary(currency: CurrencyCode, prefix: string): FieldSummaries {
  const key = `${currency}:${prefix}`;
  const hit = summaryCache.get(key);
  if (hit) return hit;
  const obs = periodObservations(currency, prefix);
  const out: FieldSummaries = {};
  for (const field of RATE_FIELDS) {
    const s = summarize(seriesOf(obs, currency, field));
    if (s) out[field] = s;
  }
  summaryCache.set(key, out);
  return out;
}

/** Dönem boyunca döviz alış ve satış hiç değişmediyse true (sabit kur). */
export function isFlatPeriod(currency: CurrencyCode, prefix: string): boolean {
  const obs = periodObservations(currency, prefix);
  return isFlat(seriesOf(obs, currency, 'forexBuying')) && isFlat(seriesOf(obs, currency, 'forexSelling'));
}

const changesCache = new Map<string, DailyChange[]>();
/** Bir alanın tüm günlük değişimleri (önceki GERÇEK gözleme göre). */
export function changesOf(currency: CurrencyCode, field: RateField = 'forexSelling'): DailyChange[] {
  const key = `${currency}:${field}`;
  let hit = changesCache.get(key);
  if (!hit) {
    hit = dailyChanges(seriesOf(load().byCurrency[currency], currency, field));
    changesCache.set(key, hit);
  }
  return hit;
}

/** Bir dönemin en sert yükseliş/düşüş günleri. */
export function sharpestMoves(currency: CurrencyCode, prefix = '', n = 5): { rises: DailyChange[]; falls: DailyChange[] } {
  const list = changesOf(currency).filter((c) => c.date.startsWith(prefix) && c.changePct !== null);
  const rises = list.filter((c) => c.changePct!.cmp(Decimal.ZERO) > 0).sort((a, b) => b.changePct!.cmp(a.changePct!)).slice(0, n);
  const falls = list.filter((c) => c.changePct!.cmp(Decimal.ZERO) < 0).sort((a, b) => a.changePct!.cmp(b.changePct!)).slice(0, n);
  return { rises, falls };
}

/** Tüm zamanların en yüksek değeri (bir alan için). */
export function allTimeHigh(currency: CurrencyCode, field: RateField = 'forexSelling'): Summary['max'] | null {
  return summarize(seriesOf(load().byCurrency[currency], currency, field))?.max ?? null;
}

export interface CoverageInfo {
  first: IsoDate;
  last: IsoDate;
  count: number;
}

export function coverageOf(currency: CurrencyCode, field: RateField = 'forexBuying'): CoverageInfo | null {
  const dates = seriesOf(load().byCurrency[currency], currency, field).map((p) => p.date);
  if (dates.length === 0) return null;
  return { first: dates[0]!, last: dates[dates.length - 1]!, count: dates.length };
}
