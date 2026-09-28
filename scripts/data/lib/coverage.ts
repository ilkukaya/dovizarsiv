/**
 * Kapsam özeti (data/metadata/coverage.json). Başlangıç yılı sabit kodlanmaz; veriden hesaplanır (SPEC §4.7).
 */
import { DAY_PAGES_START } from '../../../src/config/evds-series.ts';
import type { IsoDate } from '../../../src/lib/data/dates.ts';
import type { Observation } from '../../../src/lib/data/model.ts';
import { CURRENCIES, RATE_FIELDS, type CurrencyCode, type RateField } from '../../../src/lib/providers/types.ts';

export interface FieldCoverage {
  first: IsoDate | null;
  last: IsoDate | null;
  count: number;
}

export interface Coverage {
  dateConvention: 'determination-date';
  dayPagesStart: IsoDate;
  /** Son belirlenme günü (sitenin en güncel tarihi). */
  lastDate: IsoDate | null;
  /** O kuru taşıyan EVDS satır tarihi. */
  lastSourceDate: IsoDate | null;
  determinationDays: number;
  currencies: Record<CurrencyCode, Record<RateField, FieldCoverage>>;
}

export function computeCoverage(observations: readonly Observation[]): Coverage {
  const currencies = {} as Coverage['currencies'];
  for (const currency of CURRENCIES) {
    currencies[currency] = {} as Record<RateField, FieldCoverage>;
    for (const field of RATE_FIELDS) currencies[currency][field] = { first: null, last: null, count: 0 };
  }
  let lastDate: IsoDate | null = null;
  let lastSourceDate: IsoDate | null = null;
  const days = new Set<IsoDate>();
  for (const obs of observations) {
    days.add(obs.date);
    if (!lastDate || obs.date > lastDate) {
      lastDate = obs.date;
      lastSourceDate = obs.sourceDate;
    }
    for (const field of RATE_FIELDS) {
      if (obs[field] === undefined) continue;
      const c = currencies[obs.currency][field];
      if (!c.first || obs.date < c.first) c.first = obs.date;
      if (!c.last || obs.date > c.last) c.last = obs.date;
      c.count++;
    }
  }
  return {
    dateConvention: 'determination-date',
    dayPagesStart: DAY_PAGES_START,
    lastDate,
    lastSourceDate,
    determinationDays: days.size,
    currencies,
  };
}
