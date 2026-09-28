/**
 * Tarih yardımcıları. Uygulama genelinde tarih = "YYYY-MM-DD" string'i.
 * `Date` nesnesi yalnızca UTC ile ve gün aritmetiği/gün adı için kullanılır (yerel saat kayması yok).
 */

export type IsoDate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EVDS_RE = /^(\d{2})-(\d{2})-(\d{4})$/;

export function isValidIsoDate(value: string): boolean {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m as unknown as [string, string, string, string];
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return (
    date.getUTCFullYear() === Number(y) &&
    date.getUTCMonth() === Number(mo) - 1 &&
    date.getUTCDate() === Number(d)
  );
}

export function assertIsoDate(value: string): IsoDate {
  if (!isValidIsoDate(value)) throw new Error(`Geçersiz tarih: "${value}"`);
  return value;
}

/** EVDS "gg-aa-yyyy" → ISO. */
export function evdsToIso(value: string): IsoDate {
  const m = EVDS_RE.exec(value);
  if (!m) throw new Error(`Geçersiz EVDS tarihi: "${value}"`);
  return assertIsoDate(`${m[3]}-${m[2]}-${m[1]}`);
}

/** ISO → EVDS "gg-aa-yyyy". */
export function isoToEvds(value: IsoDate): string {
  assertIsoDate(value);
  const [y, m, d] = value.split('-');
  return `${d}-${m}-${y}`;
}

function toUtc(value: IsoDate): Date {
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: IsoDate, days: number): IsoDate {
  const date = toUtc(value);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

/** Takvim günü farkı (b − a). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** 0 = Pazar … 6 = Cumartesi */
export function weekday(value: IsoDate): number {
  return toUtc(value).getUTCDay();
}

export function isWeekend(value: IsoDate): boolean {
  const w = weekday(value);
  return w === 0 || w === 6;
}

export function yearOf(value: IsoDate): number {
  return Number(value.slice(0, 4));
}

export function monthKey(value: IsoDate): string {
  return value.slice(0, 7);
}

export function todayUtc(now: Date = new Date()): IsoDate {
  return fromUtc(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
}

/** Türkiye saatiyle (UTC+3, 2016'dan beri yaz saati uygulaması yok) bugünün tarihi. */
export function todayIstanbul(now: Date = new Date()): IsoDate {
  return fromUtc(new Date(now.getTime() + 3 * 3_600_000));
}
