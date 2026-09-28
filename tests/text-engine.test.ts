import { describe, expect, it } from 'vitest';
import { dec } from '../src/lib/calculations/decimal.ts';
import { summarize } from '../src/lib/calculations/stats.ts';
import { dayCurrencySection, dayIntro, direction, periodIntro, type DayCurrencyFacts } from '../src/lib/text/engine.ts';

const p = (date: string, value: string) => ({ date, value: dec(value) });
// Ocak 2020 USD döviz satış (gerçek değerlerden kısaltılmış örnek)
const jan = summarize([p('2020-01-02', '5.9796'), p('2020-01-14', '5.8917'), p('2020-01-15', '5.8933'), p('2020-01-31', '5.9780')])!;

function usd(over: Partial<DayCurrencyFacts> = {}): DayCurrencyFacts {
  return {
    currency: 'USD',
    selling: dec('5.8933'),
    buying: dec('5.8827'),
    prevDate: '2020-01-14',
    prevSelling: dec('5.8917'),
    month: jan,
    monthComplete: true,
    yearFirst: { date: '2020-01-02', value: dec('5.9796') },
    priorMax: { date: '2019-05-23', value: dec('6.2') },
    isSeriesStart: false,
    ...over,
  };
}

describe('Metin motoru — yön', () => {
  it('yükseliş / düşüş / yatay (%0,005 altı yatay)', () => {
    expect(direction(dec('0.01'))).toBe('up');
    expect(direction(dec('-0.2'))).toBe('down');
    expect(direction(dec('0.004'))).toBe('flat');
    expect(direction(null)).toBeNull();
  });
});

describe('Metin motoru — gün sayfası', () => {
  it('açılış: değerler, önceki gözleme göre değişim ve ay içi konum; 2–4 cümle', () => {
    const s = dayIntro({ date: '2020-01-15', currencies: [usd()] });
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(s.length).toBeLessThanOrEqual(4);
    expect(s[0]).toBe("TCMB'nin 15 Ocak 2020 tarihinde saat 15.30'da belirlediği döviz satış kurları: ABD Doları 5,8933 TL.");
    expect(s[1]).toBe('Bir önceki gözlem olan 14 Ocak 2020 tarihine göre dolar %0,03 yükseldi.');
    expect(s[2]).toMatch(/^Dolar döviz satış kuru Ocak 2020 ortalamasının %\d+,\d\d altındaydı\.$/);
  });

  it('hepsi aynı yönde: toplu cümle; farklı yönde: tek tek', () => {
    const eur = { ...usd(), currency: 'EUR' as const, selling: dec('6.5622'), prevSelling: dec('6.5613') };
    const gbp = { ...usd(), currency: 'GBP' as const, selling: dec('7.6827'), prevSelling: dec('7.6620') };
    expect(dayIntro({ date: '2020-01-15', currencies: [usd(), eur, gbp] })[1]).toContain('üç kurun tamamı yükseldi');
    const gbpDown = { ...gbp, prevSelling: dec('7.7') };
    const mixed = dayIntro({ date: '2020-01-15', currencies: [usd(), eur, gbpDown] })[1]!;
    expect(mixed).toContain('dolar %0,03 yükseldi');
    expect(mixed).toContain('sterlin %0,22 geriledi');
  });

  it('tatil sonrası: önceki gözlemin kaç gün önce olduğu söylenir', () => {
    const s = dayIntro({ date: '2024-04-15', currencies: [usd({ prevDate: '2024-04-08' })] });
    expect(s[1]).toContain('7 gün önce, 8 Nisan 2024 tarihinde belirlenmişti');
  });

  it('rekor dalı: ay içi konum yerine rekor cümlesi', () => {
    const s = dayIntro({ date: '2020-01-15', currencies: [usd({ priorMax: { date: '2020-01-15', value: dec('5.8933') } })] });
    expect(s[2]).toContain("o güne kadarki en yüksek düzeyidir");
  });

  it('seri başlangıcı: önceki gözlem cümlesi yerine başlangıç cümlesi', () => {
    const s = dayCurrencySection(usd({ prevDate: null, prevSelling: null, isSeriesStart: true }), '2020-01-15');
    expect(s[1]).toContain("EVDS'deki ilk gözlemdir");
  });

  it('ay devam ediyorsa kapsam açıkça belirtilir', () => {
    const s = dayCurrencySection(usd({ monthComplete: false }), '2020-01-15');
    expect(s.join(' ')).toContain('ay devam ediyor');
  });

  it('yılın ilk gözlemi dalı', () => {
    const s = dayCurrencySection(usd({ yearFirst: { date: '2020-01-15', value: dec('5.8933') } }), '2020-01-15');
    expect(s).toContain('Bu, 2020 yılında belirlenen ilk dolar kurudur.');
  });

  it('anlamsız ya da tahmin/yorum içeren ifade üretmez', () => {
    const all = [...dayIntro({ date: '2020-01-15', currencies: [usd()] }), ...dayCurrencySection(usd(), '2020-01-15')].join(' ');
    for (const banned of ['canlı', 'tahmin', 'nedeniyle', 'yatırım', 'en güncel bilgi', 'sitemiz']) expect(all).not.toContain(banned);
  });
});

describe('Metin motoru — dönem sayfası', () => {
  it('sabit kur dalı', () => {
    const flat = summarize([p('1960-01-04', '0.0000028252'), p('1960-01-29', '0.0000028252')])!;
    const s = periodIntro({ currency: 'USD', period: '1960-01', selling: flat, buying: null, complete: true, prevMean: null, endsAtAllTimeHigh: false, flat: true });
    expect(s[1]).toContain('sabit kaldı');
    expect(s).toHaveLength(2);
  });

  it('değişim, en yüksek/en düşük, önceki döneme göre ortalama ve en sert hareketler', () => {
    const s = periodIntro({
      currency: 'USD',
      period: '2020-01',
      selling: jan,
      buying: null,
      complete: true,
      prevMean: { period: '2019-12', value: dec('5.8') },
      endsAtAllTimeHigh: false,
      flat: false,
      sharpestRise: { date: '2020-01-31', pct: dec('0.9') },
      sharpestFall: { date: '2020-01-14', pct: dec('-0.4') },
    });
    expect(s[0]).toBe('Ocak 2020 boyunca TCMB 4 iş gününde dolar kuru belirledi.');
    expect(s[1]).toContain('5,9796 TL ile açıp 5,9780 TL ile kapattı; ilk gözleme göre ▼ %0,03');
    expect(s[3]).toContain('Aralık 2019 ortalamasına göre');
    expect(s[4]).toContain('En sert günlük yükseliş 31 Ocak 2020');
  });
});
