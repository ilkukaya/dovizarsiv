/** Yıl karşılaştırma tablolarının sunumu (SPEC §6.9). Değerler yıl sayfalarıyla aynı tanımdadır. */
import { CURRENCY_INFO, FIELD_LABELS } from '../../config/currencies.ts';
import { SOURCE_ATTRIBUTION } from '../../config/site.ts';
import { formatChange, formatDate, formatNumber } from '../formatting/format.ts';
import { paths } from '../seo/urls.ts';
import type { RateField } from '../providers/types.ts';
import type { CompareTable } from './compare.ts';
import { DISCLAIMER, el, formatRateFull } from './ui.ts';

export function renderCompare(tables: CompareTable[], field: RateField): HTMLElement {
  const box = el('div', { class: 'tool-result__body' });
  for (const t of tables) {
    const info = CURRENCY_INFO[t.currency];
    box.append(el('h3', {}, `${info.short} ${FIELD_LABELS[field].toLowerCase()} kuru`));
    if (t.rows.length === 0) {
      box.append(el('p', { class: 'muted' }, `Seçtiğiniz yıllarda ${info.name} için bu kur türünde TCMB verisi yok.`));
      continue;
    }
    const table = el('table', { class: 'data-table' });
    table.append(el('caption', { class: 'visually-hidden' }, `${info.short} ${FIELD_LABELS[field].toLowerCase()} kuru, yıllara göre (TL)`));
    table.append(
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          el('th', { scope: 'col' }, 'Yıl'),
          el('th', { scope: 'col', class: 'num' }, 'Gözlem'),
          el('th', { scope: 'col', class: 'num' }, 'Ortalama'),
          el('th', { scope: 'col', class: 'num' }, 'En düşük'),
          el('th', { scope: 'col', class: 'num' }, 'En yüksek'),
          el('th', { scope: 'col', class: 'num' }, 'Yıl sonu'),
          el('th', { scope: 'col', class: 'num' }, 'İlk → son'),
        ),
      ),
    );
    const body = el('tbody');
    for (const r of t.rows) {
      const cell = (value: string, date?: string) =>
        el('td', { class: 'num' }, value, date ? el('br') : null, date ? el('span', { class: 'muted small' }, formatDate(date)) : null);
      body.append(
        el(
          'tr',
          {},
          el('th', { scope: 'row' }, el('a', { href: paths.year(t.currency, r.year) }, String(r.year))),
          el('td', { class: 'num' }, formatNumber(String(r.count), 0, 0)),
          cell(formatRateFull(r.summary.mean.round(4))),
          cell(formatRateFull(r.summary.min.value), r.summary.min.date),
          cell(formatRateFull(r.summary.max.value), r.summary.max.date),
          cell(formatRateFull(r.yearEnd.value), r.yearEnd.date),
          el('td', { class: 'num' }, formatChange(r.summary.changePct)),
        ),
      );
    }
    table.append(body);
    box.append(el('div', { class: 'table-scroll' }, table));
    if (t.emptyYears.length) box.append(el('p', { class: 'small muted' }, `Bu para biriminde veri bulunmayan yıllar: ${t.emptyYears.join(', ')}.`));
  }
  box.append(
    el(
      'p',
      { class: 'small muted' },
      `${SOURCE_ATTRIBUTION} Ortalama, en düşük, en yüksek, yıl sonu ve değişim Döviz Arşiv hesaplamasıdır; TCMB yayımlamamıştır. Ortalama, kur belirlenen günlerin aritmetik ortalamasıdır. Yıl sonu, yılın son belirlenme günüdür. 2005 öncesi değerler 1 YTL = 1.000.000 TL ile yeni TL’ye çevrilmiştir. ${DISCLAIMER}`,
    ),
  );
  return box;
}
