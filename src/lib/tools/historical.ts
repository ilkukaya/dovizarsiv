/**
 * Geçmiş döviz hesaplayıcısı mantığı (SPEC §5, §6.9). Sonuç "Döviz Arşiv hesaplaması"dır; TCMB yayımlamamıştır.
 * Tüm hesap Decimal (BigInt) ile yapılır; yuvarlama yalnızca gösterimde (format.ts).
 *
 * Kur seçimi: istenen günde TCMB kur belirlediyse o günün kuru, belirlemediyse (hafta sonu, tatil, arife) en yakın
 * ÖNCEKİ belirlenme günü. Hangi günün kullanıldığı sonuçta açıkça yer alır.
 * TL ↔ döviz: varsayılan kur TL→döviz'de döviz satış, döviz→TL'de döviz alış (convert.ts). Döviz→döviz: kaynak alış, hedef satış.
 * 2005 öncesi: depodaki değerler yeni TL'dir. Tutar/sonuç eski TL istenirse 1 YTL = 1.000.000 TL ile dönüştürülür.
 */
import { Decimal } from '../calculations/decimal.ts';
import { convert, defaultRateField, type Direction } from '../calculations/convert.ts';
import { REDENOMINATION } from '../../config/evds-series.ts';
import type { CurrencyCode, RateField } from '../providers/types.ts';
import type { IsoDate } from '../data/dates.ts';
import type { RateStore } from './rates.ts';

export type Unit = 'TRY' | CurrencyCode;
export type TlUnit = 'old' | 'new';

export interface HistoricalInput {
  amount: string;
  from: Unit;
  to: Unit;
  date: IsoDate;
  /** Verilmezse yöne göre varsayılan. Döviz→döviz'de yalnızca türü (döviz/efektif) belirler. */
  rateField?: RateField;
  /** 2005 öncesi tarihte TL tutarın birimi. Varsayılan: o tarihte geçerli olan eski TL. */
  tlUnit?: TlUnit;
}

export interface Leg {
  currency: CurrencyCode;
  direction: Direction;
  field: RateField;
  rate: Decimal;
  /** Kullanılan gözlemin belirlenme günü. */
  observationDate: IsoDate;
  sourceDate: IsoDate;
  /** İstenen gün, kur belirlenen bir gün müydü? */
  exact: boolean;
}

export type HistoricalError =
  | { code: 'invalid_amount' }
  | { code: 'same_unit' }
  | { code: 'invalid_date' }
  | { code: 'before_coverage'; currency: CurrencyCode; firstDate: IsoDate }
  | { code: 'after_last'; lastDate: IsoDate }
  | { code: 'field_missing'; currency: CurrencyCode; field: RateField; observationDate: IsoDate }
  | { code: 'not_loaded'; currency: CurrencyCode };

export interface HistoricalResult {
  ok: true;
  requestedDate: IsoDate;
  from: Unit;
  to: Unit;
  amount: Decimal;
  result: Decimal;
  /** Sonuç TL ise ve 2005 öncesiyse: diğer TL biriminde karşılığı. */
  resultAlt: { unit: TlUnit; value: Decimal } | null;
  legs: Leg[];
  /** Kullanıcıya gösterilecek formül metni (rakamsız, kurallı). */
  formula: string;
  /** TL ile ilgili sonuçlarda kullanılan TL birimi (2005 öncesi için anlamlı). */
  tlUnit: TlUnit;
  preRedenomination: boolean;
}

export const AMOUNT_RE = /^\d{1,15}([.,]\d{1,6})?$/;

/** Kullanıcı girdisini Decimal'e çevirir: boşluk ve binlik ayırıcı noktalar tr-TR yazımına göre ele alınır. */
export function parseAmount(input: string): Decimal | null {
  let s = input.trim().replace(/\s/g, '');
  if (s === '') return null;
  // tr-TR: "1.234,56" → 1234.56 ; "1234,56" → 1234.56 ; "1234.56" → 1234.56 (noktadan sonra ≤ 6 hane ve virgül yoksa ondalık)
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!AMOUNT_RE.test(s.replace(',', '.'))) return null;
  const d = Decimal.parse(s);
  return d.isNegative() ? null : d;
}

export function isPreRedenomination(date: IsoDate): boolean {
  return date < REDENOMINATION.effectiveSourceDate;
}

export interface Coverage {
  firstDates: Partial<Record<CurrencyCode, IsoDate>>;
  lastDate: IsoDate;
}

function fieldKind(field: RateField): 'forex' | 'cash' {
  return field.startsWith('cash') ? 'cash' : 'forex';
}

function sideField(kind: 'forex' | 'cash', side: 'buying' | 'selling'): RateField {
  return (kind + (side === 'buying' ? 'Buying' : 'Selling')) as RateField;
}

function legFor(store: RateStore, currency: CurrencyCode, direction: Direction, field: RateField, date: IsoDate): Leg | HistoricalError {
  const found = store.find(currency, date);
  if (!found) return { code: 'not_loaded', currency };
  const raw = found.point.values[field];
  if (raw === null || raw === undefined) return { code: 'field_missing', currency, field, observationDate: found.point.date };
  return { currency, direction, field, rate: Decimal.parse(raw), observationDate: found.point.date, sourceDate: found.point.sourceDate, exact: found.exact };
}

function isError(x: Leg | HistoricalError): x is HistoricalError {
  return 'code' in x;
}

export function calculateHistorical(store: RateStore, input: HistoricalInput, coverage: Coverage): HistoricalResult | HistoricalError {
  const amount = parseAmount(input.amount);
  if (!amount) return { code: 'invalid_amount' };
  if (input.from === input.to) return { code: 'same_unit' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { code: 'invalid_date' };
  if (input.date > coverage.lastDate) return { code: 'after_last', lastDate: coverage.lastDate };
  for (const unit of [input.from, input.to]) {
    if (unit === 'TRY') continue;
    const first = coverage.firstDates[unit];
    if (!first || input.date < first) return { code: 'before_coverage', currency: unit, firstDate: first ?? input.date };
  }

  const pre = isPreRedenomination(input.date);
  const tlUnit: TlUnit = pre ? (input.tlUnit ?? 'old') : 'new';
  // Hesap yeni TL üzerinden yapılır (depodaki değerler yeni TL).
  let working = amount;
  if (input.from === 'TRY' && pre && tlUnit === 'old') working = amount.shiftLeft(REDENOMINATION.factorExponent);

  const legs: Leg[] = [];
  let result: Decimal;
  let formula: string;
  if (input.from === 'TRY' || input.to === 'TRY') {
    const foreign = (input.from === 'TRY' ? input.to : input.from) as CurrencyCode;
    const direction: Direction = input.from === 'TRY' ? 'tryToForeign' : 'foreignToTry';
    const field = input.rateField ?? defaultRateField(direction);
    const leg = legFor(store, foreign, direction, field, input.date);
    if (isError(leg)) return leg;
    legs.push(leg);
    const c = convert(direction, working, leg.rate, field);
    result = c.result;
    formula = c.formula;
  } else {
    const kind = fieldKind(input.rateField ?? 'forexBuying');
    const first = legFor(store, input.from as CurrencyCode, 'foreignToTry', sideField(kind, 'buying'), input.date);
    if (isError(first)) return first;
    const second = legFor(store, input.to as CurrencyCode, 'tryToForeign', sideField(kind, 'selling'), input.date);
    if (isError(second)) return second;
    legs.push(first, second);
    const tryValue = convert('foreignToTry', working, first.rate, first.field).result;
    result = convert('tryToForeign', tryValue, second.rate, second.field).result;
    formula = 'tutar × kaynak alış kuru ÷ hedef satış kuru (TL üzerinden)';
  }

  let resultAlt: HistoricalResult['resultAlt'] = null;
  if (input.to === 'TRY' && pre) {
    // `result` yeni TL'dir. İstenen birim eski TL ise ana sonuç eski TL olur.
    const newTl = result;
    const oldTl = newTl.shiftRight(REDENOMINATION.factorExponent);
    if (tlUnit === 'old') {
      result = oldTl;
      resultAlt = { unit: 'new', value: newTl };
    } else {
      resultAlt = { unit: 'old', value: oldTl };
    }
  }

  return { ok: true, requestedDate: input.date, from: input.from, to: input.to, amount, result, resultAlt, legs, formula, tlUnit, preRedenomination: pre };
}
