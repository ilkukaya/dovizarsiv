/**
 * İstatistik tanımları (SPEC §5). Bu değerlerin tamamı "Döviz Arşiv hesaplaması"dır; TCMB yayımlamamıştır.
 * - Ortalama: mevcut TCMB gözlemlerinin aritmetik ortalaması. Gözlem olmayan günler sıfır sayılmaz, doldurulmaz.
 * - Yüzde değişim: ((yeni − eski) / eski) × 100.
 * - En düşük / en yüksek: eşitlikte en erken tarih.
 */
import { Decimal, mean, percentChange } from './decimal.ts';
import type { IsoDate } from '../data/dates.ts';
import type { Observation } from '../data/model.ts';
import type { CurrencyCode, RateField } from '../providers/types.ts';

export interface Point {
  date: IsoDate;
  value: Decimal;
}

export interface Summary {
  count: number;
  first: Point;
  last: Point;
  min: Point;
  max: Point;
  mean: Decimal;
  /** İlk → son gözlem yüzde değişimi. */
  changePct: Decimal | null;
}

export function seriesOf(observations: readonly Observation[], currency: CurrencyCode, field: RateField): Point[] {
  const points: Point[] = [];
  for (const obs of observations) {
    if (obs.currency !== currency) continue;
    const raw = obs[field];
    if (raw === undefined) continue;
    points.push({ date: obs.date, value: Decimal.parse(raw) });
  }
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return points;
}

export function summarize(points: readonly Point[]): Summary | null {
  if (points.length === 0) return null;
  let min = points[0]!;
  let max = points[0]!;
  for (const p of points) {
    if (p.value.cmp(min.value) < 0) min = p;
    if (p.value.cmp(max.value) > 0) max = p;
  }
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return {
    count: points.length,
    first,
    last,
    min,
    max,
    mean: mean(points.map((p) => p.value))!,
    changePct: percentChange(first.value, last.value),
  };
}

export interface DailyChange {
  date: IsoDate;
  prevDate: IsoDate;
  value: Decimal;
  prev: Decimal;
  changePct: Decimal | null;
}

/** Her gözlemin bir önceki GERÇEK gözleme göre değişimi (takvim günü değil). */
export function dailyChanges(points: readonly Point[]): DailyChange[] {
  const changes: DailyChange[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const cur = points[i]!;
    changes.push({
      date: cur.date,
      prevDate: prev.date,
      value: cur.value,
      prev: prev.value,
      changePct: percentChange(prev.value, cur.value),
    });
  }
  return changes;
}

/** Tüm gözlemler aynı değerdeyse true (sabit kur dönemleri; indekslenebilirlik kararında kullanılır). */
export function isFlat(points: readonly Point[]): boolean {
  if (points.length === 0) return false;
  const first = points[0]!.value;
  return points.every((p) => p.value.eq(first));
}
