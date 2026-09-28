/**
 * EVDS seri kaydı (registry). EVDS seri kodlarının kod tabanındaki TEK yeri (SPEC §4.1, §4.3).
 *
 * Kodlar EVDS metadata servislerinden doğrulandı (docs/DECISIONS.md D-004, 2026-09-28) ve
 * `npm run data:discover` her çalıştığında yeniden doğrulanır; uyuşmazlıkta hata verir.
 *
 * Ham kaynak = "Arşiv" seri ailesi (2005 öncesi eski TL, TCMB'nin yayımladığı gibi).
 * Çapraz kontrol = ".YTL" ailesi (2005 öncesi EVDS tarafından 1.000.000'a bölünmüş). Owner kararı: D-005, Faz 1 kararı #3.
 */
import type { CurrencyCode, RateField } from '../lib/providers/types.ts';

export interface SeriesPair {
  /** Ham kaynak (arşiv ailesi). */
  raw: string;
  /** Çapraz kontrol (.YTL ailesi). */
  crosscheck: string;
}

export interface DatagroupExpectation {
  code: string;
  /** EVDS'deki ad birebir bu olmalı. */
  name: string;
  frequency: 'GÜNLÜK';
  /** Metadata'daki birim alanı (arşiv gruplarında boş). */
  unit: string;
}

export const EVDS_DATAGROUPS = {
  forexRaw: { code: 'bie_dkdovizgn', name: 'Kurlar-Döviz Kurları (Arşiv)', frequency: 'GÜNLÜK', unit: '' },
  cashRaw: { code: 'bie_dkefektif', name: 'Kurlar-Efektif Kurlar (Arşiv)', frequency: 'GÜNLÜK', unit: '' },
  forexCrosscheck: { code: 'bie_dkdovytl', name: 'Döviz Kurları', frequency: 'GÜNLÜK', unit: 'Türk lirası' },
  cashCrosscheck: { code: 'bie_dkefkytl', name: 'Efektif Kurlar', frequency: 'GÜNLÜK', unit: 'Türk lirası' },
} as const satisfies Record<string, DatagroupExpectation>;

export interface SeriesEntry extends SeriesPair {
  /** EVDS'deki seri adı (boşluklar tekilleştirilerek) bu ifadeyi içermeli (ham seri). */
  rawNameIncludes: string;
  /** EVDS'deki seri adı bu ifadeyi içermeli (çapraz kontrol serisi). */
  crosscheckNameIncludes: string;
}

export const EVDS_SERIES: Record<CurrencyCode, Record<RateField, SeriesEntry>> = {
  USD: {
    forexBuying: { raw: 'TP.DK.USD.A', crosscheck: 'TP.DK.USD.A.YTL', rawNameIncludes: '(Döviz Alış)', crosscheckNameIncludes: '(Döviz Alış)' },
    forexSelling: { raw: 'TP.DK.USD.S', crosscheck: 'TP.DK.USD.S.YTL', rawNameIncludes: '(Döviz Satış)', crosscheckNameIncludes: '(Döviz Satış)' },
    cashBuying: { raw: 'TP.DK.USD.A.EF', crosscheck: 'TP.DK.USD.A.EF.YTL', rawNameIncludes: '(Efektif Alış)', crosscheckNameIncludes: '(Efektif Alış)' },
    cashSelling: { raw: 'TP.DK.USD.S.EF', crosscheck: 'TP.DK.USD.S.EF.YTL', rawNameIncludes: '(Efektif Satış)', crosscheckNameIncludes: '(Efektif Satış)' },
  },
  EUR: {
    forexBuying: { raw: 'TP.DK.EUR.A', crosscheck: 'TP.DK.EUR.A.YTL', rawNameIncludes: '(Döviz Alış)', crosscheckNameIncludes: '(Döviz Alış)' },
    forexSelling: { raw: 'TP.DK.EUR.S', crosscheck: 'TP.DK.EUR.S.YTL', rawNameIncludes: '(Döviz Satış)', crosscheckNameIncludes: '(Döviz Satış)' },
    cashBuying: { raw: 'TP.DK.EUR.A.EF', crosscheck: 'TP.DK.EUR.A.EF.YTL', rawNameIncludes: '(Efektif Alış)', crosscheckNameIncludes: '(Efektif Alış)' },
    cashSelling: { raw: 'TP.DK.EUR.S.EF', crosscheck: 'TP.DK.EUR.S.EF.YTL', rawNameIncludes: '(Efektif Satış)', crosscheckNameIncludes: '(Efektif Satış)' },
  },
  GBP: {
    forexBuying: { raw: 'TP.DK.GBP.A', crosscheck: 'TP.DK.GBP.A.YTL', rawNameIncludes: '(Döviz Alış)', crosscheckNameIncludes: '(Döviz Alış)' },
    forexSelling: { raw: 'TP.DK.GBP.S', crosscheck: 'TP.DK.GBP.S.YTL', rawNameIncludes: '(Döviz Satış)', crosscheckNameIncludes: '(Döviz Satış)' },
    cashBuying: { raw: 'TP.DK.GBP.A.EF', crosscheck: 'TP.DK.GBP.A.EF.YTL', rawNameIncludes: '(Efektif Alış)', crosscheckNameIncludes: '(Efektif Alış)' },
    cashSelling: { raw: 'TP.DK.GBP.S.EF', crosscheck: 'TP.DK.GBP.S.EF.YTL', rawNameIncludes: '(Efektif Satış)', crosscheckNameIncludes: '(Efektif Satış)' },
  },
};

/** 2005 para reformu: 1 YTL = 1.000.000 TL. Ham seri bu tarihten önce eski TL cinsindendir. */
export const REDENOMINATION = {
  reason: '2005_redenomination',
  /** Ham serinin KAYNAK (EVDS) tarihi bu günden önceyse değer eski TL'dir (D-005, D-012). */
  effectiveSourceDate: '2005-01-01',
  factorExponent: 6,
  factor: '1000000',
} as const;

/** Tam geçmiş çekiminin başlangıcı (EVDS metadata START_DATE en erken = 1950-01-02). */
export const HISTORY_START = '1950-01-01';

/** Gün sayfaları bu tarihten itibaren üretilir (owner kararı, Faz 1 #1). */
export const DAY_PAGES_START = '2000-01-01';

export function allRawCodes(): string[] {
  return Object.values(EVDS_SERIES).flatMap((fields) => Object.values(fields).map((s) => s.raw));
}

export function allCrosscheckCodes(): string[] {
  return Object.values(EVDS_SERIES).flatMap((fields) => Object.values(fields).map((s) => s.crosscheck));
}
