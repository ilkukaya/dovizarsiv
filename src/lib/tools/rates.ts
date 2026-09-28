/**
 * Araçların (geçmiş döviz, kur değişimi, karşılaştırma, gün mini hesaplayıcısı) kur deposu.
 * Veri, build'de üretilen `/veri/kurlar/{yıl}.json` parçalarından gelir; ziyaretçi EVDS'ye istek atmaz.
 * Tarih konvansiyonu B: `date` TCMB'nin kuru belirlediği gündür (SPEC §5, DECISIONS D-012).
 * Gözlemsiz gün interpolasyonla doldurulmaz: en yakın ÖNCEKİ belirlenme günü kullanılır.
 */
import { CURRENCIES, RATE_FIELDS, type CurrencyCode, type RateField } from '../providers/types.ts';
import { indexOnOrBefore } from '../data/lookup.ts';
import type { IsoDate } from '../data/dates.ts';

export interface RatePoint {
  /** Belirlenme günü (sitenin tarihi). */
  date: IsoDate;
  /** EVDS satırının tarihi (kurun geçerli olduğu gün). */
  sourceDate: IsoDate;
  currency: CurrencyCode;
  values: Record<RateField, string | null>;
}

export interface YearFile {
  year: number;
  fields: string[];
  rows: Array<Array<string | null>>;
}

const EXPECTED_FIELDS = ['date', 'sourceDate', 'currency', ...RATE_FIELDS];

export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

/** Yıl JSON'unu doğrular ve noktalara çevirir. Beklenmeyen biçimde hata fırlatır (yanlış veriyle hesap yapılmaz). */
export function parseYearFile(json: unknown): RatePoint[] {
  const file = json as Partial<YearFile> | null;
  if (!file || !Array.isArray(file.fields) || !Array.isArray(file.rows)) throw new Error('Kur dosyası biçimi geçersiz');
  if (file.fields.join('|') !== EXPECTED_FIELDS.join('|')) throw new Error('Kur dosyası alanları beklenenden farklı');
  const points: RatePoint[] = [];
  for (const row of file.rows) {
    const [date, sourceDate, currency, fb, fs, cb, cs] = row;
    if (typeof date !== 'string' || typeof sourceDate !== 'string' || !isCurrency(currency)) throw new Error('Kur satırı geçersiz');
    points.push({ date, sourceDate, currency, values: { forexBuying: fb ?? null, forexSelling: fs ?? null, cashBuying: cb ?? null, cashSelling: cs ?? null } });
  }
  return points;
}

export interface Found {
  point: RatePoint;
  /** İstenen gün, kur belirlenen bir gün müydü? */
  exact: boolean;
}

export class RateStore {
  private readonly series = new Map<CurrencyCode, RatePoint[]>();
  private readonly years = new Set<number>();

  hasYear(year: number): boolean {
    return this.years.has(year);
  }

  addYear(year: number, points: readonly RatePoint[]): void {
    if (this.years.has(year)) return;
    this.years.add(year);
    for (const p of points) {
      const list = this.series.get(p.currency) ?? [];
      list.push(p);
      this.series.set(p.currency, list);
    }
    for (const list of this.series.values()) list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  pointsOf(currency: CurrencyCode): readonly RatePoint[] {
    return this.series.get(currency) ?? [];
  }

  /** `date` günü ya da ondan önceki son belirlenme günü; yüklü yıllarda yoksa null. */
  find(currency: CurrencyCode, date: IsoDate): Found | null {
    const list = this.pointsOf(currency);
    const i = indexOnOrBefore(list.map((p) => p.date), date);
    if (i < 0) return null;
    const point = list[i]!;
    return { point, exact: point.date === date };
  }

  /** [start, end] aralığındaki noktalar (yüklü yıllardan). */
  range(currency: CurrencyCode, start: IsoDate, end: IsoDate): RatePoint[] {
    return this.pointsOf(currency).filter((p) => p.date >= start && p.date <= end);
  }
}

export type YearLoader = (year: number) => Promise<RatePoint[]>;

/** Tarayıcıda: `/veri/kurlar/{yıl}.json` getirir, aynı yılı iki kez istemez. */
export function createFetchLoader(fetchFn: typeof fetch = fetch, urlFor: (year: number) => string = (y) => `/veri/kurlar/${y}.json`): YearLoader {
  const cache = new Map<number, Promise<RatePoint[]>>();
  return (year) => {
    let pending = cache.get(year);
    if (!pending) {
      pending = fetchFn(urlFor(year)).then((r) => {
        if (!r.ok) throw new Error(`Kur dosyası alınamadı (${r.status})`);
        return r.json().then(parseYearFile);
      });
      // Başarısız istek önbellekte kalmasın; kullanıcı tekrar deneyebilsin.
      pending.catch(() => cache.delete(year));
      cache.set(year, pending);
    }
    return pending;
  };
}

/**
 * `date` için gereken yılları yükler: önce `date`'in yılı; para birimi için o tarihte ya da öncesinde gözlem
 * bulunana kadar geriye gider (yıl başında hafta sonu/tatil varsa önceki yıl gerekir). `firstDates`
 * (para birimi ilk gözlem tarihi) içindeki sınırın öncesine gidilmez.
 */
export async function ensureRates(
  store: RateStore,
  loader: YearLoader,
  currencies: readonly CurrencyCode[],
  date: IsoDate,
  firstDates: Partial<Record<CurrencyCode, IsoDate>>,
): Promise<void> {
  const year = Number(date.slice(0, 4));
  for (const currency of currencies) {
    const first = firstDates[currency];
    if (first && date < first) continue;
    let y = year;
    const floor = first ? Number(first.slice(0, 4)) : 1950;
    for (;;) {
      if (!store.hasYear(y)) store.addYear(y, await loader(y));
      if (store.find(currency, date) || y <= floor) break;
      y -= 1;
    }
  }
}

/** Başlangıç–bitiş arasındaki tüm yılları yükler (grafik ve karşılaştırma için). */
export async function ensureYears(store: RateStore, loader: YearLoader, fromYear: number, toYear: number): Promise<void> {
  for (let y = fromYear; y <= toYear; y++) if (!store.hasYear(y)) store.addYear(y, await loader(y));
}
