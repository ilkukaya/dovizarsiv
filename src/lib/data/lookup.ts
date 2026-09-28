/**
 * Gözlem arama: istenen takvim tarihi ↔ gerçek gözlem tarihi, önceki/sonraki GERÇEK gözlem.
 * Hafta sonu ve tatiller interpolasyonla doldurulmaz (SPEC §5).
 */
import type { IsoDate } from './dates.ts';

/** Sıralı tarih dizisinde `target`'a eşit ya da ondan önceki son tarihin indeksi; yoksa -1. */
export function indexOnOrBefore(sortedDates: readonly IsoDate[], target: IsoDate): number {
  let lo = 0;
  let hi = sortedDates.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sortedDates[mid]! <= target) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export interface Resolution {
  requestedDate: IsoDate;
  /** Kullanılan gerçek gözlem tarihi (istenen günde gözlem yoksa bir önceki gözlem). */
  observationDate: IsoDate;
  exact: boolean;
}

/** İstenen tarih için gözlem çözümü: aynı gün ya da en yakın ÖNCEKİ gözlem. Kapsam öncesiyse null. */
export function resolveDate(sortedDates: readonly IsoDate[], requested: IsoDate): Resolution | null {
  const i = indexOnOrBefore(sortedDates, requested);
  if (i < 0) return null;
  const observationDate = sortedDates[i]!;
  return { requestedDate: requested, observationDate, exact: observationDate === requested };
}

export function previousObservation(sortedDates: readonly IsoDate[], date: IsoDate): IsoDate | null {
  const i = indexOnOrBefore(sortedDates, date);
  if (i < 0) return null;
  const idx = sortedDates[i] === date ? i - 1 : i;
  return idx >= 0 ? sortedDates[idx]! : null;
}

export function nextObservation(sortedDates: readonly IsoDate[], date: IsoDate): IsoDate | null {
  const i = indexOnOrBefore(sortedDates, date);
  const next = sortedDates[i + 1];
  return next ?? null;
}

/** `date` çevresindeki önceki `before` ve sonraki `after` gözlem ("Yakın Tarihler"). */
export function neighbours(
  sortedDates: readonly IsoDate[],
  date: IsoDate,
  before = 5,
  after = 5,
): { before: IsoDate[]; after: IsoDate[] } {
  const i = indexOnOrBefore(sortedDates, date);
  // `date` gözlemse kendisi hariç tutulur; değilse i, date'ten önceki son gözlemdir.
  const beforeEnd = sortedDates[i] === date ? i : i + 1;
  return {
    before: sortedDates.slice(Math.max(0, beforeEnd - before), beforeEnd),
    after: sortedDates.slice(i + 1, i + 1 + after),
  };
}
