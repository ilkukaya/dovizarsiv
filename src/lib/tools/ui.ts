/**
 * Araç sayfalarının tarayıcı tarafı yardımcıları: güvenli DOM üretimi (innerHTML yok), hata metinleri ve sonuç sunumu.
 * Hesap mantığı DEĞİL, sunumdur; hesap `historical.ts` / `change.ts` / `compare.ts` içindedir.
 * Kullanıcı girdisi ve veri yalnızca textContent ile yazılır.
 */
import { CURRENCY_INFO, FIELD_LABELS } from '../../config/currencies.ts';
import { SOURCE_ATTRIBUTION } from '../../config/site.ts';
import { REDENOMINATION } from '../../config/evds-series.ts';
import { Decimal } from '../calculations/decimal.ts';
import { formatDate, formatDateLong, formatNumber } from '../formatting/format.ts';
import { paths } from '../seo/urls.ts';
import type { CurrencyCode } from '../providers/types.ts';
import type { HistoricalError, HistoricalResult, Unit } from './historical.ts';

type Child = Node | string | null | false | undefined;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | undefined> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) node.setAttribute(k, v);
  for (const c of children) if (c) node.append(c);
  return node;
}

export function clear(node: Element): void {
  node.replaceChildren();
}

export const DISCLAIMER =
  'Bu hesaplama TCMB gösterge niteliğindeki kurlarla bilgi amaçlıdır; banka, döviz bürosu veya kart işlemlerindeki kur farklı olabilir.';

export function unitName(unit: Unit): string {
  return unit === 'TRY' ? 'Türk lirası' : CURRENCY_INFO[unit].name;
}

export function unitLabel(unit: Unit, tl?: 'old' | 'new' | null): string {
  if (unit !== 'TRY') return unit;
  return tl === 'old' ? 'eski TL' : tl === 'new' ? 'yeni TL' : 'TL';
}

const ONE = Decimal.parse('1');

/**
 * Tutar gösterimi: ≥ 1 için 2 ondalık, daha küçükte 8'e kadar (küçük sonuçlar "0,00" görünmesin).
 * `oldTl`: eski TL (en çok 2 ondalık, gereksiz ",00" yok). `preNewTl`: 2005 öncesi yeni TL karşılığı (kuruşun altı kaybolmasın: 6'ya kadar).
 */
export function formatAmount(value: Decimal, mode: 'default' | 'oldTl' | 'preNewTl' = 'default'): string {
  if (mode === 'oldTl') return formatNumber(value, 0, 2);
  if (mode === 'preNewTl') return formatNumber(value, 2, 6);
  return value.abs().cmp(ONE) >= 0 || value.isZero() ? formatNumber(value, 2, 2) : formatNumber(value, 2, 8);
}

/** "100 USD = 588,27 TL" (ekran okuyucu duyurusu ve sonuç başlığı için tek kaynak). */
export function describeResult(result: HistoricalResult): string {
  const { preRedenomination: pre, tlUnit } = result;
  const amountText = `${formatNumber(result.amount, 0, 6)} ${unitLabel(result.from, result.from === 'TRY' && pre ? tlUnit : null)}`;
  const mode = result.to === 'TRY' && pre ? (tlUnit === 'old' ? 'oldTl' : 'preNewTl') : 'default';
  return `${amountText} = ${formatAmount(result.result, mode)} ${unitLabel(result.to, result.to === 'TRY' && pre ? tlUnit : null)}`;
}

/** Kur gösterimi: en az 4, en çok 8 ondalık (2005 öncesi kurlar 6 basamaklıdır; kesilmez). */
export function formatRateFull(value: Decimal): string {
  return formatNumber(value, 4, 8);
}

export function historicalErrorText(e: HistoricalError): string {
  switch (e.code) {
    case 'invalid_amount':
      return 'Tutarı rakamlarla girin (ör. 1.250,50). Boş ya da negatif tutar hesaplanamaz.';
    case 'same_unit':
      return 'Kaynak ve hedef birim aynı. Farklı bir hedef birim seçin.';
    case 'invalid_date':
      return 'Geçerli bir tarih seçin.';
    case 'before_coverage':
      return `${CURRENCY_INFO[e.currency].name} için TCMB verisi ${formatDate(e.firstDate)} tarihinde başlıyor. Daha eski bir tarih seçilemez.`;
    case 'after_last':
      return `Arşivdeki son kur belirlenme günü ${formatDate(e.lastDate)}. Bu tarihten sonrası seçilemez.`;
    case 'field_missing':
      return `${CURRENCY_INFO[e.currency].name} için ${FIELD_LABELS[e.field]} kuru ${formatDate(e.observationDate)} tarihli gözlemde yayımlanmamış. Başka bir kur türü seçin.`;
    case 'not_loaded':
      return 'Bu tarih için kur verisi bulunamadı.';
  }
}

function row(dl: HTMLElement, term: string, ...desc: Child[]): void {
  dl.append(el('div', { class: 'tool-result__row' }, el('dt', {}, term), el('dd', {}, ...desc)));
}

/** Kullanılan gözlemin gün/ay sayfası linki (gün sayfaları `dayStart`'tan itibaren vardır). */
export function observationLink(currency: CurrencyCode, observationDate: string, dayStart: string): HTMLAnchorElement {
  const toDay = observationDate >= dayStart;
  const href = toDay ? paths.day(observationDate) : paths.month(currency, observationDate.slice(0, 7));
  return el('a', { href }, toDay ? 'Gün sayfası' : 'Ay sayfası');
}

export function renderHistorical(result: HistoricalResult, options: { dayStart: string; compact?: boolean }): HTMLElement {
  const { preRedenomination: pre, tlUnit } = result;
  const headline = describeResult(result);
  const eq = headline.indexOf(' = ');

  const box = el('div', { class: 'tool-result__body' });
  box.append(el('p', { class: 'tool-result__headline' }, `${headline.slice(0, eq)} = `, el('strong', {}, headline.slice(eq + 3))));
  if (result.resultAlt) {
    const alt = result.resultAlt;
    box.append(el('p', { class: 'tool-result__alt' }, `Aynı sonuç ${alt.unit === 'old' ? 'eski TL' : 'yeni TL'} olarak: ${formatAmount(alt.value, alt.unit === 'old' ? 'oldTl' : 'preNewTl')} ${alt.unit === 'old' ? 'eski TL' : 'yeni TL'}.`));
  }

  const dl = el('dl', { class: 'tool-result__details' });
  row(dl, 'Seçilen tarih', formatDateLong(result.requestedDate));
  for (const leg of result.legs) {
    row(
      dl,
      result.legs.length > 1 ? `${leg.currency} kur günü` : 'Kullanılan kur günü',
      formatDateLong(leg.observationDate),
      leg.exact ? ' (TCMB bu günde kur belirledi)' : el('strong', {}, ' (seçtiğiniz günde TCMB kur belirlemedi; en yakın önceki belirlenme günü kullanıldı)'),
      !options.compact && ' · ',
      !options.compact && observationLink(leg.currency, leg.observationDate, options.dayStart),
    );
  }
  for (const leg of result.legs) {
    const oldTlNote = pre ? ` (eski TL: ${formatNumber(leg.rate.shiftRight(REDENOMINATION.factorExponent), 0, 2)})` : '';
    row(dl, `${leg.currency} ${FIELD_LABELS[leg.field]}`, `${formatRateFull(leg.rate)} TL${oldTlNote}`);
  }
  if (result.legs.length === 1) {
    const leg = result.legs[0]!;
    const op = leg.direction === 'tryToForeign' ? '÷' : '×';
    const shown = result.from === 'TRY' && pre && tlUnit === 'old' ? result.amount.shiftLeft(REDENOMINATION.factorExponent) : result.amount;
    const inputNote = result.from === 'TRY' && pre && tlUnit === 'old' ? ' (eski TL tutar 1.000.000’a bölünerek yeni TL’ye çevrildi)' : '';
    row(dl, 'Formül', `${result.formula}: ${formatNumber(shown, 0, 6)} ${op} ${formatRateFull(leg.rate)}${inputNote}`);
  } else {
    row(dl, 'Formül', result.formula);
  }
  box.append(dl);

  box.append(el('p', { class: 'small muted' }, `${SOURCE_ATTRIBUTION} Sonuç Döviz Arşiv hesaplamasıdır; TCMB tarafından yayımlanmamıştır. ${DISCLAIMER}`));
  if (pre) box.append(el('p', { class: 'small muted' }, '2005 öncesi kurlar 1 YTL = 1.000.000 TL dönüşümüyle yeni TL’ye çevrilmiştir.'));
  return box;
}

/** Araç formunun durum satırları: görünür mesaj (yükleniyor/hata), ekran okuyucu duyurusu ve sonuç alanı. */
export interface ToolPanels {
  message: HTMLElement;
  announce: HTMLElement;
  result: HTMLElement;
  button: HTMLButtonElement;
}

export function panelsOf(root: HTMLElement): ToolPanels {
  return {
    message: root.querySelector<HTMLElement>('[data-message]')!,
    announce: root.querySelector<HTMLElement>('[data-announce]')!,
    result: root.querySelector<HTMLElement>('[data-result]')!,
    button: root.querySelector<HTMLButtonElement>('button[type="submit"]')!,
  };
}

export function showBusy(p: ToolPanels, text: string): void {
  p.button.disabled = true;
  p.result.setAttribute('aria-busy', 'true');
  p.message.classList.remove('tool-message--error');
  p.message.textContent = text;
}

export function showError(p: ToolPanels, text: string): void {
  p.button.disabled = false;
  p.result.removeAttribute('aria-busy');
  clear(p.result);
  p.announce.textContent = '';
  p.message.classList.add('tool-message--error');
  p.message.textContent = text;
}

export function showResult(p: ToolPanels, body: HTMLElement, spoken: string): void {
  p.button.disabled = false;
  p.result.removeAttribute('aria-busy');
  p.message.classList.remove('tool-message--error');
  p.message.textContent = '';
  p.result.replaceChildren(body);
  // Aynı metin iki kez gelirse okuyucu yeniden duyursun diye önce boşaltılır.
  p.announce.textContent = '';
  requestAnimationFrame(() => {
    p.announce.textContent = spoken;
  });
}

export const LOAD_FAILED = 'Kur verisi yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.';
