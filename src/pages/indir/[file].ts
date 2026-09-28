/**
 * CSV indirme (SPEC §6.4). Kaynak gösterimi dosyanın içinde de bulunur (SPEC §4.2).
 * Sütunlar: belirlenme tarihi, EVDS (geçerlilik) tarihi, 4 kur (TRY), 2005 öncesi için eski TL ham değerler.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { CURRENCY_INFO, CURRENCY_ORDER } from '../../config/currencies.ts';
import { SITE, SOURCE_ATTRIBUTION } from '../../config/site.ts';
import { observationsOf } from '../../lib/data/store.ts';
import type { CurrencyCode } from '../../lib/providers/types.ts';
import { Decimal } from '../../lib/calculations/decimal.ts';

export const getStaticPaths: GetStaticPaths = () =>
  CURRENCY_ORDER.map((code) => ({ params: { file: `${CURRENCY_INFO[code].slug}-kuru-arsivi.csv` }, props: { code } }));

export const GET: APIRoute = ({ props }) => {
  const code = props.code as CurrencyCode;
  const lines: string[] = [
    `# ${SOURCE_ATTRIBUTION}`,
    `# ${SITE.name} (${SITE.url}) tarafından yeniden düzenlenmiştir. Ücretsizdir; kullanırken kaynak olarak TCMB EVDS'yi belirtin.`,
    `# ${CURRENCY_INFO[code].name} (${code}), 1 birim karşılığı Türk lirası. Ondalık ayırıcı nokta.`,
    '# belirlenme_tarihi: TCMB\'nin kuru 15.30\'da belirlediği gün. evds_tarihi: kurun geçerli olduğu gün (EVDS satır tarihi).',
    '# 2005 öncesi değerler 1 YTL = 1.000.000 TL ile yeni TL\'ye çevrilmiştir (Döviz Arşiv hesaplaması); eski_tl_* sütunları kaynaktaki eski TL değerleridir.',
    'belirlenme_tarihi,evds_tarihi,doviz_alis,doviz_satis,efektif_alis,efektif_satis,eski_tl_doviz_alis,eski_tl_doviz_satis',
  ];
  for (const o of observationsOf(code)) {
    const old = o.normalization ? [o.raw.forexBuying ?? '', o.raw.forexSelling ?? ''] : ['', ''];
    lines.push([o.date, o.sourceDate, o.forexBuying ?? '', o.forexSelling ?? '', o.cashBuying ?? '', o.cashSelling ?? '', ...old.map((v) => (v ? Decimal.parse(v).toString() : ''))].join(','));
  }
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
};
