import { describe, expect, it } from 'vitest';
import { dec } from '../src/lib/calculations/decimal.ts';
import { convert, defaultRateField } from '../src/lib/calculations/convert.ts';
import { dailyChanges, isFlat, seriesOf, summarize, type Point } from '../src/lib/calculations/stats.ts';
import { neighbours, nextObservation, previousObservation, resolveDate } from '../src/lib/data/lookup.ts';
import type { Observation } from '../src/lib/data/model.ts';

const p = (date: string, value: string): Point => ({ date, value: dec(value) });

describe('Aylık/yıllık özet', () => {
  const points = [p('2020-01-02', '5.9491'), p('2020-01-03', '5.9796'), p('2020-01-06', '5.9796'), p('2020-01-07', '5.8810')];
  const s = summarize(points)!;

  it('ilk, son, en düşük, en yüksek (eşitlikte en erken tarih), gözlem sayısı', () => {
    expect(s.count).toBe(4);
    expect(s.first).toEqual(points[0]);
    expect(s.last).toEqual(points[3]);
    expect(s.min.date).toBe('2020-01-07');
    expect(s.max.date).toBe('2020-01-03');
  });

  it('ortalama yalnızca mevcut gözlemlerden hesaplanır', () => {
    // (5.9491 + 5.9796 + 5.9796 + 5.8810) / 4 = 5.947325
    expect(s.mean.toString()).toBe('5.947325');
  });

  it('ilk → son yüzde değişim', () => {
    expect(s.changePct!.round(4).toString()).toBe('-1.1447');
  });

  it('boş dönem için null', () => {
    expect(summarize([])).toBeNull();
  });
});

describe('Günlük değişim ve sabit kur', () => {
  it('değişim bir önceki GERÇEK gözleme göredir (hafta sonu atlanır)', () => {
    const changes = dailyChanges([p('2020-01-10', '5.8810'), p('2020-01-13', '5.8713')]);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.prevDate).toBe('2020-01-10');
    expect(changes[0]!.changePct!.round(4).toString()).toBe('-0.1649');
  });

  it('sabit kur tespiti', () => {
    expect(isFlat([p('1960-01-04', '0.000009'), p('1960-01-05', '0.000009')])).toBe(true);
    expect(isFlat([p('1960-01-04', '0.000009'), p('1960-01-05', '0.0000091')])).toBe(false);
    expect(isFlat([])).toBe(false);
  });

  it('seriesOf yalnızca istenen para birimi ve alanı alır, sıralar', () => {
    const obs = [
      { date: '2020-01-02', currency: 'EUR', forexBuying: '6.6' },
      { date: '2020-01-03', currency: 'USD', forexBuying: '5.9' },
      { date: '2020-01-02', currency: 'USD', forexSelling: '5.95' },
      { date: '2020-01-01', currency: 'USD', forexBuying: '5.8' },
    ] as unknown as Observation[];
    expect(seriesOf(obs, 'USD', 'forexBuying').map((x) => x.date)).toEqual(['2020-01-01', '2020-01-03']);
  });
});

describe('Gözlemsiz gün mantığı', () => {
  const dates = ['2020-01-09', '2020-01-10', '2020-01-13', '2020-01-14'];

  it('hafta sonu istenirse en yakın ÖNCEKİ gözlem kullanılır, istenen tarih ayrıca korunur', () => {
    expect(resolveDate(dates, '2020-01-12')).toEqual({ requestedDate: '2020-01-12', observationDate: '2020-01-10', exact: false });
    expect(resolveDate(dates, '2020-01-13')).toEqual({ requestedDate: '2020-01-13', observationDate: '2020-01-13', exact: true });
    expect(resolveDate(dates, '2019-12-31')).toBeNull();
  });

  it('önceki/sonraki gerçek gözlem (takvim günü değil)', () => {
    expect(previousObservation(dates, '2020-01-13')).toBe('2020-01-10');
    expect(nextObservation(dates, '2020-01-10')).toBe('2020-01-13');
    expect(previousObservation(dates, '2020-01-09')).toBeNull();
    expect(nextObservation(dates, '2020-01-14')).toBeNull();
    expect(nextObservation(dates, '2020-01-11')).toBe('2020-01-13');
  });

  it('yakın tarihler', () => {
    expect(neighbours(dates, '2020-01-10', 5, 5)).toEqual({ before: ['2020-01-09'], after: ['2020-01-13', '2020-01-14'] });
    expect(neighbours(dates, '2020-01-11', 1, 1)).toEqual({ before: ['2020-01-10'], after: ['2020-01-13'] });
  });
});

describe('Hesaplayıcı mantığı', () => {
  it('varsayılan kur türleri: TL → döviz Döviz Satış, döviz → TL Döviz Alış', () => {
    expect(defaultRateField('tryToForeign')).toBe('forexSelling');
    expect(defaultRateField('foreignToTry')).toBe('forexBuying');
  });

  it('1.000 TL kaç USD (15 Ocak 2020, döviz satış 5.8933)', () => {
    const c = convert('tryToForeign', dec('1000'), dec('5.8933'));
    expect(c.rateField).toBe('forexSelling');
    expect(c.result.round(2).toString()).toBe('169.68');
  });

  it('100 USD kaç TL (döviz alış 5.8827) — tam çarpım', () => {
    expect(convert('foreignToTry', dec('100'), dec('5.8827')).result.toString()).toBe('588.27');
  });

  it('geçersiz kur ve tutarı reddeder', () => {
    expect(() => convert('tryToForeign', dec('1'), dec('0'))).toThrow();
    expect(() => convert('tryToForeign', dec('-1'), dec('5'))).toThrow();
  });
});
