/**
 * npm run data:stats — türetilmiş istatistikler (SPEC §4.5, §5). Tümü "Döviz Arşiv hesaplaması"dır.
 * Tarih konvansiyonu: belirlenme günü (Observation.date). Ay/yıl gruplaması bu tarihe göredir.
 *
 * Çıktılar:
 *   data/aggregate/<CUR>/monthly.json, yearly.json, records.json
 *   data/metadata/anomalies.json  (günlük değişimi eşiği aşan günler; otomatik silme YOK)
 *   data/metadata/flat-months.json (kurun ay boyunca hiç değişmediği aylar → Faz 2'de noindex,follow)
 * Seçenek: --threshold=5  (anomali eşiği, yüzde)
 */
import { Decimal, percentChange } from '../../src/lib/calculations/decimal.ts';
import { dailyChanges, isFlat, seriesOf, summarize, type DailyChange, type Point, type Summary } from '../../src/lib/calculations/stats.ts';
import { monthKey, type IsoDate } from '../../src/lib/data/dates.ts';
import type { Observation } from '../../src/lib/data/model.ts';
import { CURRENCIES, RATE_FIELDS, type CurrencyCode, type RateField } from '../../src/lib/providers/types.ts';
import { parseArgs } from './lib/env.ts';
import { aggregatePath, metadataPath, readAllObservations, writeJsonAtomic } from './lib/storage.ts';

type FieldSummaries = Partial<Record<RateField, Summary>>;

interface PeriodStats {
  key: string;
  count: number;
  /** Döviz alış ve satış dönem boyunca hiç değişmedi mi? */
  flat: boolean;
  fields: FieldSummaries;
  /** Dönemin son Döviz Satış gözlemi. */
  closingSelling: Point | null;
  /** Önceki dönemin son Döviz Satış gözlemine göre değişim (%). */
  closingChangePct: Decimal | null;
}

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    let list = map.get(key);
    if (!list) map.set(key, (list = []));
    list.push(item);
  }
  return map;
}

function periodStats(observations: readonly Observation[], currency: CurrencyCode, keyOf: (d: IsoDate) => string): PeriodStats[] {
  const own = observations.filter((o) => o.currency === currency);
  const groups = groupBy(own, (o) => keyOf(o.date));
  const out: PeriodStats[] = [];
  let prevClosing: Point | null = null;
  for (const [key, list] of [...groups].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const fields: FieldSummaries = {};
    for (const field of RATE_FIELDS) {
      const s = summarize(seriesOf(list, currency, field));
      if (s) fields[field] = s;
    }
    const buying = seriesOf(list, currency, 'forexBuying');
    const selling = seriesOf(list, currency, 'forexSelling');
    const closingSelling = selling[selling.length - 1] ?? null;
    out.push({
      key,
      count: list.length,
      flat: isFlat(buying) && isFlat(selling),
      fields,
      closingSelling,
      closingChangePct: prevClosing && closingSelling ? percentChange(prevClosing.value, closingSelling.value) : null,
    });
    if (closingSelling) prevClosing = closingSelling;
  }
  return out;
}

function topMoves(changes: readonly DailyChange[], n: number): { rises: DailyChange[]; falls: DailyChange[] } {
  const valid = changes.filter((c) => c.changePct !== null);
  const rises = [...valid].sort((a, b) => b.changePct!.cmp(a.changePct!)).filter((c) => !c.changePct!.isNegative() && !c.changePct!.isZero()).slice(0, n);
  const falls = [...valid].sort((a, b) => a.changePct!.cmp(b.changePct!)).filter((c) => c.changePct!.isNegative()).slice(0, n);
  return { rises, falls };
}

function main(): void {
  const { options } = parseArgs(process.argv.slice(2));
  const threshold = Decimal.parse(options.get('threshold') ?? '5');
  const observations = readAllObservations();
  if (observations.length === 0) throw new Error('Veri yok. Önce data:update çalıştırın.');
  const lastDate = observations[observations.length - 1]!.date;

  const anomalies: Array<DailyChange & { currency: CurrencyCode; field: RateField }> = [];
  const flatMonths: Record<string, string[]> = {};

  for (const currency of CURRENCIES) {
    const monthly = periodStats(observations, currency, monthKey);
    const yearly = periodStats(observations, currency, (d) => d.slice(0, 4));
    const selling = seriesOf(observations, currency, 'forexSelling');
    const sellingChanges = dailyChanges(selling);
    const byYear = groupBy(sellingChanges, (c) => c.date.slice(0, 4));

    writeJsonAtomic(aggregatePath(currency, 'monthly.json'), { currency, dateConvention: 'determination-date', lastDate, months: monthly });
    writeJsonAtomic(aggregatePath(currency, 'yearly.json'), {
      currency,
      dateConvention: 'determination-date',
      lastDate,
      years: yearly.map((y) => ({ ...y, ...topMoves(byYear.get(y.key) ?? [], 5) })),
    });

    const allTime: Partial<Record<RateField, { max: Point; min: Point }>> = {};
    for (const field of RATE_FIELDS) {
      const s = summarize(seriesOf(observations, currency, field));
      if (s) allTime[field] = { max: s.max, min: s.min };
    }
    writeJsonAtomic(aggregatePath(currency, 'records.json'), {
      currency,
      dateConvention: 'determination-date',
      lastDate,
      allTime,
      sharpestMoves: topMoves(sellingChanges, 10),
      sharpestMovesSince2000: topMoves(sellingChanges.filter((c) => c.date >= '2000-01-01'), 10),
    });

    flatMonths[currency] = monthly.filter((m) => m.flat).map((m) => m.key);

    for (const field of ['forexBuying', 'forexSelling'] as const) {
      for (const change of dailyChanges(seriesOf(observations, currency, field))) {
        if (change.changePct && change.changePct.abs().cmp(threshold) > 0) anomalies.push({ ...change, currency, field });
      }
    }
  }

  anomalies.sort((a, b) => b.changePct!.abs().cmp(a.changePct!.abs()));
  writeJsonAtomic(metadataPath('anomalies.json'), { thresholdPct: threshold.toString(), lastDate, count: anomalies.length, items: anomalies });
  const flatCounts = Object.fromEntries(Object.entries(flatMonths).map(([c, list]) => [c, list.length]));
  writeJsonAtomic(metadataPath('flat-months.json'), { lastDate, counts: flatCounts, months: flatMonths });

  // Konsol raporu
  console.log(`data:stats: ${observations.length} gözlem, son belirlenme günü ${lastDate}`);
  console.log(`\nSabit kurlu aylar (döviz alış ve satış ay boyunca değişmemiş) → Faz 2'de noindex,follow:`);
  for (const [currency, list] of Object.entries(flatMonths)) {
    const total = new Set(observations.filter((o) => o.currency === currency).map((o) => monthKey(o.date))).size;
    const since2000 = list.filter((m) => m >= '2000-01').length;
    console.log(`  ${currency}: ${list.length} / ${total} ay (2000 ve sonrası: ${since2000}); ilk ${list[0] ?? '-'}, son ${list[list.length - 1] ?? '-'}`);
  }
  console.log(`\nAnomali raporu: günlük değişimi |%${threshold.toString()}| eşiğini aşan ${anomalies.length} gözlem (döviz alış + satış)`);
  const byDecade = groupBy(anomalies, (a) => `${a.date.slice(0, 3)}0'lar ${a.currency}`);
  for (const [key, list] of [...byDecade].sort((a, b) => (a[0] < b[0] ? -1 : 1))) console.log(`  ${key}: ${list.length}`);
  console.log('\n  En büyük 40 hareket:');
  console.log('  | Belirlenme günü | Önceki gözlem | Para birimi | Alan | Önceki | Değer | Değişim % |');
  for (const a of anomalies.slice(0, 40)) {
    console.log(`  | ${a.date} | ${a.prevDate} | ${a.currency} | ${a.field} | ${a.prev.toString()} | ${a.value.toString()} | ${a.changePct!.round(2).toString()} |`);
  }
}

try {
  main();
} catch (error) {
  console.error(`data:stats BAŞARISIZ: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
