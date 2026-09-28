/**
 * npm run data:discover — EVDS metadata'sını registry ile karşılaştırır (SPEC §4.5).
 * Seri kodları, adlar, frekans, birim, ilk/son gözlem. Uyuşmazlıkta çıkış kodu 1.
 * Çıktı: data/metadata/series.json
 *
 * Ek modlar:
 *   --latest                 Son satırları ve EVDS'nin en güncel tarihini zaman damgasıyla basar.
 *   --watch --until=HH:MM    (UTC) Yeni belirlenen kurun EVDS'ye düştüğü anı ölçmek için 5 dakikada bir yoklar.
 */
import { EVDS_DATAGROUPS, EVDS_SERIES } from '../../src/config/evds-series.ts';
import { addDays, todayIstanbul, todayUtc, weekday } from '../../src/lib/data/dates.ts';
import { createEvdsProviderFromEnv, type EvdsProvider } from '../../src/lib/providers/evds.ts';
import { CURRENCIES, RATE_FIELDS, type SeriesMetadata } from '../../src/lib/providers/types.ts';
import { loadEnv, parseArgs } from './lib/env.ts';
import { metadataPath, writeJsonAtomic } from './lib/storage.ts';

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

async function discover(provider: EvdsProvider): Promise<number> {
  const problems: string[] = [];
  const groups: Record<string, unknown> = {};
  const seriesByGroup = new Map<string, SeriesMetadata[]>();
  for (const expected of Object.values(EVDS_DATAGROUPS)) {
    const meta = await provider.fetchDatagroup(expected.code);
    groups[expected.code] = meta;
    if (meta.name !== expected.name) problems.push(`${expected.code}: ad "${meta.name}", beklenen "${expected.name}"`);
    if (meta.frequency !== expected.frequency) problems.push(`${expected.code}: frekans ${meta.frequency}`);
    if (meta.unit !== expected.unit) problems.push(`${expected.code}: birim "${meta.unit}", beklenen "${expected.unit}"`);
    console.log(`${expected.code} "${meta.name}" ${meta.frequency} birim="${meta.unit}" ${meta.startDate}…${meta.endDate} (güncelleme ${meta.lastUpdated})`);
    if (meta.note) console.log(`  not: ${meta.note.trim()}`);
    seriesByGroup.set(expected.code, await provider.fetchSeriesList(expected.code));
  }

  const series: Record<string, SeriesMetadata & { role: 'raw' | 'crosscheck'; currency: string; field: string }> = {};
  for (const currency of CURRENCIES) {
    for (const field of RATE_FIELDS) {
      const entry = EVDS_SERIES[currency][field];
      const isCash = field.startsWith('cash');
      const rawGroup = isCash ? EVDS_DATAGROUPS.cashRaw.code : EVDS_DATAGROUPS.forexRaw.code;
      const ytlGroup = isCash ? EVDS_DATAGROUPS.cashCrosscheck.code : EVDS_DATAGROUPS.forexCrosscheck.code;
      for (const [role, code, group, nameIncludes] of [
        ['raw', entry.raw, rawGroup, entry.rawNameIncludes],
        ['crosscheck', entry.crosscheck, ytlGroup, entry.crosscheckNameIncludes],
      ] as const) {
        const meta = seriesByGroup.get(group)?.find((s) => s.code === code);
        if (!meta) {
          problems.push(`${currency}.${field}: ${code} seri kodu ${group} grubunda yok`);
          continue;
        }
        if (!squash(meta.name).includes(squash(nameIncludes))) problems.push(`${code}: ad "${meta.name}" "${nameIncludes}" içermiyor`);
        if (!squash(meta.name).includes(`(${currency})`)) problems.push(`${code}: ad "${meta.name}" (${currency}) içermiyor`);
        if (meta.frequency !== 'GÜNLÜK') problems.push(`${code}: frekans ${meta.frequency}`);
        series[code] = { ...meta, role, currency, field };
        console.log(`  ${currency} ${field.padEnd(12)} ${role.padEnd(10)} ${code.padEnd(20)} ${meta.startDate}…${meta.endDate}  ${squash(meta.name)}`);
      }
    }
  }

  writeJsonAtomic(metadataPath('series.json'), { datagroups: groups, series });
  if (problems.length > 0) {
    for (const p of problems) console.error(`UYUŞMAZLIK: ${p}`);
    console.error(`data:discover BAŞARISIZ: ${problems.length} uyuşmazlık. Registry (src/config/evds-series.ts) ile EVDS metadata'sı farklı.`);
    return 1;
  }
  console.log('data:discover TAMAM: registry EVDS metadata ile uyumlu.');
  return 0;
}

async function latestRows(provider: EvdsProvider, days = 10): Promise<Array<{ sourceDate: string; raw: string | null; ytl: string | null }>> {
  const end = addDays(todayUtc(), 7);
  const start = addDays(todayUtc(), -days);
  const codes = [EVDS_SERIES.USD.forexBuying.raw, EVDS_SERIES.USD.forexBuying.crosscheck];
  const rows = await provider.fetchRows(codes, start, end);
  return rows
    .map((r) => ({ sourceDate: r.sourceDate, raw: r.values[codes[0]!] ?? null, ytl: r.values[codes[1]!] ?? null }))
    .filter((r) => r.raw !== null || r.ytl !== null);
}

async function latest(provider: EvdsProvider): Promise<number> {
  const rows = await latestRows(provider);
  console.log(`[${new Date().toISOString()}] EVDS son satırlar (USD döviz alış, ham / .YTL):`);
  for (const r of rows) console.log(`  ${r.sourceDate}  ${r.raw}  ${r.ytl}`);
  const meta = await provider.fetchDatagroup(EVDS_DATAGROUPS.forexCrosscheck.code);
  console.log(`  veri grubu END_DATE=${meta.endDate}`);
  return 0;
}

async function watch(provider: EvdsProvider, until: string): Promise<number> {
  const [hh, mm] = until.split(':').map(Number) as [number, number];
  const deadline = new Date();
  deadline.setUTCHours(hh, mm, 0, 0);
  const today = todayIstanbul();
  const initial = await latestRows(provider);
  const known = new Set(initial.map((r) => r.sourceDate));
  console.log(`[${new Date().toISOString()}] izleme başladı; bugün (TSİ) ${today}, gün ${weekday(today)}; bitiş ${deadline.toISOString()}`);
  console.log(`  mevcut son kaynak tarihi: ${initial[initial.length - 1]?.sourceDate ?? '-'}`);
  while (Date.now() < deadline.getTime()) {
    await new Promise((r) => setTimeout(r, 5 * 60_000));
    const rows = await latestRows(provider);
    const fresh = rows.filter((r) => !known.has(r.sourceDate));
    const stamp = new Date().toISOString();
    if (fresh.length === 0) {
      console.log(`[${stamp}] yeni satır yok (son: ${rows[rows.length - 1]?.sourceDate ?? '-'})`);
      continue;
    }
    for (const r of fresh) {
      console.log(`[${stamp}] YENİ SATIR: kaynak tarihi ${r.sourceDate} ham=${r.raw} ytl=${r.ytl}`);
      known.add(r.sourceDate);
    }
    if (fresh.some((r) => r.sourceDate > today && r.raw !== null && r.ytl !== null)) {
      console.log(`[${stamp}] Bugün belirlenen kur EVDS'de (ham ve .YTL). İzleme bitti.`);
      return 0;
    }
  }
  console.log(`[${new Date().toISOString()}] süre doldu; bugün belirlenen kur henüz EVDS'de görünmedi.`);
  return 0;
}

async function main(): Promise<void> {
  loadEnv();
  const { flags, options } = parseArgs(process.argv.slice(2));
  const provider = createEvdsProviderFromEnv((m) => console.log(`  ${m}`));
  let code: number;
  if (flags.has('watch')) code = await watch(provider, options.get('until') ?? '17:00');
  else if (flags.has('latest')) code = await latest(provider);
  else code = await discover(provider);
  process.exit(code);
}

main().catch((error: unknown) => {
  console.error(`data:discover BAŞARISIZ: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
