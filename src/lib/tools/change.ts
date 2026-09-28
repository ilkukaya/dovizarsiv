/**
 * Kur değişimi hesabı (SPEC §6.9): iki tarih arasındaki değişim. "Yatırım getirisi" değil "kur değişimi".
 * Her iki tarih de kur belirlenen bir gün değilse en yakın önceki belirlenme günü kullanılır ve sonuçta belirtilir.
 * Yüzde: ((son − ilk) / ilk) × 100 (stats.ts ile aynı tanım).
 */
import { Decimal, percentChange } from '../calculations/decimal.ts';
import { daysBetween, type IsoDate } from '../data/dates.ts';
import type { CurrencyCode, RateField } from '../providers/types.ts';
import type { RateStore } from './rates.ts';
import type { Coverage } from './historical.ts';

export interface ChangeInput {
  currency: CurrencyCode;
  field: RateField;
  start: IsoDate;
  end: IsoDate;
}

export interface Endpoint {
  requestedDate: IsoDate;
  observationDate: IsoDate;
  exact: boolean;
  value: Decimal;
}

export type ChangeError =
  | { code: 'invalid_date' }
  | { code: 'order' }
  | { code: 'before_coverage'; firstDate: IsoDate }
  | { code: 'after_last'; lastDate: IsoDate }
  | { code: 'field_missing'; observationDate: IsoDate }
  | { code: 'not_loaded' };

export interface ChangeResult {
  ok: true;
  currency: CurrencyCode;
  field: RateField;
  start: Endpoint;
  end: Endpoint;
  /** son − ilk */
  difference: Decimal;
  /** null: ilk değer sıfır (gerçek veride olmaz). */
  percent: Decimal | null;
  /** İstenen iki takvim günü arasındaki gün sayısı. */
  calendarDays: number;
  /** Aralıktaki gözlem sayısı (belirlenme günü) ve grafik noktaları. */
  points: Array<{ date: IsoDate; value: number }>;
}

export function calculateChange(store: RateStore, input: ChangeInput, coverage: Coverage): ChangeResult | ChangeError {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.start) || !/^\d{4}-\d{2}-\d{2}$/.test(input.end)) return { code: 'invalid_date' };
  if (input.start > input.end) return { code: 'order' };
  const first = coverage.firstDates[input.currency];
  if (!first || input.start < first) return { code: 'before_coverage', firstDate: first ?? input.start };
  if (input.end > coverage.lastDate) return { code: 'after_last', lastDate: coverage.lastDate };

  const endpoint = (date: IsoDate): Endpoint | ChangeError => {
    const found = store.find(input.currency, date);
    if (!found) return { code: 'not_loaded' };
    const raw = found.point.values[input.field];
    if (raw === null || raw === undefined) return { code: 'field_missing', observationDate: found.point.date };
    return { requestedDate: date, observationDate: found.point.date, exact: found.exact, value: Decimal.parse(raw) };
  };
  const a = endpoint(input.start);
  if ('code' in a) return a;
  const b = endpoint(input.end);
  if ('code' in b) return b;

  const points = store
    .range(input.currency, a.observationDate, b.observationDate)
    .flatMap((p) => (p.values[input.field] === null ? [] : [{ date: p.date, value: Number(p.values[input.field]) }]));
  return {
    ok: true,
    currency: input.currency,
    field: input.field,
    start: a,
    end: b,
    difference: b.value.sub(a.value),
    percent: percentChange(a.value, b.value),
    calendarDays: daysBetween(input.start, input.end),
    points,
  };
}
