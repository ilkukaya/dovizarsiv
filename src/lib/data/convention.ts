/**
 * TARİH KONVANSİYONU — kod tabanındaki TEK eşleme yeri (owner kararı "B", docs/DECISIONS.md D-012).
 *
 * - Sitenin tarihi (`Observation.date`, /tarih/YYYY-MM-DD/, ay/yıl istatistikleri, araçlar, metin motoru):
 *   TCMB'nin kuru 15.30'da BELİRLEDİĞİ gün. Bu, TCMB'nin kendi bülten tarihlendirmesiyle aynıdır.
 * - EVDS'de D tarihli satır = D'den önceki son TCMB iş gününde belirlenen kur (EVDS veri grubu notu:
 *   "Bir önceki iş günü saat 15:30'da belirlenen …"). D, kurun GEÇERLİ olduğu gündür.
 *
 * "TCMB iş günü" (kurun belirlendiği gün) EVDS verisinden şöyle çıkarılır:
 * - EVDS, kur belirlenmeyen günlerde (arife, bayram, bazı tatiller) bir önceki kuru TEKRARLAYAN satırlar içerir
 *   (ör. her yıl 28 Ekim arifesi; 2017-08-31 → 2017-09-05). Bir satır önceki satırla birebir aynı değerleri
 *   taşıyorsa "taşınan" (carry-over) satırdır: o satırın tarihinden önceki gün kur BELİRLENMEMİŞTİR.
 * - Yeni değer taşıyan N satırının kuru, N'den önceki satırın gününde belirlenmiştir.
 * - Bu tekrar kuralı `CARRY_OVER_RULE_FROM` tarihinden itibaren uygulanır. Öncesinde (sabit kur dönemleri,
 *   değerler aylarca aynı) her satır ayrı bir belirlenme sayılır. Gerekçe ve ölçüm: DECISIONS D-012.
 *
 * Eşlemenin doğruluğu TCMB bülten XML'leriyle ≥ 40 tarihte doğrulanır (scripts/validation/verify-bulletins.ts,
 * yalnızca GitHub Actions'ta).
 */
import type { IsoDate } from './dates.ts';

/** Tekrar (taşınan kur) kuralının uygulandığı ilk kaynak tarihi. 1990 sonrası tüm tekrar dizileri 2–3 satırdır ve tatillere denk gelir. */
export const CARRY_OVER_RULE_FROM: IsoDate = '1990-01-01';

export interface SourceRowValues {
  sourceDate: IsoDate;
  /** seri kodu → ham değer (yalnızca geçerli, null olmayan değerler). */
  values: ReadonlyMap<string, string>;
}

/** İki satır aynı kuru mu taşıyor? Ortak en az bir seri olmalı ve ortak serilerin tümü eşit olmalı. */
export function sameRate(a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>): boolean {
  let common = 0;
  for (const [code, value] of a) {
    const other = b.get(code);
    if (other === undefined) continue;
    common++;
    if (other !== value) return false;
  }
  return common > 0;
}

export interface DeterminationIndex {
  /** Yeni kur taşıyan EVDS satırı → kurun belirlendiği gün. Taşınan satırlar ve ilk satır için undefined. */
  determinedOn(sourceDate: IsoDate): IsoDate | undefined;
  /** Belirlenme günü → o kuru İLK taşıyan EVDS satırı (kurun ilk geçerli olduğu gün). */
  sourceDateFor(determinationDate: IsoDate): IsoDate | undefined;
  /** Taşınan satır → aynı kuru ilk taşıyan satır. Yeni kur taşıyan satırlar için undefined. */
  carryOverOf(sourceDate: IsoDate): IsoDate | undefined;
  /** Sıralı belirlenme günleri (TCMB iş günleri takvimi). */
  readonly calendar: readonly IsoDate[];
  /** Sıralı tüm kaynak satır tarihleri. */
  readonly sourceDates: readonly IsoDate[];
}

export function buildDeterminationIndex(rows: Iterable<SourceRowValues>): DeterminationIndex {
  const sorted = [...rows].sort((a, b) => (a.sourceDate < b.sourceDate ? -1 : a.sourceDate > b.sourceDate ? 1 : 0));
  const toDetermination = new Map<IsoDate, IsoDate>();
  const toSource = new Map<IsoDate, IsoDate>();
  const carryOver = new Map<IsoDate, IsoDate>();
  const calendar: IsoDate[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const row = sorted[i]!;
    if (row.sourceDate === prev.sourceDate) throw new Error(`Duplike kaynak satırı: ${row.sourceDate}`);
    if (row.sourceDate >= CARRY_OVER_RULE_FROM && sameRate(row.values, prev.values)) {
      // Önceki satırın gününde kur belirlenmemiş; bu satır aynı kuru taşıyor.
      carryOver.set(row.sourceDate, carryOver.get(prev.sourceDate) ?? prev.sourceDate);
      continue;
    }
    // Yeni kur: D'den önceki son TCMB iş günü = önceki satırın günü.
    toDetermination.set(row.sourceDate, prev.sourceDate);
    toSource.set(prev.sourceDate, row.sourceDate);
    calendar.push(prev.sourceDate);
  }
  return {
    calendar,
    sourceDates: sorted.map((r) => r.sourceDate),
    determinedOn: (sourceDate) => toDetermination.get(sourceDate),
    sourceDateFor: (determinationDate) => toSource.get(determinationDate),
    carryOverOf: (sourceDate) => carryOver.get(sourceDate),
  };
}
