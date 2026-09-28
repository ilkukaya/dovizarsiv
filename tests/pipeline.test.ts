import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SourceStore } from '../src/lib/data/normalize.ts';
import { crosscheck } from '../scripts/data/lib/crosscheck.ts';
import { mergeRows } from '../scripts/data/lib/merge.ts';
import { serializeYearFile, writeTextAtomic } from '../scripts/data/lib/storage.ts';
import type { YearFile } from '../src/lib/data/model.ts';

describe('Birleştirme ve revizyon takibi', () => {
  it('yeni değeri ekler, değişeni revizyon olarak kaydeder, kaybolanı silmez', () => {
    const store: SourceStore = new Map([
      ['2020-01-14', new Map([
        ['TP.DK.USD.A', { raw: '5.85290000', fetchedAt: 't0' }],
        ['TP.DK.USD.S', { raw: '5.86350000', fetchedAt: 't0' }],
      ])],
    ]);
    const result = mergeRows(store, [
      { sourceDate: '2020-01-14', values: { 'TP.DK.USD.A': '5.85300000', 'TP.DK.USD.S': null } },
      { sourceDate: '2020-01-15', values: { 'TP.DK.USD.A': '5.88110000', 'TP.DK.USD.S': '5.89170000' } },
    ], 't1');
    expect(result.added).toBe(2);
    expect(result.revisions).toEqual([
      { detectedAt: 't1', sourceDate: '2020-01-14', currency: 'USD', field: 'forexBuying', seriesCode: 'TP.DK.USD.A', oldRaw: '5.85290000', newRaw: '5.85300000' },
    ]);
    expect(result.disappeared).toEqual([{ sourceDate: '2020-01-14', seriesCode: 'TP.DK.USD.S', storedRaw: '5.86350000' }]);
    expect(store.get('2020-01-14')!.get('TP.DK.USD.S')!.raw).toBe('5.86350000'); // silinmedi
    expect(store.get('2020-01-14')!.get('TP.DK.USD.A')!.raw).toBe('5.85300000');
  });

  it('registry dışı seri kodunu reddeder', () => {
    expect(() => mergeRows(new Map(), [{ sourceDate: '2020-01-01', values: { 'TP.XX': '1' } }], 't')).toThrow('Registry');
  });
});

describe('Arşiv ↔ .YTL çapraz kontrolü', () => {
  it('tarih bazlı dönüşümle tam eşleşme, yuvarlama farkı ve gerçek uyuşmazlığı ayırır', () => {
    const raw = [
      { sourceDate: '2004-12-31', values: { 'TP.DK.USD.A': '1342100.00000000', 'TP.DK.USD.S': '1.00000000', 'TP.DK.EUR.A': '123.45678912' } },
      { sourceDate: '2005-01-03', values: { 'TP.DK.USD.A': '1.33630000', 'TP.DK.USD.S': null, 'TP.DK.EUR.A': null } },
    ];
    const ytl = [
      { sourceDate: '2004-12-31', values: { 'TP.DK.USD.A.YTL': '1.34210000', 'TP.DK.USD.S.YTL': '9.99999999', 'TP.DK.EUR.A.YTL': '0.00012346' } },
      { sourceDate: '2005-01-03', values: { 'TP.DK.USD.A.YTL': '1.33630000', 'TP.DK.USD.S.YTL': '1.34270000', 'TP.DK.EUR.A.YTL': null } },
    ];
    const r = crosscheck(raw, ytl);
    expect(r.exact).toBe(2);
    expect(r.roundingOnly.map((d) => `${d.sourceDate}/${d.currency}.${d.field}`)).toEqual(['2004-12-31/EUR.forexBuying']);
    expect(r.mismatches.map((d) => `${d.sourceDate}/${d.field}`)).toEqual(['2004-12-31/forexSelling']);
    expect(r.missingInRaw.map((d) => d.sourceDate)).toEqual(['2005-01-03']);
  });
});

describe('Depolama', () => {
  it('yıl dosyası her gözlemi tek satıra yazar ve JSON olarak geri okunur', () => {
    const file: YearFile = {
      schemaVersion: 1,
      year: 2020,
      source: 'TCMB_EVDS',
      unit: 'TRY',
      dateConvention: 'determination-date',
      sourceSeries: { USD: { forexBuying: 'TP.DK.USD.A' }, EUR: {}, GBP: {} },
      observations: [
        { date: '2020-01-15', sourceDate: '2020-01-16', currency: 'USD', forexBuying: '5.8827', raw: { forexBuying: '5.88270000' }, fetchedAt: 't', rawChecksum: 'x' },
        { date: '2020-01-16', sourceDate: '2020-01-17', currency: 'USD', forexBuying: '5.8684', raw: { forexBuying: '5.86840000' }, fetchedAt: 't', rawChecksum: 'y' },
      ],
    };
    const text = serializeYearFile(file);
    expect(JSON.parse(text)).toEqual(file);
    expect(text.split('\n').filter((l) => l.includes('"sourceDate"'))).toHaveLength(2);
  });

  it('atomik yazma: içerik değişmediyse dosyaya dokunmaz', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dovizarsiv-'));
    const path = join(dir, 'a', 'b.json');
    expect(writeTextAtomic(path, '{}\n')).toBe(true);
    expect(writeTextAtomic(path, '{}\n')).toBe(false);
    expect(writeTextAtomic(path, '{"x":1}\n')).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe('{"x":1}\n');
  });
});
