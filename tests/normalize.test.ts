import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildDeterminationIndex } from '../src/lib/data/convention.ts';
import { normalize, storeFromObservations, type SourceStore } from '../src/lib/data/normalize.ts';
import { percentChange, dec } from '../src/lib/calculations/decimal.ts';
import { parseSeriesResponse } from '../src/lib/providers/evds.ts';
import { mergeRows } from '../scripts/data/lib/merge.ts';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/evds-responses.json', import.meta.url), 'utf8'));
const checksum = (s: string) => `c${s.length}`;
const FETCHED = '2026-09-28T06:31:00.000Z';

function storeFrom(response: unknown, codes: string[]): SourceStore {
  const store: SourceStore = new Map();
  mergeRows(store, parseSeriesResponse(response, codes).map((r) => ({
    sourceDate: r.sourceDate,
    // Registry dışı çapraz kurlar (…C) testte atılır.
    values: Object.fromEntries(Object.entries(r.values).filter(([k]) => !k.endsWith('.C'))),
  })), FETCHED);
  return store;
}

const ARCHIVE_CODES = ['TP.DK.USD.A', 'TP.DK.USD.S', 'TP.DK.USD.C', 'TP.DK.EUR.A', 'TP.DK.EUR.S', 'TP.DK.EUR.C'];

describe('Tarih konvansiyonu (owner kararı B) — tek eşleme fonksiyonu', () => {
  it('EVDS D satırı = D\'den önceki son TCMB iş gününde belirlenen kur', () => {
    const index = buildDeterminationIndex(['2020-01-16', '2020-01-10', '2020-01-13', '2020-01-14', '2020-01-15']);
    expect(index.determinedOn('2020-01-10')).toBeUndefined(); // öncülü bilinmiyor
    expect(index.determinedOn('2020-01-13')).toBe('2020-01-10'); // Pazartesi satırı → Cuma belirlenen
    expect(index.determinedOn('2020-01-16')).toBe('2020-01-15');
    expect(index.sourceDateFor('2020-01-10')).toBe('2020-01-13');
    expect(index.sourceDateFor('2020-01-15')).toBe('2020-01-16');
    expect(index.sourceDateFor('2020-01-16')).toBeUndefined(); // bugün belirlenen kur henüz kaynakta yok
  });

  it('gerçek veride: sitedeki 15 Ocak 2020 = TCMB 15.01.2020 bülteni (2020/10, USD alış 5.8827)', () => {
    const { observations } = normalize(storeFrom(fixtures.archive_2020_01, ARCHIVE_CODES), checksum);
    const usd = observations.find((o) => o.date === '2020-01-15' && o.currency === 'USD')!;
    expect(usd.sourceDate).toBe('2020-01-16');
    expect(usd.forexBuying).toBe('5.8827');
    expect(usd.forexSelling).toBe('5.8933');
    // Faz 0'da doğrulanan bülten değerleri (DECISIONS D-006)
    const on14 = observations.find((o) => o.date === '2020-01-14' && o.currency === 'USD')!;
    expect(on14.forexBuying).toBe('5.8811');
    const on13 = observations.find((o) => o.date === '2020-01-13' && o.currency === 'USD')!;
    expect(on13.forexBuying).toBe('5.8529');
  });

  it('hafta sonu için gözlem üretilmez; Cuma belirlenen kur Pazartesi satırından gelir', () => {
    const { observations } = normalize(storeFrom(fixtures.archive_2020_01, ARCHIVE_CODES), checksum);
    const dates = [...new Set(observations.map((o) => o.date))];
    expect(dates).toEqual(['2020-01-10', '2020-01-13', '2020-01-14', '2020-01-15', '2020-01-16']);
    const friday = observations.find((o) => o.date === '2020-01-10' && o.currency === 'USD')!;
    expect(friday.sourceDate).toBe('2020-01-13');
    expect(friday.forexBuying).toBe('5.8713');
  });
});

describe('2005 para reformu — tarihe göre dönüşüm', () => {
  const { observations, unmapped } = normalize(storeFrom(fixtures.archive_2004_2005, ARCHIVE_CODES), checksum);
  const usd = (date: string) => observations.find((o) => o.date === date && o.currency === 'USD')!;

  it('2005 öncesi kaynak satırı: ham eski TL korunur, TRY karşılığı ÷ 1.000.000 ve işaretlenir', () => {
    const o = usd('2004-12-29'); // EVDS 30-12-2004 satırı = TCMB 29.12.2004 bülteni (1352500)
    expect(o.sourceDate).toBe('2004-12-30');
    expect(o.raw.forexBuying).toBe('1352500.00000000');
    expect(o.forexBuying).toBe('1.3525');
    expect(o.normalization).toEqual({ reason: '2005_redenomination', factor: '1000000' });
  });

  it('31.12.2004 belirlenen kur EVDS\'de 03-01-2005 satırında zaten YTL\'dir; dönüşüm KAYNAK tarihine göredir', () => {
    const o = usd('2004-12-31');
    expect(o.sourceDate).toBe('2005-01-03');
    expect(o.raw.forexBuying).toBe('1.33630000');
    expect(o.forexBuying).toBe('1.3363'); // TCMB 31.12.2004 bülteni: 1336300 eski TL
    expect(o.normalization).toBeUndefined();
  });

  it('2004-12-31 → 2005-01-03 geçişinde normalize seri süreklidir', () => {
    const before = dec(usd('2004-12-30').forexBuying!); // bülten 30.12.2004: 1342100 → 1.3421
    const after = dec(usd('2005-01-04').forexBuying!);
    expect(before.toString()).toBe('1.3421');
    const change = percentChange(before, dec(usd('2004-12-31').forexBuying!))!;
    expect(change.abs().cmp(dec('1'))).toBe(-1);
    expect(percentChange(before, after)!.abs().cmp(dec('1'))).toBe(-1);
  });

  it('serinin ilk satırı eşlenemez ve ayrıca raporlanır', () => {
    expect(unmapped).toEqual(['2004-12-27']);
  });
});

describe('Alanların ayrı tutulması ve geçersiz değerler', () => {
  it('efektif ve döviz alanları birleşmez; eksik alan hiç yazılmaz', () => {
    const store: SourceStore = new Map([
      ['2020-01-13', new Map([['TP.DK.USD.A', { raw: '5.87130000', fetchedAt: FETCHED }]])],
      ['2020-01-14', new Map([
        ['TP.DK.USD.A', { raw: '5.85290000', fetchedAt: FETCHED }],
        ['TP.DK.USD.A.EF', { raw: '5.84880000', fetchedAt: FETCHED }],
      ])],
    ]);
    const { observations } = normalize(store, checksum);
    expect(observations).toHaveLength(1);
    const o = observations[0]!;
    expect(o.forexBuying).toBe('5.8529');
    expect(o.cashBuying).toBe('5.8488');
    expect('forexSelling' in o).toBe(false);
    expect('cashSelling' in o).toBe(false);
  });

  it('sayısal olmayan, negatif ve sıfır değerler reddedilir ve raporlanır (tamir edilmez)', () => {
    const store: SourceStore = new Map([
      ['2020-01-10', new Map([['TP.DK.USD.A', { raw: '5.8810', fetchedAt: FETCHED }]])],
      ['2020-01-13', new Map([
        ['TP.DK.USD.A', { raw: 'N/A', fetchedAt: FETCHED }],
        ['TP.DK.USD.S', { raw: '-1', fetchedAt: FETCHED }],
        ['TP.DK.EUR.A', { raw: '0.0000', fetchedAt: FETCHED }],
        ['TP.DK.EUR.S', { raw: '6.5454', fetchedAt: FETCHED }],
      ])],
    ]);
    const { observations, issues } = normalize(store, checksum);
    expect(issues.map((i) => i.problem).sort()).toEqual(['negative', 'not_a_number', 'zero']);
    expect(observations).toHaveLength(1);
    expect(observations[0]!.currency).toBe('EUR');
    expect(observations[0]!.forexSelling).toBe('6.5454');
  });

  it('normalize gözlemlerden ham depo birebir geri kurulur', () => {
    const store = storeFrom(fixtures.archive_2020_01, ARCHIVE_CODES);
    const { observations } = normalize(store, checksum);
    const rebuilt = storeFromObservations(observations);
    expect(rebuilt.get('2020-01-16')!.get('TP.DK.USD.A')!.raw).toBe('5.88270000');
  });
});
