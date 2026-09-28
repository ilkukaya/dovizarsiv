import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EvdsProvider, parseSeriesResponse } from '../src/lib/providers/evds.ts';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/evds-responses.json', import.meta.url), 'utf8'));
const ARCHIVE_CODES = ['TP.DK.USD.A', 'TP.DK.USD.S', 'TP.DK.USD.C', 'TP.DK.EUR.A', 'TP.DK.EUR.S', 'TP.DK.EUR.C'];

describe('EVDS yanıt ayrıştırma', () => {
  it('gerçek EVDS yanıtını ISO tarihli satırlara çevirir; hafta sonu satırları null değerlidir', () => {
    const rows = parseSeriesResponse(fixtures.archive_2004_2005, ARCHIVE_CODES);
    expect(rows).toHaveLength(10);
    expect(rows[0]).toEqual({
      sourceDate: '2004-12-27',
      values: {
        'TP.DK.USD.A': '1364000.00000000',
        'TP.DK.USD.S': '1370600.00000000',
        'TP.DK.USD.C': '1.00000000',
        'TP.DK.EUR.A': '1845500.00000000',
        'TP.DK.EUR.S': '1854400.00000000',
        'TP.DK.EUR.C': '1.35300000',
      },
    });
    const newYear = rows.find((r) => r.sourceDate === '2005-01-01')!;
    expect(Object.values(newYear.values).every((v) => v === null)).toBe(true);
  });

  it('bilinmeyen alanı reddeder (şema değişikliği)', () => {
    expect(() => parseSeriesResponse(fixtures.archive_2020_01, ['TP.DK.USD.A'])).toThrow('bilinmeyen alan');
  });

  it('kırpılmış yanıtı reddeder (1000 gözlem sınırı)', () => {
    expect(() => parseSeriesResponse({ totalCount: 5, items: [] }, ['X'])).toThrow('kırpılmış');
    const many = { items: Array.from({ length: 1000 }, (_, i) => ({ Tarih: `01-01-${1000 + i}` })) };
    expect(() => parseSeriesResponse(many, ['X'])).toThrow('1000');
  });

  it('duplike tarihi ve string olmayan değeri reddeder', () => {
    expect(() => parseSeriesResponse({ items: [{ Tarih: '01-01-2020' }, { Tarih: '01-01-2020' }] }, ['X'])).toThrow('duplike');
    expect(() => parseSeriesResponse({ items: [{ Tarih: '01-01-2020', X: 5 }] }, ['X'])).toThrow('string değil');
  });

  it('geçersiz tarihi reddeder', () => {
    expect(() => parseSeriesResponse({ items: [{ Tarih: '31-02-2020' }] }, ['X'])).toThrow();
  });
});

function fakeFetch(responses: Array<{ status: number; body: unknown }>) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: init?.headers as Record<string, string> });
    const next = responses.shift() ?? { status: 200, body: { items: [] } };
    return new Response(typeof next.body === 'string' ? next.body : JSON.stringify(next.body), { status: next.status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const noSleep = async () => {};

describe('EVDS provider', () => {
  it('anahtarı yalnızca `key` header\'ında gönderir, URL\'e koymaz', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: fixtures.archive_2020_01 }]);
    const p = new EvdsProvider({ apiKey: 'GIZLI-ANAHTAR', fetchImpl: impl, sleep: noSleep, minIntervalMs: 0 });
    await p.fetchRows(ARCHIVE_CODES, '2020-01-10', '2020-01-17');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.headers.key).toBe('GIZLI-ANAHTAR');
    expect(calls[0]!.url).not.toContain('GIZLI-ANAHTAR');
    expect(calls[0]!.url).toBe(
      'https://evds3.tcmb.gov.tr/igmevdsms-dis/series=TP.DK.USD.A-TP.DK.USD.S-TP.DK.USD.C-TP.DK.EUR.A-TP.DK.EUR.S-TP.DK.EUR.C&startDate=10-01-2020&endDate=17-01-2020&type=json',
    );
  });

  it('uzun aralığı ≤ 700 günlük parçalara böler', async () => {
    const { impl, calls } = fakeFetch([]);
    const p = new EvdsProvider({ apiKey: 'k', fetchImpl: impl, sleep: noSleep, minIntervalMs: 0 });
    await p.fetchRows(['X'], '2000-01-01', '2004-12-31');
    expect(calls.length).toBe(3);
    expect(calls[0]!.url).toContain('startDate=01-01-2000&endDate=30-11-2001');
    expect(calls[2]!.url).toContain('endDate=31-12-2004');
  });

  it('5xx hatasında üstel geri çekilmeyle yeniden dener', async () => {
    const { impl, calls } = fakeFetch([
      { status: 503, body: 'bakım' },
      { status: 502, body: 'bakım' },
      { status: 200, body: { items: [] } },
    ]);
    const delays: number[] = [];
    const p = new EvdsProvider({ apiKey: 'k', fetchImpl: impl, sleep: async (ms) => void delays.push(ms), minIntervalMs: 0 });
    await p.fetchRows(['X'], '2020-01-01', '2020-01-02');
    expect(calls).toHaveLength(3);
    expect(delays).toEqual([2000, 4000]);
  });

  it('4xx hatasında durur ve hata mesajında anahtarı maskeler', async () => {
    const { impl } = fakeFetch([{ status: 403, body: 'yanlış anahtar GIZLI-ANAHTAR' }]);
    const p = new EvdsProvider({ apiKey: 'GIZLI-ANAHTAR', fetchImpl: impl, sleep: noSleep, minIntervalMs: 0 });
    const error = await p.fetchRows(['X'], '2020-01-01', '2020-01-02').catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('403');
    expect((error as Error).message).not.toContain('GIZLI-ANAHTAR');
  });

  it('anahtar yoksa oluşturulamaz', () => {
    expect(() => new EvdsProvider({ apiKey: '' })).toThrow('EVDS_API_KEY');
  });
});
