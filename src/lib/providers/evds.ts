/**
 * TCMB EVDS3 provider. EVDS URL'leri yalnızca bu dosyada bulunur (SPEC §4.3).
 *
 * Resmi kaynak: "EVDS Web Servis Kılavuzu" (EVDS3 docId=8, 2026-02-26), docs/DECISIONS.md D-003.
 * - Anahtar HTTP header'ında `key` adıyla gönderilir; hiçbir zaman URL'e, loga veya hata mesajına yazılmaz.
 * - İstek başına en fazla 1000 gözlem; aşılırsa EVDS sessizce kırpar → aralık parçalanır ve kırpma tespit edilir.
 * - Kibar istek: eşzamanlılık 1, istekler arası bekleme, 5xx/ağ hatasında üstel geri çekilme, 4xx'te durma.
 * - Ziyaretçiler EVDS'ye asla istek atmaz; bu modül yalnızca scripts/data altındaki komutlarca kullanılır.
 */
import { addDays, evdsToIso, isoToEvds, type IsoDate } from '../data/dates.ts';
import type { DatagroupMetadata, RateProvider, SeriesMetadata, SourceRow } from './types.ts';

const BASE_URL = 'https://evds3.tcmb.gov.tr/igmevdsms-dis/';
/** Günlük seride EVDS takvim günü başına satır döndürebilir; 1000 sınırının altında kalmak için. */
const CHUNK_DAYS = 700;
const MAX_OBSERVATIONS = 1000;
const MIN_INTERVAL_MS = 1200;
const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000];

export class EvdsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'EvdsError';
  }
}

export interface EvdsOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
  minIntervalMs?: number;
  retryDelaysMs?: readonly number[];
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** EVDS, seri kodlarındaki noktaları yanıt alanlarında alt çizgiye çevirir. */
export function evdsFieldName(seriesCode: string): string {
  return seriesCode.replaceAll('.', '_');
}

const KNOWN_META_FIELDS = new Set(['Tarih', 'UNIXTIME', 'YEARWEEK']);

/** EVDS `series=` yanıtını ayrıştırır; beklenmeyen alanlarda hata verir (şema değişikliği tespiti). */
export function parseSeriesResponse(body: unknown, seriesCodes: readonly string[]): SourceRow[] {
  if (typeof body !== 'object' || body === null || !Array.isArray((body as { items?: unknown }).items)) {
    throw new EvdsError('EVDS yanıtı beklenen biçimde değil (items dizisi yok)');
  }
  const { items, totalCount } = body as { items: unknown[]; totalCount?: unknown };
  if (typeof totalCount === 'number' && totalCount > items.length) {
    throw new EvdsError(`EVDS yanıtı kırpılmış: totalCount=${totalCount}, items=${items.length}`);
  }
  if (items.length >= MAX_OBSERVATIONS) {
    throw new EvdsError(`EVDS yanıtı ${items.length} gözlem içeriyor; 1000 sınırı nedeniyle kırpılmış olabilir`);
  }
  const fieldToCode = new Map(seriesCodes.map((code) => [evdsFieldName(code), code]));
  const rows: SourceRow[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== 'object' || item === null) throw new EvdsError('EVDS satırı nesne değil');
    const record = item as Record<string, unknown>;
    const tarih = record.Tarih;
    if (typeof tarih !== 'string') throw new EvdsError('EVDS satırında Tarih alanı yok');
    const sourceDate = evdsToIso(tarih);
    if (seen.has(sourceDate)) throw new EvdsError(`EVDS yanıtında duplike tarih: ${sourceDate}`);
    seen.add(sourceDate);
    const values: Record<string, string | null> = {};
    for (const code of seriesCodes) values[code] = null;
    for (const [key, value] of Object.entries(record)) {
      if (KNOWN_META_FIELDS.has(key)) continue;
      const code = fieldToCode.get(key);
      if (!code) throw new EvdsError(`EVDS yanıtında bilinmeyen alan: ${key}`);
      if (value === null || value === undefined || value === '') {
        values[code] = null;
      } else if (typeof value === 'string') {
        values[code] = value;
      } else {
        throw new EvdsError(`EVDS değeri string değil: ${key}=${JSON.stringify(value)}`);
      }
    }
    rows.push({ sourceDate, values });
  }
  rows.sort((a, b) => (a.sourceDate < b.sourceDate ? -1 : a.sourceDate > b.sourceDate ? 1 : 0));
  return rows;
}

function pick(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key] ?? record[key.toUpperCase()] ?? record[key.toLowerCase()];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function toIsoOrEmpty(value: string): IsoDate {
  return value ? evdsToIso(value) : '';
}

export class EvdsProvider implements RateProvider {
  readonly id = 'TCMB_EVDS' as const;
  readonly label = 'Türkiye Cumhuriyet Merkez Bankası (TCMB), Elektronik Veri Dağıtım Sistemi (EVDS)';

  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly log: (message: string) => void;
  private readonly minIntervalMs: number;
  private readonly retryDelaysMs: readonly number[];
  private lastRequestAt = 0;

  constructor(options: EvdsOptions) {
    if (!options.apiKey) throw new EvdsError('EVDS_API_KEY tanımlı değil');
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.log = options.log ?? (() => {});
    this.minIntervalMs = options.minIntervalMs ?? MIN_INTERVAL_MS;
    this.retryDelaysMs = options.retryDelaysMs ?? RETRY_DELAYS_MS;
  }

  /** Anahtar yanlışlıkla bir mesaja karışırsa maskele. */
  private redact(text: string): string {
    return this.apiKey ? text.split(this.apiKey).join('***') : text;
  }

  private async request(path: string): Promise<unknown> {
    const url = BASE_URL + path;
    for (let attempt = 0; ; attempt++) {
      const wait = this.lastRequestAt + this.minIntervalMs - Date.now();
      if (wait > 0) await this.sleep(wait);
      this.lastRequestAt = Date.now();
      let status = 0;
      let text = '';
      try {
        const response = await this.fetchImpl(url, {
          headers: { key: this.apiKey, accept: 'application/json', 'user-agent': 'dovizarsiv-data/1.0 (+https://dovizarsiv.net)' },
          signal: AbortSignal.timeout(60_000),
        });
        status = response.status;
        text = await response.text();
      } catch (error) {
        status = 0;
        text = error instanceof Error ? error.message : String(error);
      }
      if (status >= 200 && status < 300) {
        try {
          return JSON.parse(text) as unknown;
        } catch {
          throw new EvdsError(`EVDS JSON olmayan yanıt döndü (${path.slice(0, 60)}…)`, status);
        }
      }
      const retryable = status === 0 || status === 429 || status >= 500;
      const detail = this.redact(text.slice(0, 200));
      if (!retryable || attempt >= this.retryDelaysMs.length) {
        throw new EvdsError(`EVDS isteği başarısız: HTTP ${status || 'ağ hatası'} — ${detail}`, status);
      }
      const delay = this.retryDelaysMs[attempt] ?? 16000;
      this.log(`EVDS HTTP ${status || 'ağ hatası'}; ${delay / 1000} sn sonra yeniden denenecek (${attempt + 1}/${this.retryDelaysMs.length})`);
      await this.sleep(delay);
    }
  }

  async fetchRows(seriesCodes: readonly string[], start: IsoDate, end: IsoDate): Promise<SourceRow[]> {
    if (seriesCodes.length === 0) return [];
    const rows: SourceRow[] = [];
    let chunkStart = start;
    while (chunkStart <= end) {
      const candidateEnd = addDays(chunkStart, CHUNK_DAYS - 1);
      const chunkEnd = candidateEnd < end ? candidateEnd : end;
      const path = `series=${seriesCodes.join('-')}&startDate=${isoToEvds(chunkStart)}&endDate=${isoToEvds(chunkEnd)}&type=json`;
      const body = await this.request(path);
      const chunkRows = parseSeriesResponse(body, seriesCodes);
      for (const row of chunkRows) {
        if (row.sourceDate < chunkStart || row.sourceDate > chunkEnd) {
          throw new EvdsError(`EVDS istenen aralık dışında satır döndürdü: ${row.sourceDate} (${chunkStart}…${chunkEnd})`);
        }
      }
      rows.push(...chunkRows);
      this.log(`EVDS ${chunkStart}…${chunkEnd}: ${chunkRows.length} satır`);
      chunkStart = addDays(chunkEnd, 1);
    }
    return rows;
  }

  async fetchDatagroup(code: string): Promise<DatagroupMetadata> {
    const body = await this.request(`datagroups/mode=1&code=${encodeURIComponent(code)}&type=json`);
    const list = Array.isArray(body) ? body : ((body as { items?: unknown[] })?.items ?? []);
    const record = list.find((d) => pick(d as Record<string, unknown>, 'DATAGROUP_CODE', 'Datagroup_Code') === code) as
      | Record<string, unknown>
      | undefined;
    if (!record) throw new EvdsError(`EVDS veri grubu bulunamadı: ${code}`);
    return {
      code,
      name: pick(record, 'DATAGROUP_NAME', 'Datagroup_Name'),
      frequency: pick(record, 'FREQUENCY_STR', 'Frequency_Str'),
      unit: pick(record, 'BIRIMI'),
      startDate: toIsoOrEmpty(pick(record, 'START_DATE', 'Start_Date')),
      endDate: toIsoOrEmpty(pick(record, 'END_DATE', 'End_Date')),
      note: pick(record, 'NOTE', 'Note'),
      lastUpdated: pick(record, 'LAST_UPDATED'),
    };
  }

  async fetchSeriesList(datagroupCode: string): Promise<SeriesMetadata[]> {
    const body = await this.request(`serieList/type=json&code=${encodeURIComponent(datagroupCode)}`);
    const list = Array.isArray(body) ? body : ((body as { items?: unknown[] })?.items ?? []);
    return list.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        code: pick(record, 'SERIE_CODE', 'Serie_Code'),
        datagroupCode: pick(record, 'DATAGROUP_CODE', 'Datagroup_Code') || datagroupCode,
        name: pick(record, 'SERIE_NAME', 'Serie_Name'),
        frequency: pick(record, 'FREQUENCY_STR', 'Frequency_Str'),
        startDate: toIsoOrEmpty(pick(record, 'START_DATE', 'Start_Date')),
        endDate: toIsoOrEmpty(pick(record, 'END_DATE', 'End_Date')),
      };
    });
  }
}

export function createEvdsProviderFromEnv(log?: (message: string) => void): EvdsProvider {
  const apiKey = process.env.EVDS_API_KEY ?? '';
  if (!apiKey) {
    throw new EvdsError(
      'EVDS_API_KEY ortam değişkeni tanımlı değil. Yerelde .env, CI\'da GitHub Secrets (EVDS_API_KEY) kullanılır.',
    );
  }
  return new EvdsProvider({ apiKey, log });
}
