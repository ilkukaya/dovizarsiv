/**
 * PROGRAMATİK METİN MOTORU (SPEC §7.1). DOKUNULMAZ (HANDOFF.md).
 *
 * Kurallar:
 * - Cümleler veri durumuna göre dallanır: yükseliş/düşüş/yatay, rekor/sıradan, seri başlangıcı/devamı,
 *   ay içi konum, tatil/hafta sonu sonrası. Farklılık eş anlamlı kelimeyle DEĞİL, farklı veri gerçekleriyle sağlanır.
 * - Anlamlı veri içermeyen cümle basılmaz (her üretici, veri yoksa cümleyi atlar).
 * - Ekonomik sebep yorumu, tahmin, "canlı" gibi ifadeler ASLA üretilmez.
 * - Türkçe ek uyumu hatasını önlemek için tarih ve sayıdan sonra ek getirilmez
 *   ("15 Ocak 2020 tarihinde", "5,8933 TL", "%1,24 yükseldi").
 * - Tüm tarihler sitenin konvansiyonundadır: kurun TCMB tarafından belirlendiği gün (DECISIONS D-012).
 */
import { Decimal, percentChange } from '../calculations/decimal.ts';
import type { Summary } from '../calculations/stats.ts';
import { CURRENCY_INFO } from '../../config/currencies.ts';
import { daysBetween, type IsoDate } from '../data/dates.ts';
import { formatDate, formatMonth, formatNumber, formatRate } from '../formatting/format.ts';
import type { CurrencyCode } from '../providers/types.ts';

export type Direction = 'up' | 'down' | 'flat';

/** %0,005'ten küçük değişim (2 basamakta %0,00) "yatay" sayılır. */
export function direction(pct: Decimal | null): Direction | null {
  if (pct === null) return null;
  const r = pct.round(2);
  if (r.isZero()) return 'flat';
  return r.isNegative() ? 'down' : 'up';
}

export function pctText(pct: Decimal): string {
  return `%${formatNumber(pct.abs().round(2), 2, 2)}`;
}

function tl(value: Decimal): string {
  return `${formatRate(value)} TL`;
}

const MOVE_VERB: Record<Direction, (pct: Decimal) => string> = {
  up: (p) => `${pctText(p)} yükseldi`,
  down: (p) => `${pctText(p)} geriledi`,
  flat: () => 'değişmedi',
};

// ---------------------------------------------------------------------------------------------------------------
// Gün sayfası
// ---------------------------------------------------------------------------------------------------------------

export interface DayCurrencyFacts {
  currency: CurrencyCode;
  selling: Decimal;
  buying: Decimal;
  prevDate: IsoDate | null;
  prevSelling: Decimal | null;
  /** Ay içindeki tüm gözlemlerin (Döviz Satış) özeti. */
  month: Summary | null;
  /** Ay tamamlanmış mı (içinde bulunulan ay değil)? */
  monthComplete: boolean;
  /** Yılın ilk gözlemi (Döviz Satış) — yıl başından beri değişim için. */
  yearFirst: { date: IsoDate; value: Decimal } | null;
  /** Bu tarihe KADAR (dahil) görülmüş en yüksek Döviz Satış değeri ve tarihi. */
  priorMax: { date: IsoDate; value: Decimal } | null;
  /** Serinin ilk gözlemi mi? */
  isSeriesStart: boolean;
}

export interface DayFacts {
  date: IsoDate;
  currencies: DayCurrencyFacts[];
}

/** Gün sayfası açılış bloğu: 2–4 cümle, tamamen o günün verisinden. */
export function dayIntro(facts: DayFacts): string[] {
  const out: string[] = [];
  const list = facts.currencies;
  if (list.length === 0) return out;
  const values = list.map((c) => `${CURRENCY_INFO[c.currency].name} ${tl(c.selling)}`);
  out.push(`TCMB'nin ${formatDate(facts.date)} tarihinde saat 15.30'da belirlediği döviz satış kurları: ${joinTr(values)}.`);

  const withPrev = list.filter((c) => c.prevSelling && c.prevDate);
  if (withPrev.length > 0) {
    const prevDate = withPrev[0]!.prevDate!;
    const gap = daysBetween(prevDate, facts.date);
    const moves = withPrev.map((c) => {
      const pct = percentChange(c.prevSelling!, c.selling)!;
      return { c, pct, dir: direction(pct)! };
    });
    const allSame = moves.every((m) => m.dir === moves[0]!.dir);
    const head = gap > 3
      ? `Bir önceki gözlem ${gap} gün önce, ${formatDate(prevDate)} tarihinde belirlenmişti; ona göre`
      : `Bir önceki gözlem olan ${formatDate(prevDate)} tarihine göre`;
    if (allSame && moves.length > 1 && moves[0]!.dir !== 'flat') {
      const verb = moves[0]!.dir === 'up' ? 'yükseldi' : 'geriledi';
      const all = moves.length === 3 ? 'üç kurun tamamı' : 'iki kur da';
      out.push(`${head} ${all} ${verb}: ${joinTr(moves.map((m) => `${CURRENCY_INFO[m.c.currency].lower} ${pctText(m.pct)}`))}.`);
    } else {
      out.push(`${head} ${joinTr(moves.map((m) => `${CURRENCY_INFO[m.c.currency].lower} ${MOVE_VERB[m.dir](m.pct)}`))}.`);
    }
  }

  const usd = list.find((c) => c.currency === 'USD') ?? list[0]!;
  const record = recordSentence(usd, facts.date);
  if (record) out.push(record);
  else {
    const pos = monthPositionSentence(usd, facts.date);
    if (pos) out.push(pos);
  }
  return out.slice(0, 4);
}

function recordSentence(c: DayCurrencyFacts, date: IsoDate): string | null {
  if (c.isSeriesStart) return `Bu, ${CURRENCY_INFO[c.currency].lower} için EVDS'deki ilk gözlemdir.`;
  if (c.priorMax && c.priorMax.date === date && c.prevSelling) {
    return `Bu değer, ${CURRENCY_INFO[c.currency].lower} döviz satış kurunun o güne kadarki en yüksek düzeyidir (Döviz Arşiv hesaplaması).`;
  }
  return null;
}

/** Ay ortalamasına ve ayın en düşük/en yüksek değerine göre konum. */
export function monthPositionSentence(c: DayCurrencyFacts, date: IsoDate): string | null {
  const m = c.month;
  if (!m || m.count < 2) return null;
  const name = CURRENCY_INFO[c.currency].lower;
  const monthLabel = formatMonth(date.slice(0, 7));
  const scope = c.monthComplete ? `${monthLabel} ortalamasının` : `${monthLabel} içinde şimdiye kadar belirlenen kurların ortalamasının`;
  if (m.max.date === date && m.min.date !== date) {
    return `${capitalize(name)} döviz satış kuru bu tarihte ${monthLabel} içindeki en yüksek değerindeydi${c.monthComplete ? '' : ' (ay devam ediyor)'}.`;
  }
  if (m.min.date === date && m.max.date !== date) {
    return `${capitalize(name)} döviz satış kuru bu tarihte ${monthLabel} içindeki en düşük değerindeydi${c.monthComplete ? '' : ' (ay devam ediyor)'}.`;
  }
  const diff = percentChange(m.mean, c.selling);
  const dir = direction(diff);
  if (!diff || !dir) return null;
  if (dir === 'flat') return `${capitalize(name)} döviz satış kuru ${scope} düzeyindeydi.`;
  return `${capitalize(name)} döviz satış kuru ${scope} ${pctText(diff)} ${dir === 'up' ? 'üzerindeydi' : 'altındaydı'}.`;
}

/** Para birimi bölümü (H2 altında): tamamen veriden. */
export function dayCurrencySection(c: DayCurrencyFacts, date: IsoDate): string[] {
  const info = CURRENCY_INFO[c.currency];
  const out: string[] = [];
  out.push(`${formatDate(date)} tarihinde belirlenen ${info.lower} kuru döviz alışta ${tl(c.buying)}, döviz satışta ${tl(c.selling)}.`);
  if (c.prevSelling && c.prevDate) {
    const pct = percentChange(c.prevSelling, c.selling)!;
    const dir = direction(pct)!;
    out.push(
      dir === 'flat'
        ? `Bir önceki gözlemde (${formatDate(c.prevDate)}) döviz satış kuru aynı düzeydeydi: ${tl(c.prevSelling)}.`
        : `Bir önceki gözlemde (${formatDate(c.prevDate)}) döviz satış kuru ${tl(c.prevSelling)} idi; değişim ${dir === 'up' ? '▲' : '▼'} ${pctText(pct)}.`,
    );
  } else if (c.isSeriesStart) {
    out.push(`Bu tarih, ${info.lower} için EVDS'deki ilk gözlemdir; karşılaştırılacak önceki gözlem yoktur.`);
  }
  const pos = monthPositionSentence(c, date);
  if (pos) out.push(pos);
  if (c.month && c.month.count >= 2) {
    out.push(`${formatMonth(date.slice(0, 7))} içinde döviz satış kuru en düşük ${tl(c.month.min.value)} (${formatDate(c.month.min.date)}), en yüksek ${tl(c.month.max.value)} (${formatDate(c.month.max.date)}) oldu${c.monthComplete ? '' : ' (ay devam ediyor)'}.`);
  }
  if (c.yearFirst && c.yearFirst.date !== date) {
    const pct = percentChange(c.yearFirst.value, c.selling)!;
    const dir = direction(pct)!;
    out.push(
      dir === 'flat'
        ? `Yılın ilk gözlemine (${formatDate(c.yearFirst.date)}, ${tl(c.yearFirst.value)}) göre değişmedi.`
        : `Yılın ilk gözlemine (${formatDate(c.yearFirst.date)}, ${tl(c.yearFirst.value)}) göre ${pctText(pct)} ${dir === 'up' ? 'yüksek' : 'düşük'}.`,
    );
  } else if (c.yearFirst && c.yearFirst.date === date) {
    out.push(`Bu, ${date.slice(0, 4)} yılında belirlenen ilk ${info.lower} kurudur.`);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Ay ve yıl sayfaları
// ---------------------------------------------------------------------------------------------------------------

export interface PeriodFacts {
  currency: CurrencyCode;
  /** "2020-01" ya da "2020" */
  period: string;
  selling: Summary;
  buying: Summary | null;
  /** Dönem tamamlandı mı? */
  complete: boolean;
  /** Önceki dönemin ortalama döviz satışı (karşılaştırma için). */
  prevMean: { period: string; value: Decimal } | null;
  /** Dönem sonunda görülen değer, o güne kadarki tüm zamanların en yükseği mi? */
  endsAtAllTimeHigh: boolean;
  flat: boolean;
  sharpestRise?: { date: IsoDate; pct: Decimal } | null;
  sharpestFall?: { date: IsoDate; pct: Decimal } | null;
}

function periodLabel(period: string): string {
  return period.length === 7 ? formatMonth(period) : `${period} yılı`;
}

export function periodIntro(f: PeriodFacts): string[] {
  const info = CURRENCY_INFO[f.currency];
  const label = periodLabel(f.period);
  const s = f.selling;
  const out: string[] = [];
  out.push(`${label} boyunca TCMB ${s.count} iş gününde ${info.lower} kuru belirledi${f.complete ? '' : ' (dönem devam ediyor)'}.`);
  if (f.flat) {
    out.push(`Dönem boyunca döviz satış kuru ${tl(s.first.value)} düzeyinde sabit kaldı; günlük değişim yok.`);
    return out;
  }
  const dir = direction(s.changePct)!;
  out.push(
    dir === 'flat'
      ? `Döviz satış kuru dönemi ${tl(s.first.value)} ile açtı ve aynı düzeyde, ${tl(s.last.value)} ile kapattı.`
      : `Döviz satış kuru dönemi ${tl(s.first.value)} ile açıp ${tl(s.last.value)} ile kapattı; ilk gözleme göre ${dir === 'up' ? '▲' : '▼'} ${pctText(s.changePct!)}.`,
  );
  out.push(`En yüksek değer ${tl(s.max.value)} ile ${formatDate(s.max.date)}, en düşük değer ${tl(s.min.value)} ile ${formatDate(s.min.date)} tarihinde görüldü; dönem ortalaması ${tl(s.mean.round(4))} (Döviz Arşiv hesaplaması).`);
  if (f.prevMean) {
    const pct = percentChange(f.prevMean.value, s.mean)!;
    const d = direction(pct)!;
    out.push(
      d === 'flat'
        ? `Ortalama, ${periodLabel(f.prevMean.period)} ortalamasıyla aynı düzeyde.`
        : `Ortalama, ${periodLabel(f.prevMean.period)} ortalamasına göre ${pctText(pct)} ${d === 'up' ? 'yüksek' : 'düşük'}.`,
    );
  }
  if (f.sharpestRise && f.sharpestFall) {
    out.push(`En sert günlük yükseliş ${formatDate(f.sharpestRise.date)} tarihinde (▲ ${pctText(f.sharpestRise.pct)}), en sert düşüş ${formatDate(f.sharpestFall.date)} tarihinde (▼ ${pctText(f.sharpestFall.pct)}) yaşandı.`);
  }
  if (f.endsAtAllTimeHigh) out.push(`Dönemin son değeri, ${info.lower} döviz satış kurunun o güne kadarki en yüksek düzeyiydi.`);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------------------------------------------

export function joinTr(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}
