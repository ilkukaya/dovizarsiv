/**
 * Araçlar için yıllık küçük JSON parçaları (SPEC §4.6: tarayıcıya büyük veri gönderilmez; yalnızca gereken yıl lazy load edilir).
 * Biçim: { year, source, attribution, dateConvention, fields, rows: [[belirlenme, evds, para, alış, satış, ef.alış, ef.satış], …] }
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { CURRENCY_ORDER } from '../../../config/currencies.ts';
import { SOURCE_ATTRIBUTION } from '../../../config/site.ts';
import { allYears, periodObservations } from '../../../lib/data/store.ts';

export const getStaticPaths: GetStaticPaths = () => allYears().map((year) => ({ params: { year: String(year) } }));

export const GET: APIRoute = ({ params }) => {
  const year = params.year!;
  const rows = CURRENCY_ORDER.flatMap((c) =>
    periodObservations(c, year).map((o) => [o.date, o.sourceDate, c, o.forexBuying ?? null, o.forexSelling ?? null, o.cashBuying ?? null, o.cashSelling ?? null]),
  ).sort((a, b) => (String(a[0]) < String(b[0]) ? -1 : String(a[0]) > String(b[0]) ? 1 : 0));
  const body = {
    year: Number(year),
    source: 'TCMB_EVDS',
    attribution: SOURCE_ATTRIBUTION,
    unit: 'TRY',
    dateConvention: 'determination-date',
    fields: ['date', 'sourceDate', 'currency', 'forexBuying', 'forexSelling', 'cashBuying', 'cashSelling'],
    rows,
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
