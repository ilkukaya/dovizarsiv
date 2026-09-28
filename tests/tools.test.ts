/**
 * Araç mantığı testleri (SPEC §11.3). Beklenen değerler kod dışında (Python Decimal) elle/bağımsız hesaplandı.
 * Fixture değerleri data/normalized içindeki gerçek EVDS gözlemleridir (TCMB bültenleriyle doğrulanmış tarihler).
 */
import { describe, expect, it } from 'vitest';
import { calculateChange } from '../src/lib/tools/change.ts';
import { compareYears } from '../src/lib/tools/compare.ts';
import { calculateHistorical, parseAmount, type Coverage, type HistoricalError, type HistoricalResult } from '../src/lib/tools/historical.ts';
import { createFetchLoader, ensureRates, parseYearFile, RateStore, type RatePoint } from '../src/lib/tools/rates.ts';

function pt(date: string, sourceDate: string, currency: 'USD' | 'EUR', fb: string | null, fs: string | null, cb: string | null, cs: string | null): RatePoint {
  return { date, sourceDate, currency, values: { forexBuying: fb, forexSelling: fs, cashBuying: cb, cashSelling: cs } };
}

const ROWS: Record<number, RatePoint[]> = {
  1998: [pt('1998-12-31', '1999-01-04', 'EUR', '0.36619', '0.367956', null, null)],
  1999: [pt('1999-06-15', '1999-06-16', 'USD', '0.411728', '0.413714', '0.41144', '0.414335')],
  2004: [pt('2004-12-31', '2005-01-03', 'USD', '1.3363', '1.3427', '1.3354', '1.3447')],
  2019: [pt('2019-12-31', '2020-01-02', 'USD', '5.94', '5.9507', '5.9358', '5.9596')],
  2020: [
    pt('2020-01-02', '2020-01-03', 'USD', '5.9478', '5.9585', '5.9436', '5.9674'),
    pt('2020-01-10', '2020-01-13', 'USD', '5.8713', '5.8819', '5.8672', '5.8907'),
    pt('2020-01-10', '2020-01-13', 'EUR', '6.517', '6.5288', '6.5125', '6.5386'),
    pt('2020-01-15', '2020-01-16', 'USD', '5.8827', '5.8933', '5.8786', '5.9021'),
    pt('2020-01-15', '2020-01-16', 'EUR', '6.5504', '6.5622', '6.5458', '6.5721'),
    pt('2020-12-31', '2021-01-04', 'USD', '7.4194', '7.4327', '7.4142', '7.4439'),
  ],
};
const coverage: Coverage = { firstDates: { USD: '1950-01-02', EUR: '1998-12-31', GBP: '1950-01-02' }, lastDate: '2026-09-28' };

function store(): RateStore {
  const s = new RateStore();
  for (const [year, rows] of Object.entries(ROWS)) s.addYear(Number(year), rows);
  return s;
}
function ok(r: HistoricalResult | HistoricalError): HistoricalResult {
  if (!('ok' in r)) throw new Error(`hata: ${r.code}`);
  return r;
}

describe('parseAmount', () => {
  it('tr-TR yazımını okur', () => {
    expect(parseAmount('1.234,56')?.toString()).toBe('1234.56');
    expect(parseAmount('1234,5')?.toString()).toBe('1234.5');
    expect(parseAmount('1.500')?.toString()).toBe('1500');
    expect(parseAmount('1234.56')?.toString()).toBe('1234.56');
    expect(parseAmount(' 100 ')?.toString()).toBe('100');
  });
  it('geçersizi reddeder', () => {
    for (const bad of ['', 'abc', '-5', '1,2,3', '1e5']) expect(parseAmount(bad)).toBeNull();
  });
});

describe('geçmiş döviz hesaplayıcısı (elle hesaplanmış örnekler)', () => {
  it('1) 100 USD → TL, 2020-01-15, döviz alış 5,8827 → 588,27', () => {
    const r = ok(calculateHistorical(store(), { amount: '100', from: 'USD', to: 'TRY', date: '2020-01-15' }, coverage));
    expect(r.result.toString()).toBe('588.27');
    expect(r.legs[0]).toMatchObject({ field: 'forexBuying', observationDate: '2020-01-15', exact: true });
    expect(r.resultAlt).toBeNull();
  });
  it('2) 1000 TL → USD, 2020-01-15, döviz satış 5,8933 → 169,684217670914', () => {
    const r = ok(calculateHistorical(store(), { amount: '1.000', from: 'TRY', to: 'USD', date: '2020-01-15' }, coverage));
    expect(r.result.toString()).toBe('169.684217670914');
    expect(r.legs[0]?.field).toBe('forexSelling');
  });
  it('3) hafta sonu (2020-01-12) → önceki belirlenme günü 2020-01-10, 100 USD → 587,13 TL', () => {
    const r = ok(calculateHistorical(store(), { amount: '100', from: 'USD', to: 'TRY', date: '2020-01-12' }, coverage));
    expect(r.result.toString()).toBe('587.13');
    expect(r.legs[0]).toMatchObject({ observationDate: '2020-01-10', exact: false });
    expect(r.requestedDate).toBe('2020-01-12');
  });
  it('4) 2005 öncesi: 1.000.000.000 eski TL → USD (15.06.1999) = 2417,128741111009; 100 USD → 41,1728 yeni TL = 41.172.800 eski TL', () => {
    const a = ok(calculateHistorical(store(), { amount: '1000000000', from: 'TRY', to: 'USD', date: '1999-06-15', tlUnit: 'old' }, coverage));
    expect(a.result.toString()).toBe('2417.128741111009');
    expect(a.preRedenomination).toBe(true);
    const b = ok(calculateHistorical(store(), { amount: '100', from: 'USD', to: 'TRY', date: '1999-06-15', tlUnit: 'old' }, coverage));
    expect(b.result.toString()).toBe('41172800');
    expect(b.resultAlt?.unit).toBe('new');
    expect(b.resultAlt?.value.toString()).toBe('41.1728');
    const c = ok(calculateHistorical(store(), { amount: '100', from: 'USD', to: 'TRY', date: '1999-06-15', tlUnit: 'new' }, coverage));
    expect(c.result.toString()).toBe('41.1728');
    expect(c.resultAlt).toMatchObject({ unit: 'old' });
  });
  it('4b) yeni TL girildiğinde tutar ölçeklenmez: 1000 yeni TL → USD (15.06.1999) aynı sonuç', () => {
    const a = ok(calculateHistorical(store(), { amount: '1000', from: 'TRY', to: 'USD', date: '1999-06-15', tlUnit: 'new' }, coverage));
    expect(a.result.toString()).toBe('2417.128741111009');
  });
  it('5) döviz → döviz: 100 USD → EUR, 2020-01-15, USD alış ÷ EUR satış → 89,645240925299', () => {
    const r = ok(calculateHistorical(store(), { amount: '100', from: 'USD', to: 'EUR', date: '2020-01-15' }, coverage));
    expect(r.result.toString()).toBe('89.645240925299');
    expect(r.legs.map((l) => l.field)).toEqual(['forexBuying', 'forexSelling']);
  });
  it('6) 31.12.2004 (2005 öncesi, EVDS 03.01.2005 satırı): 100 USD = 133,63 yeni TL = 133.630.000 eski TL', () => {
    const r = ok(calculateHistorical(store(), { amount: '100', from: 'USD', to: 'TRY', date: '2004-12-31', tlUnit: 'old' }, coverage));
    expect(r.result.toString()).toBe('133630000');
    expect(r.resultAlt?.value.toString()).toBe('133.63');
  });
  it('kur türü seçimi: efektif satış ve efektif alış', () => {
    const r = ok(calculateHistorical(store(), { amount: '100', from: 'TRY', to: 'USD', date: '2020-01-15', rateField: 'cashSelling' }, coverage));
    expect(r.legs[0]?.rate.toString()).toBe('5.9021');
  });
  it('hatalar: geçersiz tutar, aynı birim, kapsam öncesi, gelecek, eksik efektif kur', () => {
    const s = store();
    expect(calculateHistorical(s, { amount: 'x', from: 'USD', to: 'TRY', date: '2020-01-15' }, coverage)).toEqual({ code: 'invalid_amount' });
    expect(calculateHistorical(s, { amount: '1', from: 'USD', to: 'USD', date: '2020-01-15' }, coverage)).toEqual({ code: 'same_unit' });
    expect(calculateHistorical(s, { amount: '1', from: 'EUR', to: 'TRY', date: '1998-12-30' }, coverage)).toMatchObject({ code: 'before_coverage', currency: 'EUR' });
    expect(calculateHistorical(s, { amount: '1', from: 'USD', to: 'TRY', date: '2026-10-01' }, coverage)).toMatchObject({ code: 'after_last' });
    expect(calculateHistorical(s, { amount: '1', from: 'EUR', to: 'TRY', date: '1998-12-31', rateField: 'cashBuying' }, coverage)).toMatchObject({ code: 'field_missing', currency: 'EUR' });
  });
});

describe('kur değişimi', () => {
  it('USD döviz satış 2020-01-02 → 2020-12-31: fark 1,4742, %24,741126122346, 364 gün', () => {
    const r = calculateChange(store(), { currency: 'USD', field: 'forexSelling', start: '2020-01-02', end: '2020-12-31' }, coverage);
    if (!('ok' in r)) throw new Error(r.code);
    expect(r.difference.toString()).toBe('1.4742');
    expect(r.percent?.toString()).toBe('24.741126122346');
    expect(r.calendarDays).toBe(364);
    expect(r.points.map((p) => p.date)).toEqual(['2020-01-02', '2020-01-10', '2020-01-15', '2020-12-31']);
  });
  it('gözlemsiz uç gün önceki belirlenme gününe bağlanır ve işaretlenir', () => {
    const r = calculateChange(store(), { currency: 'USD', field: 'forexBuying', start: '2020-01-12', end: '2020-01-15' }, coverage);
    if (!('ok' in r)) throw new Error(r.code);
    expect(r.start).toMatchObject({ requestedDate: '2020-01-12', observationDate: '2020-01-10', exact: false });
    expect(r.end.exact).toBe(true);
    expect(r.difference.toString()).toBe('0.0114');
  });
  it('sıra, kapsam ve gelecek hataları', () => {
    const s = store();
    expect(calculateChange(s, { currency: 'USD', field: 'forexBuying', start: '2020-02-01', end: '2020-01-01' }, coverage)).toEqual({ code: 'order' });
    expect(calculateChange(s, { currency: 'EUR', field: 'forexBuying', start: '1990-01-01', end: '2020-01-01' }, coverage)).toMatchObject({ code: 'before_coverage' });
    expect(calculateChange(s, { currency: 'USD', field: 'forexBuying', start: '2020-01-01', end: '2030-01-01' }, coverage)).toMatchObject({ code: 'after_last' });
  });
});

describe('yıl karşılaştırma', () => {
  it('2020 USD döviz satış: ortalama 6,2916, en düşük 5,8819 (10 Ocak), en yüksek 7,4327, yıl sonu 7,4327', () => {
    const [t] = compareYears(store(), ['USD'], 2020, 2020, 'forexSelling');
    const row = t!.rows[0]!;
    expect(row.count).toBe(4);
    expect(row.summary.mean.toString()).toBe('6.2916');
    expect(row.summary.min).toMatchObject({ date: '2020-01-10' });
    expect(row.summary.min.value.toString()).toBe('5.8819');
    expect(row.summary.max.value.toString()).toBe('7.4327');
    expect(row.yearEnd.date).toBe('2020-12-31');
  });
  it('verisi olmayan yıl "boş" işaretlenir (EUR 1998 öncesi)', () => {
    const [t] = compareYears(store(), ['EUR'], 1997, 1998, 'forexSelling');
    expect(t!.emptyYears).toEqual([1997]);
    expect(t!.rows.map((r) => r.year)).toEqual([1998]);
  });
});

describe('yükleyici', () => {
  it('yıl başında (2020-01-01) önceki yılı da yükler ve 2019-12-31 gözlemini bulur', async () => {
    const calls: number[] = [];
    const loader = async (y: number) => {
      calls.push(y);
      return ROWS[y] ?? [];
    };
    const s = new RateStore();
    await ensureRates(s, loader, ['USD'], '2020-01-01', coverage.firstDates);
    expect(calls).toEqual([2020, 2019]);
    expect(s.find('USD', '2020-01-01')?.point.date).toBe('2019-12-31');
  });
  it('para biriminin ilk gözleminden önceki tarih için istek atmaz', async () => {
    const calls: number[] = [];
    const s = new RateStore();
    await ensureRates(s, async (y) => (calls.push(y), []), ['EUR'], '1990-05-05', coverage.firstDates);
    expect(calls).toEqual([]);
  });
  it('aynı yılı iki kez getirmez; hatalı yanıtta önbellek temizlenir', async () => {
    let n = 0;
    const body = { year: 2020, fields: ['date', 'sourceDate', 'currency', 'forexBuying', 'forexSelling', 'cashBuying', 'cashSelling'], rows: [['2020-01-02', '2020-01-03', 'USD', '1', '2', null, null]] };
    const okFetch = (async () => (n++, { ok: true, json: async () => body })) as unknown as typeof fetch;
    const load = createFetchLoader(okFetch);
    await Promise.all([load(2020), load(2020)]);
    expect(n).toBe(1);
    let fail = true;
    const flaky = (async () => (fail ? { ok: false, status: 500, json: async () => ({}) } : { ok: true, json: async () => body })) as unknown as typeof fetch;
    const load2 = createFetchLoader(flaky);
    await expect(load2(2020)).rejects.toThrow();
    fail = false;
    await expect(load2(2020)).resolves.toHaveLength(1);
  });
  it('beklenmeyen dosya biçimini reddeder (yanlış veriyle hesap yapılmaz)', () => {
    expect(() => parseYearFile({ fields: ['a'], rows: [] })).toThrow();
    expect(() => parseYearFile(null)).toThrow();
  });
});

describe('yıl sayfalarıyla tutarlılık (gerçek veri)', () => {
  it('karşılaştırma tablosu, yıl sayfasının periodSummary değerleriyle birebir aynı', async () => {
    const { periodObservations, periodSummary } = await import('../src/lib/data/store.ts');
    const s = new RateStore();
    for (const year of [1999, 2005, 2020]) {
      const points: RatePoint[] = (['USD', 'EUR'] as const).flatMap((c) =>
        periodObservations(c, String(year)).map((o) => ({
          date: o.date,
          sourceDate: o.sourceDate,
          currency: c,
          values: { forexBuying: o.forexBuying ?? null, forexSelling: o.forexSelling ?? null, cashBuying: o.cashBuying ?? null, cashSelling: o.cashSelling ?? null },
        })),
      );
      s.addYear(year, points);
    }
    for (const c of ['USD', 'EUR'] as const) {
      for (const t of compareYears(s, [c], 1999, 2020, 'forexSelling')) {
        for (const row of t.rows) {
          const page = periodSummary(c, String(row.year)).forexSelling!;
          expect(row.summary.mean.toString()).toBe(page.mean.toString());
          expect(row.summary.min.value.toString()).toBe(page.min.value.toString());
          expect(row.summary.min.date).toBe(page.min.date);
          expect(row.summary.max.date).toBe(page.max.date);
          expect(row.summary.last.value.toString()).toBe(page.last.value.toString());
        }
      }
    }
  });
});
