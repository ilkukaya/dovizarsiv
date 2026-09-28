/**
 * Bağımsız doğrulama için: sitenin kullandığı dönem özetlerini (periodSummary) JSON olarak basar.
 * scripts/validation/independent-recompute.py aynı dönemleri data/normalized'dan Python Decimal ile ayrı hesaplar ve karşılaştırır.
 * Çalıştırma: npm run verify:stats
 */
import { periodSummary } from '../../src/lib/data/store.ts';
import type { CurrencyCode, RateField } from '../../src/lib/providers/types.ts';

export const PERIODS: Array<[CurrencyCode, string]> = [
  ['USD', '2020'],
  ['USD', '2020-01'],
  ['EUR', '2015'],
  ['EUR', '1999'],
  ['GBP', '2010-03'],
  ['GBP', '1985'],
  ['USD', '1999-06'],
  ['USD', '2004'],
  ['USD', '2005'],
  ['USD', '2005-01'],
  ['EUR', '2024'],
  ['USD', '2026'],
];
const FIELDS: RateField[] = ['forexBuying', 'forexSelling', 'cashBuying', 'cashSelling'];

const out = PERIODS.map(([currency, prefix]) => {
  const s = periodSummary(currency, prefix);
  const fields: Record<string, unknown> = {};
  for (const f of FIELDS) {
    const x = s[f];
    if (!x) continue;
    fields[f] = {
      count: x.count,
      first: [x.first.date, x.first.value.toString()],
      last: [x.last.date, x.last.value.toString()],
      min: [x.min.date, x.min.value.toString()],
      max: [x.max.date, x.max.value.toString()],
      mean4: x.mean.round(4).toString(),
      changePct2: x.changePct ? x.changePct.round(2).toString() : null,
    };
  }
  return { currency, prefix, fields };
});
console.log(JSON.stringify(out));
