/**
 * Hesaplayıcı mantığı (SPEC §5). Sonuçlar "Döviz Arşiv hesaplaması"dır; TCMB gösterge kurlarıyla bilgi amaçlıdır.
 * Varsayılanlar: TL → döviz = Döviz Satış; döviz → TL = Döviz Alış. Kullanıcı kur türünü değiştirebilir.
 */
import { Decimal, DIV_SCALE } from './decimal.ts';
import type { RateField } from '../providers/types.ts';

export type Direction = 'tryToForeign' | 'foreignToTry';

export function defaultRateField(direction: Direction): RateField {
  return direction === 'tryToForeign' ? 'forexSelling' : 'forexBuying';
}

export interface Conversion {
  direction: Direction;
  rateField: RateField;
  amount: Decimal;
  rate: Decimal;
  result: Decimal;
  formula: string;
}

export function convert(direction: Direction, amount: Decimal, rate: Decimal, rateField = defaultRateField(direction)): Conversion {
  if (rate.isZero() || rate.isNegative()) throw new Error('Kur sıfır ya da negatif olamaz');
  if (amount.isNegative()) throw new Error('Tutar negatif olamaz');
  const result = direction === 'tryToForeign' ? amount.div(rate, DIV_SCALE) : amount.mul(rate);
  const formula = direction === 'tryToForeign' ? 'tutar (TL) ÷ kur' : 'tutar (döviz) × kur';
  return { direction, rateField, amount, rate, result, formula };
}
