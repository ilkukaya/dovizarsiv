/**
 * Rastgele 10 tarihte (farklı yıllardan) yerel veriyi EVDS'ye doğrudan sorarak birebir karşılaştırır (SPEC §11.6).
 * Ham (arşiv) değerler string olarak, .YTL değerleri normalize değerle sayısal olarak eşleşmeli.
 * Seçenek: --seed=123 (tekrarlanabilir seçim), --count=10
 */
import { appendFileSync } from 'node:fs';
import { allCrosscheckCodes, allRawCodes, EVDS_SERIES } from '../../src/config/evds-series.ts';
import { Decimal } from '../../src/lib/calculations/decimal.ts';
import { createEvdsProviderFromEnv } from '../../src/lib/providers/evds.ts';
import { CURRENCIES, RATE_FIELDS } from '../../src/lib/providers/types.ts';
import type { Observation } from '../../src/lib/data/model.ts';
import { loadEnv, parseArgs } from '../data/lib/env.ts';
import { readAllObservations } from '../data/lib/storage.ts';

/** Basit tekrarlanabilir PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main(): Promise<void> {
  loadEnv();
  const { options } = parseArgs(process.argv.slice(2));
  const seed = Number(options.get('seed') ?? Date.now() % 1_000_000);
  const count = Number(options.get('count') ?? 10);
  const random = rng(seed);
  const observations = readAllObservations();
  const bySource = new Map<string, Observation[]>();
  for (const o of observations) bySource.set(o.sourceDate, [...(bySource.get(o.sourceDate) ?? []), o]);
  const years = [...new Set([...bySource.keys()].map((d) => d.slice(0, 4)))].sort();

  // Katmanlı seçim: eski dönem (<1990), 1990–2004 (eski TL + efektif), 2005 sonrası.
  const strata: Array<[string, string, number]> = [['0000', '1989', 3], ['1990', '2004', 3], ['2005', '9999', count - 6]];
  const chosenYears: string[] = [];
  for (const [from, to, k] of strata) {
    const pool = years.filter((y) => y >= from && y <= to && !chosenYears.includes(y));
    for (let i = 0; i < k && pool.length > 0; i++) chosenYears.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
  }
  const dates = chosenYears.sort().map((year) => {
    const inYear = [...bySource.keys()].filter((d) => d.startsWith(year));
    return inYear[Math.floor(random() * inYear.length)]!;
  });

  const provider = createEvdsProviderFromEnv();
  const lines = [
    `### EVDS birebir karşılaştırması (seed=${seed})`,
    '',
    '| # | EVDS tarihi | Belirlenme günü (site) | Karşılaştırılan değer | Eşleşen | USD döviz alış: EVDS ham / site ham / site TRY | Sonuç |',
    '|---|---|---|---|---|---|---|',
  ];
  let failures = 0;
  for (const [i, sourceDate] of dates.entries()) {
    const raw = await provider.fetchRows(allRawCodes().slice(0, 6), sourceDate, sourceDate);
    const raw2 = await provider.fetchRows(allRawCodes().slice(6), sourceDate, sourceDate);
    const ytl = await provider.fetchRows(allCrosscheckCodes().slice(0, 6), sourceDate, sourceDate);
    const ytl2 = await provider.fetchRows(allCrosscheckCodes().slice(6), sourceDate, sourceDate);
    const values = { ...raw[0]?.values, ...raw2[0]?.values, ...ytl[0]?.values, ...ytl2[0]?.values };
    const ours = bySource.get(sourceDate) ?? [];
    let compared = 0;
    let matched = 0;
    for (const currency of CURRENCIES) {
      const obs = ours.find((o) => o.currency === currency);
      for (const field of RATE_FIELDS) {
        const codes = EVDS_SERIES[currency][field];
        const evdsRaw = values[codes.raw] ?? null;
        const evdsYtl = values[codes.crosscheck] ?? null;
        const siteRaw = obs?.raw[field] ?? null;
        const siteTry = obs?.[field] ?? null;
        if (evdsRaw === null && siteRaw === null) continue;
        compared++;
        const rawOk = evdsRaw === siteRaw;
        // .YTL, EVDS'de 8 basamağa yuvarlanmış karşılıktır (DECISIONS D-005); yuvarlama farkı eşleşme sayılır.
        const ytlOk =
          evdsYtl === null ||
          (siteTry !== null &&
            (Decimal.parse(evdsYtl).eq(Decimal.parse(siteTry)) ||
              Decimal.parse(siteTry).roundHalfUp(8).eq(Decimal.parse(evdsYtl)) ||
              Decimal.parse(siteTry).round(8).eq(Decimal.parse(evdsYtl))));
        if (rawOk && ytlOk) matched++;
        else console.error(`  ${sourceDate} ${currency}.${field}: EVDS ham=${evdsRaw} ytl=${evdsYtl} / site ham=${siteRaw} try=${siteTry}`);
      }
    }
    const usd = ours.find((o) => o.currency === 'USD');
    const ok = compared > 0 && matched === compared;
    if (!ok) failures++;
    lines.push(
      `| ${i + 1} | ${sourceDate} | ${usd?.date ?? '—'} | ${compared} | ${matched} | ${values[EVDS_SERIES.USD.forexBuying.raw] ?? '-'} / ${usd?.raw.forexBuying ?? '-'} / ${usd?.forexBuying ?? '-'} | ${ok ? '✅' : '❌'} |`,
    );
  }
  lines.push('', `**Sonuç:** ${dates.length} tarih, ${dates.length - failures} birebir eşleşme, ${failures} fark.`);
  const output = lines.join('\n') + '\n';
  console.log(output);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, output);
  if (failures > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(`verify:evds-spot BAŞARISIZ: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
