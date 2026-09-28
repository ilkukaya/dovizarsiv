/**
 * Yerel veri deposu: data/normalized/YYYY.json, data/aggregate/, data/metadata/.
 * - Yazımlar atomiktir (geçici dosya + rename); içerik değişmediyse dosyaya dokunulmaz.
 * - Geçmiş yıllar yalnızca içerikleri gerçekten değiştiyse (revizyon) yeniden yazılır.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { EVDS_SERIES } from '../../../src/config/evds-series.ts';
import { yearOf, type IsoDate } from '../../../src/lib/data/dates.ts';
import { SCHEMA_VERSION, type Observation, type Revision, type YearFile } from '../../../src/lib/data/model.ts';
import { storeFromObservations, type ExtraSourceRow, type SourceStore } from '../../../src/lib/data/normalize.ts';
import { CURRENCIES, RATE_FIELDS, type CurrencyCode, type RateField } from '../../../src/lib/providers/types.ts';

export const DATA_DIR = resolve(process.env.DOVIZARSIV_DATA_DIR ?? 'data');
export const NORMALIZED_DIR = join(DATA_DIR, 'normalized');
export const AGGREGATE_DIR = join(DATA_DIR, 'aggregate');
export const METADATA_DIR = join(DATA_DIR, 'metadata');

export function sha16(payload: string): string {
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

/** JSON'u atomik yazar. İçerik aynıysa yazmaz; değiştiyse true döner. */
export function writeTextAtomic(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return false;
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
  return true;
}

export function writeJsonAtomic(path: string, data: unknown): boolean {
  return writeTextAtomic(path, `${JSON.stringify(data, null, 2)}\n`);
}

export function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Yıl dosyası: başlık okunaklı, her gözlem tek satır (küçük diff'ler için). */
export function serializeYearFile(file: YearFile): string {
  const { observations, ...header } = file;
  const head = JSON.stringify(header, null, 2).replace(/\n}$/, '');
  const lines = observations.map((o) => `    ${JSON.stringify(o)}`);
  return `${head},\n  "observations": [\n${lines.join(',\n')}\n  ]\n}\n`;
}

function sourceSeriesMap(): YearFile['sourceSeries'] {
  const map = {} as Record<CurrencyCode, Partial<Record<RateField, string>>>;
  for (const currency of CURRENCIES) {
    map[currency] = {};
    for (const field of RATE_FIELDS) map[currency][field] = EVDS_SERIES[currency][field].raw;
  }
  return map;
}

export function yearFilePath(year: number): string {
  return join(NORMALIZED_DIR, `${year}.json`);
}

export function listYearFiles(): number[] {
  if (!existsSync(NORMALIZED_DIR)) return [];
  return readdirSync(NORMALIZED_DIR)
    .filter((f) => /^\d{4}\.json$/.test(f))
    .map((f) => Number(f.slice(0, 4)))
    .sort((a, b) => a - b);
}

export function readYearFile(year: number): YearFile {
  return JSON.parse(readFileSync(yearFilePath(year), 'utf8')) as YearFile;
}

export function readAllObservations(): Observation[] {
  return listYearFiles().flatMap((year) => readYearFile(year).observations);
}

/** Yıllara böler ve yazar. Değişen yılları döner. Artık gözlemi kalmayan yıl dosyaları silinir. */
export function writeYearFiles(observations: readonly Observation[]): number[] {
  const byYear = new Map<number, Observation[]>();
  for (const obs of observations) {
    const year = yearOf(obs.date);
    let list = byYear.get(year);
    if (!list) byYear.set(year, (list = []));
    list.push(obs);
  }
  const changed: number[] = [];
  const series = sourceSeriesMap();
  for (const [year, list] of [...byYear].sort((a, b) => a[0] - b[0])) {
    const file: YearFile = {
      schemaVersion: SCHEMA_VERSION,
      year,
      source: 'TCMB_EVDS',
      unit: 'TRY',
      dateConvention: 'determination-date',
      sourceSeries: series,
      observations: list,
    };
    if (writeTextAtomic(yearFilePath(year), serializeYearFile(file))) changed.push(year);
  }
  for (const year of listYearFiles()) {
    if (!byYear.has(year)) {
      rmSync(yearFilePath(year));
      changed.push(year);
    }
  }
  return changed;
}

/**
 * Gözleme dönüşmeyen kaynak satırları: serinin ilk satırı ve taşınan-kur (carry-over) satırları.
 * Ham kaynağın eksiksiz saklanması ve eşlemenin yeniden kurulabilmesi için tutulur.
 */
export interface ExtraSourceFileRow extends ExtraSourceRow {
  fetchedAt: string;
  values: Record<string, string>;
}

const EXTRA_PATH = () => join(METADATA_DIR, 'source-extra.json');
const LEGACY_UNMAPPED_PATH = () => join(METADATA_DIR, 'unmapped-source.json');

export function readExtraRows(): ExtraSourceFileRow[] {
  const legacy = readJson<Array<Omit<ExtraSourceFileRow, 'reason'>>>(LEGACY_UNMAPPED_PATH(), []);
  return [...legacy.map((r) => ({ ...r, reason: 'first_row' as const })), ...readJson<ExtraSourceFileRow[]>(EXTRA_PATH(), [])];
}

export function writeExtraRows(store: SourceStore, extras: readonly ExtraSourceRow[]): boolean {
  const rows: ExtraSourceFileRow[] = extras.map((extra) => {
    const codes = store.get(extra.sourceDate) ?? new Map();
    const values: Record<string, string> = {};
    let fetchedAt = '';
    for (const [code, rec] of [...codes].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      values[code] = rec.raw;
      if (rec.fetchedAt > fetchedAt) fetchedAt = rec.fetchedAt;
    }
    return { ...extra, fetchedAt, values };
  });
  if (existsSync(LEGACY_UNMAPPED_PATH())) rmSync(LEGACY_UNMAPPED_PATH());
  return writeJsonAtomic(EXTRA_PATH(), rows);
}

/** Depolanmış tüm ham kaynak kayıtları (gözlemler + ek satırlar). */
export function loadSourceStore(): SourceStore {
  const store = storeFromObservations(readAllObservations());
  for (const row of readExtraRows()) {
    let codes = store.get(row.sourceDate);
    if (!codes) store.set(row.sourceDate, (codes = new Map()));
    for (const [code, raw] of Object.entries(row.values)) codes.set(code, { raw, fetchedAt: row.fetchedAt });
  }
  return store;
}

const REVISIONS_PATH = () => join(METADATA_DIR, 'revisions.json');

export function appendRevisions(revisions: readonly Revision[]): void {
  if (revisions.length === 0) return;
  const existing = readJson<Revision[]>(REVISIONS_PATH(), []);
  writeJsonAtomic(REVISIONS_PATH(), [...existing, ...revisions]);
}

export function metadataPath(name: string): string {
  return join(METADATA_DIR, name);
}

export function aggregatePath(...parts: string[]): string {
  return join(AGGREGATE_DIR, ...parts);
}
