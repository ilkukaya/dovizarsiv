import { describe, expect, it } from 'vitest';
import { dec } from '../src/lib/calculations/decimal.ts';
import { addDays, evdsToIso, isoToEvds, isValidIsoDate, weekday } from '../src/lib/data/dates.ts';
import { decadeLabel, formatChange, formatDate, formatDateLong, formatMonth, formatNumber, formatRate, roundRate } from '../src/lib/formatting/format.ts';

describe('tr-TR sayı biçimleri', () => {
  it('kur: 4 ondalık, virgül ayırıcı', () => {
    expect(formatRate('5.8827')).toBe('5,8827');
    expect(formatRate('32.2854')).toBe('32,2854');
    expect(formatRate(dec('1.3421'))).toBe('1,3421');
  });

  it('binlik ayırıcı nokta; float\'a çevirmeden yuvarlar', () => {
    expect(formatNumber('1342100', 0, 0)).toBe('1.342.100');
    expect(formatNumber('1234567.505', 2, 2)).toBe('1.234.567,50'); // half-even
    expect(formatNumber('0.1', 2, 2)).toBe('0,10');
  });

  it('hareket gösterimi ok + yüzde, renge bağımlı değil', () => {
    expect(formatChange(dec('1.2449'))).toBe('▲ %1,24');
    expect(formatChange(dec('-0.7251'))).toBe('▼ %0,73');
    expect(formatChange(dec('0.001'))).toBe('● %0,00');
    expect(formatChange(null)).toBe('—');
  });
});

describe('tr-TR tarih biçimleri', () => {
  it('görünen tarih: "15 Ocak 2020, Çarşamba"', () => {
    expect(formatDateLong('2020-01-15')).toBe('15 Ocak 2020, Çarşamba');
    expect(formatDate('2004-12-31')).toBe('31 Aralık 2004');
    expect(formatMonth('2020-01')).toBe('Ocak 2020');
    expect(formatDateLong('2024-02-29')).toBe('29 Şubat 2024, Perşembe');
  });

  it('ISO tarih doğrulama ve EVDS dönüşümü', () => {
    expect(isValidIsoDate('2020-02-31')).toBe(false);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2023-02-29')).toBe(false);
    expect(evdsToIso('15-01-2020')).toBe('2020-01-15');
    expect(isoToEvds('2020-01-15')).toBe('15-01-2020');
    expect(() => evdsToIso('2020-01-15')).toThrow();
  });

  it('gün aritmetiği UTC\'dir (yerel saat kayması yok)', () => {
    expect(addDays('2020-03-28', 2)).toBe('2020-03-30');
    expect(addDays('2004-12-31', 3)).toBe('2005-01-03');
    expect(weekday('2020-01-15')).toBe(3);
  });
});

describe('onluk yıl etiketi', () => {
  it('ünlü uyumu', () => {
    expect([1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map(decadeLabel)).toEqual([
      "1950'ler", "1960'lar", "1970'ler", "1980'ler", "1990'lar", "2000'ler", "2010'lar", "2020'ler",
    ]);
  });
});

describe('formatRate: küçük (yeni TL\'ye çevrilmiş eski) değerler', () => {
  it('|değer| ≥ 1: 4 ondalık; değişmedi', () => {
    expect(formatRate('5.8827')).toBe('5,8827');
    expect(formatRate('1')).toBe('1,0000');
    expect(formatRate('48.9008')).toBe('48,9008');
  });
  it('|değer| < 1: en az 4, en çok 8 ondalık; anlamlı basamak kaybolmaz', () => {
    expect(formatRate('0.00050783')).toBe('0,00050783');
    expect(formatRate('0.411728')).toBe('0,411728');
    expect(formatRate('0.5')).toBe('0,5000');
    expect(formatRate('0.0000028252')).toBe('0,00000283');
  });
  it('açık ondalık sayısı verilirse aynen uygulanır (yüzde, hizalı tablolar)', () => {
    expect(formatRate('0.411728', 4)).toBe('0,4117');
    expect(formatRate('5.8827', 2)).toBe('5,88');
    expect(formatRate('0.00050783', 8)).toBe('0,00050783');
  });
  it('roundRate: ≥ 1 için 4, < 1 için 8 ondalık', () => {
    expect(roundRate(dec('7.023412345')).toString()).toBe('7.0234');
    expect(roundRate(dec('0.000712345678')).toString()).toBe('0.00071235');
  });
});
