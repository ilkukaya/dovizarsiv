/**
 * Gün sayfası görünüm modeli (/tarih/YYYY-MM-DD/). Tüm sayılar veriden; metinler metin motorundan.
 */
import { CURRENCY_ORDER } from '../../config/currencies.ts';
import { Decimal, percentChange } from '../calculations/decimal.ts';
import { convert } from '../calculations/convert.ts';
import { monthKey, type IsoDate } from '../data/dates.ts';
import type { Observation } from '../data/model.ts';
import { REDENOMINATION } from '../../config/evds-series.ts';
import {
  adjacentDates,
  dayObservations,
  firstDate,
  lastDate,
  observationsOf,
  periodObservations,
  periodSummary,
  previousObservation,
  validOn,
} from '../data/store.ts';
import type { DayCurrencyFacts, DayFacts } from '../text/engine.ts';
import type { CurrencyCode } from '../providers/types.ts';

const runningMaxCache = new Map<CurrencyCode, Map<IsoDate, { date: IsoDate; value: Decimal }>>();

/** Her tarih için o güne KADAR (dahil) görülen en yüksek Döviz Satış. */
function runningMax(currency: CurrencyCode): Map<IsoDate, { date: IsoDate; value: Decimal }> {
  let map = runningMaxCache.get(currency);
  if (map) return map;
  map = new Map();
  let best: { date: IsoDate; value: Decimal } | null = null;
  for (const o of observationsOf(currency)) {
    if (!o.forexSelling) continue;
    const v = Decimal.parse(o.forexSelling);
    if (!best || v.cmp(best.value) > 0) best = { date: o.date, value: v };
    map.set(o.date, best);
  }
  runningMaxCache.set(currency, map);
  return map;
}

export interface CurrencyDayView {
  currency: CurrencyCode;
  obs: Observation;
  prev: Observation | undefined;
  changeSelling: Decimal | null;
  changeBuying: Decimal | null;
  /** Bu tarihte GEÇERLİ olan kur (EVDS satırı bu tarihe denk gelen ya da önceki son kur). */
  validRate: Observation | undefined;
  facts: DayCurrencyFacts;
  /** 2005 öncesi belirlenen kurlar için eski TL değerleri. */
  oldTl: { forexBuying?: string; forexSelling?: string; calculated: boolean } | null;
}

export interface ReadyCalc {
  label: string;
  amount: string;
  currency: CurrencyCode;
  result: Decimal;
  rateField: 'forexSelling' | 'forexBuying';
}

export interface DayView {
  date: IsoDate;
  currencies: CurrencyDayView[];
  facts: DayFacts;
  prevDate: IsoDate | null;
  nextDate: IsoDate | null;
  hasCash: boolean;
  preRedenomination: boolean;
  tryToForeign: ReadyCalc[];
  foreignToTry: ReadyCalc[];
}

export function buildDayView(date: IsoDate): DayView {
  const day = dayObservations(date);
  const month = monthKey(date);
  const monthComplete = month < monthKey(lastDate());
  const currencies: CurrencyDayView[] = [];
  for (const currency of CURRENCY_ORDER) {
    const obs = day[currency];
    if (!obs || !obs.forexSelling || !obs.forexBuying) continue;
    const prev = previousObservation(currency, date);
    const selling = Decimal.parse(obs.forexSelling);
    const buying = Decimal.parse(obs.forexBuying);
    const prevSelling = prev?.forexSelling ? Decimal.parse(prev.forexSelling) : null;
    const prevBuying = prev?.forexBuying ? Decimal.parse(prev.forexBuying) : null;
    const yearObs = periodObservations(currency, date.slice(0, 4)).find((o) => o.forexSelling);
    const facts: DayCurrencyFacts = {
      currency,
      selling,
      buying,
      prevDate: prev?.date ?? null,
      prevSelling,
      month: periodSummary(currency, month).forexSelling ?? null,
      monthComplete,
      yearFirst: yearObs ? { date: yearObs.date, value: Decimal.parse(yearObs.forexSelling!) } : null,
      priorMax: runningMax(currency).get(date) ?? null,
      isSeriesStart: firstDate(currency) === date,
    };
    let oldTl: CurrencyDayView['oldTl'] = null;
    if (date < REDENOMINATION.effectiveSourceDate) {
      if (obs.normalization) {
        oldTl = { forexBuying: obs.raw.forexBuying, forexSelling: obs.raw.forexSelling, calculated: false };
      } else {
        // Ör. 31.12.2004'te belirlenen kur EVDS'de 03.01.2005 satırında zaten YTL'dir; eski TL karşılığı hesaplanır.
        oldTl = {
          forexBuying: buying.shiftRight(REDENOMINATION.factorExponent).toString(),
          forexSelling: selling.shiftRight(REDENOMINATION.factorExponent).toString(),
          calculated: true,
        };
      }
    }
    currencies.push({
      currency,
      obs,
      prev,
      changeSelling: prevSelling ? percentChange(prevSelling, selling) : null,
      changeBuying: prevBuying ? percentChange(prevBuying, buying) : null,
      validRate: validOn(currency, date),
      facts,
      oldTl,
    });
  }
  const { prev, next } = adjacentDates(date);
  const tryToForeign: ReadyCalc[] = [];
  const foreignToTry: ReadyCalc[] = [];
  for (const c of currencies) {
    for (const amount of ['100', '1000', '10000']) {
      tryToForeign.push({
        label: `${amount} TL`,
        amount,
        currency: c.currency,
        result: convert('tryToForeign', Decimal.parse(amount), c.facts.selling).result,
        rateField: 'forexSelling',
      });
    }
    for (const amount of ['1', '100', '1000']) {
      foreignToTry.push({
        label: amount,
        amount,
        currency: c.currency,
        result: convert('foreignToTry', Decimal.parse(amount), c.facts.buying).result,
        rateField: 'forexBuying',
      });
    }
  }
  return {
    date,
    currencies,
    facts: { date, currencies: currencies.map((c) => c.facts) },
    prevDate: prev,
    nextDate: next,
    hasCash: currencies.some((c) => c.obs.cashBuying || c.obs.cashSelling),
    preRedenomination: date < REDENOMINATION.effectiveSourceDate,
    tryToForeign,
    foreignToTry,
  };
}
