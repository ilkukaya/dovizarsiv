/** Kur değişimi sonucunun sunumu (SPEC §6.9): iki gözlem, fark, yüzde, gün sayısı, basit SVG grafik + tablo alternatifi. */
import { CURRENCY_INFO, FIELD_LABELS } from '../../config/currencies.ts';
import { SOURCE_ATTRIBUTION } from '../../config/site.ts';
import { buildChart, CHART_PADDING } from '../charts/svg.ts';
import { formatChange, formatDate, formatDateLong, formatNumber } from '../formatting/format.ts';
import { paths } from '../seo/urls.ts';
import type { ChangeError, ChangeResult, Endpoint } from './change.ts';
import { DISCLAIMER, el, formatRateFull } from './ui.ts';

export function changeErrorText(e: ChangeError): string {
  switch (e.code) {
    case 'invalid_date':
      return 'Başlangıç ve bitiş için geçerli tarihler seçin.';
    case 'order':
      return 'Başlangıç tarihi bitiş tarihinden sonra olamaz.';
    case 'before_coverage':
      return `Bu para birimi için TCMB verisi ${formatDate(e.firstDate)} tarihinde başlıyor. Daha eski bir başlangıç seçilemez.`;
    case 'after_last':
      return `Arşivdeki son kur belirlenme günü ${formatDate(e.lastDate)}. Bu tarihten sonrası seçilemez.`;
    case 'field_missing':
      return `Seçtiğiniz kur türü ${formatDate(e.observationDate)} tarihli gözlemde yayımlanmamış. Döviz alış ya da satış gibi başka bir kur türü seçin.`;
    case 'not_loaded':
      return 'Bu tarihler için kur verisi bulunamadı.';
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>, text?: string): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
}

function xLabelFor(spanDays: number): (d: string) => string {
  return spanDays <= 800 ? (d) => `${d.slice(8)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : (d) => d.slice(0, 4);
}

function endpointCell(e: Endpoint): Array<Node | string> {
  return [
    `${formatRateFull(e.value)} TL`,
    el('br'),
    el('span', { class: 'muted small' }, e.exact ? `${formatDateLong(e.observationDate)}` : `${formatDate(e.requestedDate)} için TCMB kur belirlemedi; kullanılan gün: ${formatDateLong(e.observationDate)}`),
  ];
}

export function renderChange(r: ChangeResult): HTMLElement {
  const info = CURRENCY_INFO[r.currency];
  const label = `${info.short} ${FIELD_LABELS[r.field].toLowerCase()} kuru`;
  const box = el('div', { class: 'tool-result__body' });

  box.append(
    el('p', { class: 'tool-result__headline' }, `${label}: `, el('strong', {}, `${formatRateFull(r.start.value)} TL → ${formatRateFull(r.end.value)} TL`), ` (${formatChange(r.percent)})`),
  );

  const table = el('table', { class: 'data-table' });
  table.append(el('caption', { class: 'visually-hidden' }, `${label} değişimi`));
  table.append(el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Ölçü'), el('th', { scope: 'col', class: 'num' }, 'Değer'))));
  const body = el('tbody');
  const line = (name: string, ...cells: Array<Node | string>) => body.append(el('tr', {}, el('th', { scope: 'row' }, name), el('td', { class: 'num' }, ...cells)));
  line('Başlangıç', ...endpointCell(r.start));
  line('Bitiş', ...endpointCell(r.end));
  line('Fark (bitiş − başlangıç)', `${formatNumber(r.difference, 4, 8)} TL`);
  line('Yüzde değişim', r.percent ? formatChange(r.percent, 2) : '—');
  line('Aradaki takvim günü', formatNumber(String(r.calendarDays), 0, 0));
  line('Aralıktaki gözlem sayısı', formatNumber(String(r.points.length), 0, 0));
  table.append(body);
  box.append(el('div', { class: 'table-scroll' }, table));

  const g = buildChart(r.points, { xLabel: xLabelFor(r.calendarDays) });
  if (g) {
    const title = `${label}, ${formatDate(r.start.observationDate)} – ${formatDate(r.end.observationDate)}`;
    const min = r.points.reduce((a, b) => (b.value < a.value ? b : a));
    const max = r.points.reduce((a, b) => (b.value > a.value ? b : a));
    const summary = `Aralıktaki en düşük değer ${formatNumber(String(min.value), 4, 8)} TL (${formatDate(min.date)}), en yüksek değer ${formatNumber(String(max.value), 4, 8)} TL (${formatDate(max.date)}).`;
    const s = svg('svg', { viewBox: `0 0 ${g.width} ${g.height}`, role: 'img', 'aria-labelledby': 'degisim-grafik-baslik degisim-grafik-ozet' });
    s.append(svg('title', { id: 'degisim-grafik-baslik' }, title), svg('desc', { id: 'degisim-grafik-ozet' }, summary));
    for (const t of g.yTicks) {
      s.append(svg('line', { class: 'chart__axis', x1: String(CHART_PADDING.left), x2: String(g.width - CHART_PADDING.right), y1: String(t.y), y2: String(t.y) }));
      s.append(svg('text', { class: 'chart__label', x: String(CHART_PADDING.left - 6), y: String(t.y + 4), 'text-anchor': 'end' }, t.label));
    }
    g.xTicks.forEach((t, i) => {
      // İlk ve son etiket grafiğin kenarında kesilmesin.
      const anchor = i === 0 ? 'start' : i === g.xTicks.length - 1 ? 'end' : 'middle';
      s.append(svg('text', { class: 'chart__label', x: String(t.x), y: String(g.height - 8), 'text-anchor': anchor }, t.label));
    });
    s.append(svg('path', { class: 'chart__line', d: g.path }));
    box.append(el('figure', { class: 'chart' }, s, el('figcaption', {}, el('strong', {}, `${title}.`), ` ${summary} Uzun aralıklarda grafik, uç değerleri koruyarak seyreltilir.`)));
  }

  box.append(
    el('p', { class: 'small' }, 'Ayrıntılı günlük değerler: ', el('a', { href: paths.month(r.currency, r.end.observationDate.slice(0, 7)) }, 'bitiş ayının tablosu'), ' · ', el('a', { href: paths.year(r.currency, r.end.observationDate.slice(0, 4)) }, 'bitiş yılının özeti')),
  );
  box.append(el('p', { class: 'small muted' }, `${SOURCE_ATTRIBUTION} Fark ve yüzde Döviz Arşiv hesaplamasıdır; TCMB yayımlamamıştır. Bu bir kur değişimi göstergesidir, yatırım getirisi ya da tavsiyesi değildir. ${DISCLAIMER}`));
  if (r.start.observationDate < '2005-01-01') box.append(el('p', { class: 'small muted' }, '2005 öncesi kurlar 1 YTL = 1.000.000 TL dönüşümüyle yeni TL’ye çevrilmiştir.'));
  return box;
}
