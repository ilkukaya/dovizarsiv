/**
 * tr-TR biçimleyiciler (SPEC §7.2). Yuvarlama YALNIZCA burada, gösterim için yapılır.
 * Sayılar Intl.NumberFormat('tr-TR') ile ve ondalık string olarak biçimlenir (float'a çevrilmez).
 * Tarihler ICU sürüm farklarından etkilenmemek için sabit Türkçe adlarla üretilir.
 */
import { Decimal } from '../calculations/decimal.ts';
import { weekday, type IsoDate } from '../data/dates.ts';

export const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
] as const;

export const WEEKDAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'] as const;

const formatters = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number): Intl.NumberFormat {
  const key = `${min}:${max}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: min, maximumFractionDigits: max, roundingMode: 'halfEven' } as Intl.NumberFormatOptions);
    formatters.set(key, f);
  }
  return f;
}

function toDecimalString(value: Decimal | string): string {
  return typeof value === 'string' ? Decimal.parse(value).toString() : value.toString();
}

/** Kur gösterimi: varsayılan 4 ondalık (TCMB'nin yayımladığı hassasiyet). */
export function formatRate(value: Decimal | string, fractionDigits = 4): string {
  const s = toDecimalString(value);
  return nf(fractionDigits, fractionDigits).format(s as unknown as number);
}

/** Genel sayı: en az `min`, en çok `max` ondalık. */
export function formatNumber(value: Decimal | string, min = 0, max = 2): string {
  const s = toDecimalString(value);
  return nf(min, max).format(s as unknown as number);
}

/** Hareket gösterimi: "▲ %1,24" / "▼ %0,73" / "● %0,00". Renk tek başına anlam taşımaz. */
export function formatChange(pct: Decimal | null, fractionDigits = 2): string {
  if (pct === null) return '—';
  const rounded = pct.round(fractionDigits);
  const arrow = rounded.isZero() ? '●' : rounded.isNegative() ? '▼' : '▲';
  return `${arrow} %${formatRate(rounded.abs(), fractionDigits)}`;
}

/** "15 Ocak 2020, Çarşamba" */
export function formatDateLong(date: IsoDate): string {
  return `${formatDate(date)}, ${WEEKDAYS_TR[weekday(date)]}`;
}

/** "15 Ocak 2020" */
export function formatDate(date: IsoDate): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS_TR[m - 1]} ${y}`;
}

/** "Ocak 2020" */
export function formatMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number) as [number, number];
  return `${MONTHS_TR[m - 1]} ${y}`;
}

/** "1950'ler", "1960'lar", "2000'ler", "2010'lar" — son iki basamağın okunuşuna göre ünlü uyumu. */
export function decadeLabel(decade: number): string {
  const suffix: Record<number, string> = { 0: 'ler', 10: 'lar', 20: 'ler', 30: 'lar', 40: 'lar', 50: 'ler', 60: 'lar', 70: 'ler', 80: 'ler', 90: 'lar' };
  return `${decade}'${suffix[decade % 100] ?? 'ler'}`;
}
