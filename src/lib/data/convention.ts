/**
 * TARİH KONVANSİYONU — kod tabanındaki TEK eşleme yeri (owner kararı "B", docs/DECISIONS.md D-012).
 *
 * - Sitenin tarihi (`Observation.date`, /tarih/YYYY-MM-DD/, ay/yıl istatistikleri, araçlar, metin motoru):
 *   TCMB'nin kuru 15.30'da BELİRLEDİĞİ gün. Bu, TCMB'nin kendi bülten tarihlendirmesiyle aynıdır.
 * - EVDS'de D tarihli satır = D'den önceki son TCMB iş gününde belirlenen kur (EVDS veri grubu notu:
 *   "Bir önceki iş günü saat 15:30'da belirlenen …"). D, kurun GEÇERLİ olduğu gündür.
 *
 * "TCMB iş günü" = TCMB'nin gösterge kur belirlediği gün. Bu takvim EVDS'deki değer içeren satır
 * tarihlerinden türetilir (determinationCalendar). Eşlemenin doğruluğu TCMB bülten XML'leriyle
 * ≥ 40 tarihte doğrulanır (scripts/validation/verify-bulletins.ts, yalnızca GitHub Actions'ta).
 */
import type { IsoDate } from './dates.ts';

export interface DeterminationIndex {
  /** EVDS satır tarihi → kurun belirlendiği gün. İlk satırın öncülü bilinmediği için eşlenmez. */
  determinedOn(sourceDate: IsoDate): IsoDate | undefined;
  /** Belirlenme günü → o kuru taşıyan EVDS satır tarihi (kurun ilk geçerli olduğu gün). */
  sourceDateFor(determinationDate: IsoDate): IsoDate | undefined;
  /** Sıralı TCMB iş günleri (belirlenme takvimi). */
  readonly calendar: readonly IsoDate[];
}

/**
 * @param sourceDates Kaynakta en az bir değer içeren satır tarihleri (sırasız olabilir, tekrarlar atılır).
 */
export function buildDeterminationIndex(sourceDates: Iterable<IsoDate>): DeterminationIndex {
  const calendar = [...new Set(sourceDates)].sort();
  const toDetermination = new Map<IsoDate, IsoDate>();
  const toSource = new Map<IsoDate, IsoDate>();
  for (let i = 1; i < calendar.length; i++) {
    const sourceDate = calendar[i]!;
    // D'den önceki son TCMB iş günü.
    const determination = calendar[i - 1]!;
    toDetermination.set(sourceDate, determination);
    toSource.set(determination, sourceDate);
  }
  return {
    calendar,
    determinedOn: (sourceDate) => toDetermination.get(sourceDate),
    sourceDateFor: (determinationDate) => toSource.get(determinationDate),
  };
}
