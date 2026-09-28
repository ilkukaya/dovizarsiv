/**
 * npm run data:update            → artımlı: son kayıtlı kaynak tarihinden 21 gün geriden (revizyon payı) bugüne
 * npm run data:update -- --full  → bilinçli tam yenileme (1950'den bugüne)
 * npm run data:update -- --since=YYYY-MM-DD
 *
 * Akış (SPEC §4.5): mevcut kapsamı oku → eksik aralığı iste → doğrula → normalize et → birleştir →
 * revizyonları tespit et → dosyaları atomik yaz → değişiklik özeti bas.
 * Hata güvenliği: EVDS erişilemezse ya da şüpheli boş yanıt dönerse HİÇBİR dosya yazılmaz.
 */
import { allCrosscheckCodes, allRawCodes, HISTORY_START } from '../../src/config/evds-series.ts';
import { addDays, todayIstanbul, type IsoDate } from '../../src/lib/data/dates.ts';
import { normalize } from '../../src/lib/data/normalize.ts';
import { createEvdsProviderFromEnv } from '../../src/lib/providers/evds.ts';
import type { SourceRow } from '../../src/lib/providers/types.ts';
import { crosscheck } from './lib/crosscheck.ts';
import { computeCoverage } from './lib/coverage.ts';
import { annotate, loadEnv, parseArgs } from './lib/env.ts';
import { mergeRows } from './lib/merge.ts';
import {
  appendRevisions,
  loadSourceStore,
  metadataPath,
  sha16,
  writeJsonAtomic,
  writeUnmapped,
  writeYearFiles,
} from './lib/storage.ts';

const REVISION_LOOKBACK_DAYS = 21;
/** EVDS, bir sonraki iş gününün satırını önceden yayımlar (D-006); ileriye doğru pay. */
const FORWARD_DAYS = 7;
/** Aynı anda en fazla bu kadar seri istenir (kılavuz: seriler birlikte istenebilir). */
const CODES_PER_REQUEST = 6;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Aynı tarih için farklı seri gruplarından gelen satırları birleştirir. */
function combine(parts: SourceRow[][]): SourceRow[] {
  const byDate = new Map<IsoDate, Record<string, string | null>>();
  for (const rows of parts) {
    for (const row of rows) {
      byDate.set(row.sourceDate, { ...(byDate.get(row.sourceDate) ?? {}), ...row.values });
    }
  }
  return [...byDate].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([sourceDate, values]) => ({ sourceDate, values }));
}

async function main(): Promise<void> {
  loadEnv();
  const { flags, options } = parseArgs(process.argv.slice(2));
  const full = flags.has('full');
  const dryRun = flags.has('dry-run');
  const now = new Date().toISOString();

  const store = loadSourceStore();
  const storedDates = [...store.keys()].sort();
  const lastStored = storedDates[storedDates.length - 1];

  let start: IsoDate;
  if (full) start = HISTORY_START;
  else if (options.has('since')) start = options.get('since')!;
  else if (lastStored) start = addDays(lastStored, -REVISION_LOOKBACK_DAYS);
  else throw new Error('Yerel veri yok. İlk çekim için: npm run data:update -- --full');
  const end = addDays(todayIstanbul(), FORWARD_DAYS);

  console.log(`data:update ${full ? '(TAM)' : '(artımlı)'} kaynak aralığı ${start} … ${end}; mevcut kaynak satırı: ${store.size}`);
  const provider = createEvdsProviderFromEnv((m) => console.log(`  ${m}`));

  const rawParts: SourceRow[][] = [];
  for (const codes of chunk(allRawCodes(), CODES_PER_REQUEST)) rawParts.push(await provider.fetchRows(codes, start, end));
  const rawRows = combine(rawParts);
  const ytlParts: SourceRow[][] = [];
  for (const codes of chunk(allCrosscheckCodes(), CODES_PER_REQUEST)) ytlParts.push(await provider.fetchRows(codes, start, end));
  const ytlRows = combine(ytlParts);

  const nonNull = rawRows.reduce((n, r) => n + Object.values(r.values).filter((v) => v !== null).length, 0);
  const storedInRange = storedDates.filter((d) => d >= start && d <= end).length;
  if (nonNull === 0 && storedInRange > 0) {
    throw new Error(`EVDS ${start}…${end} aralığı için hiç değer döndürmedi ama yerelde ${storedInRange} satır var. Güvenli durma; hiçbir dosya yazılmadı.`);
  }

  const merge = mergeRows(store, rawRows, now);
  const normalized = normalize(store, sha16);
  const check = crosscheck(rawRows, ytlRows);

  console.log('\nÖzet');
  console.log(`  eklenen değer: ${merge.added}, değişmeyen: ${merge.unchanged}, revizyon: ${merge.revisions.length}, kaynakta kaybolan: ${merge.disappeared.length}`);
  console.log(`  gözlem: ${normalized.observations.length}, reddedilen ham değer: ${normalized.issues.length}, eşlenmemiş baş satır: ${normalized.unmapped.length}`);
  console.log(`  çapraz kontrol (.YTL): ${check.comparisons} karşılaştırma, ${check.exact} tam eşleşme, ${check.roundingOnly.length} yalnızca 8-basamak yuvarlama, ${check.mismatches.length} UYUŞMAZLIK`);
  for (const r of merge.revisions.slice(0, 50)) console.log(`  REVİZYON ${r.sourceDate} ${r.seriesCode}: ${r.oldRaw} → ${r.newRaw}`);
  for (const d of merge.disappeared.slice(0, 50)) console.log(`  KAYBOLAN ${d.sourceDate} ${d.seriesCode} (saklanan ${d.storedRaw} korunuyor)`);
  for (const i of normalized.issues.slice(0, 50)) console.log(`  REDDEDİLDİ ${i.sourceDate} ${i.seriesCode}="${i.raw}" (${i.problem})`);

  if (dryRun) {
    console.log('\n--dry-run: dosya yazılmadı.');
    return;
  }

  const changedYears = writeYearFiles(normalized.observations);
  writeUnmapped(store, normalized.unmapped);
  appendRevisions(merge.revisions);
  writeJsonAtomic(metadataPath('coverage.json'), computeCoverage(normalized.observations));
  writeJsonAtomic(metadataPath('rejected.json'), normalized.issues);
  writeJsonAtomic(metadataPath('crosscheck.json'), {
    mode: full ? 'full' : 'incremental',
    ...check,
    roundingOnly: check.roundingOnly.slice(0, 500),
    mismatches: check.mismatches.slice(0, 500),
    missingInCrosscheck: check.missingInCrosscheck.slice(0, 500),
    missingInRaw: check.missingInRaw.slice(0, 500),
    counts: {
      roundingOnly: check.roundingOnly.length,
      mismatches: check.mismatches.length,
      missingInCrosscheck: check.missingInCrosscheck.length,
      missingInRaw: check.missingInRaw.length,
    },
  });
  console.log(`  değişen yıl dosyaları: ${changedYears.length ? changedYears.join(', ') : 'yok'}`);

  if (check.mismatches.length > 0) {
    annotate('warning', `Arşiv ↔ .YTL çapraz kontrolünde ${check.mismatches.length} uyuşmazlık (data/metadata/crosscheck.json).`);
  }
  if (merge.revisions.length > 0) annotate('notice', `${merge.revisions.length} revizyon tespit edildi (data/metadata/revisions.json).`);
}

main().catch((error: unknown) => {
  console.error(`data:update BAŞARISIZ: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
