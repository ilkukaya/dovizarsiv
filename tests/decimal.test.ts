import { describe, expect, it } from 'vitest';
import { Decimal, dec, mean, percentChange } from '../src/lib/calculations/decimal.ts';

describe('Decimal ayrıştırma', () => {
  it('EVDS 8 ondalıklı string\'i kanonik biçime çevirir, hassasiyet uydurmaz', () => {
    expect(dec('5.88110000').toString()).toBe('5.8811');
    expect(dec('1342100.00000000').toString()).toBe('1342100');
    expect(dec('0.00000280').toString()).toBe('0.0000028');
    expect(dec('0').toString()).toBe('0');
    expect(dec('-1.50').toString()).toBe('-1.5');
  });

  it('sayısal olmayan değerleri reddeder', () => {
    for (const bad of ['', 'abc', '1,5', '1.2.3', '1e5', ' . ', 'NaN', '--1']) {
      expect(() => dec(bad)).toThrow();
      expect(Decimal.isValid(bad)).toBe(false);
    }
  });
});

describe('Decimal aritmetik', () => {
  it('toplama/çıkarma/çarpma tamdır (float hatası yok)', () => {
    expect(dec('0.1').add(dec('0.2')).toString()).toBe('0.3');
    expect(dec('5.8933').sub(dec('5.8827')).toString()).toBe('0.0106');
    expect(dec('100').mul(dec('5.8827')).toString()).toBe('588.27');
  });

  it('2005 dönüşümü (÷ 10^6) tamdır', () => {
    expect(dec('1342100').shiftLeft(6).toString()).toBe('1.3421');
    expect(dec('2.8').shiftLeft(6).toString()).toBe('0.0000028');
    expect(dec('1.3421').shiftRight(6).toString()).toBe('1342100');
  });

  it('bölme half-even yuvarlar ve sıfıra bölmeyi reddeder', () => {
    expect(dec('1').div(dec('3'), 4).toString()).toBe('0.3333');
    expect(dec('2').div(dec('3'), 4).toString()).toBe('0.6667');
    expect(dec('0.125').div(dec('1'), 2).toString()).toBe('0.12'); // yarı → çift
    expect(dec('0.135').div(dec('1'), 2).toString()).toBe('0.14');
    expect(dec('-0.125').round(2).toString()).toBe('-0.12');
    expect(() => dec('1').div(dec('0'))).toThrow('Sıfıra bölme');
  });

  it('half-up yuvarlama (EVDS .YTL serisinin davranışı)', () => {
    expect(dec('0.000009045').roundHalfUp(8).toString()).toBe('0.00000905');
    expect(dec('0.000009045').round(8).toString()).toBe('0.00000904');
    expect(dec('-1.25').roundHalfUp(1).toString()).toBe('-1.3');
    expect(dec('1.24').roundHalfUp(1).toString()).toBe('1.2');
  });

  it('karşılaştırma ölçekten bağımsızdır', () => {
    expect(dec('1.50').eq(dec('1.5'))).toBe(true);
    expect(dec('1.4999').cmp(dec('1.5'))).toBe(-1);
  });
});

describe('Yüzde değişim ve ortalama', () => {
  it('((yeni − eski) / eski) × 100', () => {
    expect(percentChange(dec('5.8811'), dec('5.8827'))!.round(6).toString()).toBe('0.027206');
    expect(percentChange(dec('100'), dec('90'))!.toString()).toBe('-10');
  });

  it('eski değer sıfırsa null döner', () => {
    expect(percentChange(dec('0'), dec('1'))).toBeNull();
  });

  it('ortalama mevcut gözlemlerin aritmetik ortalamasıdır; boş liste null', () => {
    expect(mean([dec('1'), dec('2'), dec('4')])!.round(6).toString()).toBe('2.333333');
    expect(mean([])).toBeNull();
  });
});
