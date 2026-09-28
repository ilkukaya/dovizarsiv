/**
 * Rota kaydı: tüm sayfalar, türleri, indekslenebilirlik kararları, sitemap grupları ve lastmod.
 * Sitemap yalnızca buradan üretilir; sayfalar aynı kararı buradan alır (tek doğruluk kaynağı). DOKUNULMAZ (HANDOFF.md).
 *
 * lastmod: build tarihi DEĞİLDİR. Veri sayfalarında sayfadaki gözlemlerin en son çekilme/revizyon anı
 * (Observation.fetchedAt), statik sayfalarda STATIC_CONTENT_UPDATED.
 */
import { CURRENCY_ORDER } from '../../config/currencies.ts';
import { DATE_SITEMAP_YEARS, STATIC_CONTENT_UPDATED } from '../../config/indexing.ts';
import type { CurrencyCode } from '../providers/types.ts';
import type { IsoDate } from '../data/dates.ts';
import {
  dayObservations,
  dayPageDates,
  isFlatPeriod,
  monthsOf,
  observationsOf,
  periodObservations,
  yearsOf,
} from '../data/store.ts';
import { isIndexablePage, type IndexabilityDecision, type PageKind } from './indexable.ts';
import { paths } from './urls.ts';

export interface RouteEntry {
  path: string;
  kind: PageKind;
  decision: IndexabilityDecision;
  lastmod?: IsoDate;
  sitemap: string;
}

function maxFetched(list: ReadonlyArray<{ fetchedAt: string }>): IsoDate | undefined {
  let max = '';
  for (const o of list) if (o.fetchedAt > max) max = o.fetchedAt;
  return max ? max.slice(0, 10) : undefined;
}

export function monthDecision(currency: CurrencyCode, yearMonth: string): IndexabilityDecision {
  const obs = periodObservations(currency, yearMonth);
  return isIndexablePage({
    kind: 'month',
    isCanonical: true,
    observationCount: obs.length,
    flat: isFlatPeriod(currency, yearMonth),
    hasSourceDisclosure: true,
  });
}

export function yearDecision(currency: CurrencyCode, year: number): IndexabilityDecision {
  const obs = periodObservations(currency, String(year));
  return isIndexablePage({
    kind: 'year',
    isCanonical: true,
    observationCount: obs.length,
    flat: isFlatPeriod(currency, String(year)),
    hasSourceDisclosure: true,
  });
}

export function dayDecision(date: IsoDate): IndexabilityDecision {
  const count = Object.keys(dayObservations(date)).length;
  return isIndexablePage({ kind: 'day', isCanonical: true, observationCount: count, hasSourceDisclosure: true });
}

let cache: RouteEntry[] | null = null;

export function allRoutes(): RouteEntry[] {
  if (cache) return cache;
  const routes: RouteEntry[] = [];
  const staticDecision = (kind: PageKind) => isIndexablePage({ kind, isCanonical: true });
  const latest = maxFetched(CURRENCY_ORDER.flatMap((c) => observationsOf(c).slice(-1)));

  routes.push({ path: paths.home(), kind: 'home', decision: staticDecision('home'), lastmod: latest, sitemap: 'pages' });
  routes.push({ path: paths.archive(), kind: 'archive', decision: staticDecision('archive'), lastmod: latest, sitemap: 'pages' });
  routes.push({ path: paths.methodology(), kind: 'info', decision: staticDecision('info'), lastmod: STATIC_CONTENT_UPDATED, sitemap: 'pages' });
  routes.push({ path: paths.sources(), kind: 'info', decision: staticDecision('info'), lastmod: STATIC_CONTENT_UPDATED, sitemap: 'pages' });

  const dayYears = [...new Set(dayPageDates().map((d) => Number(d.slice(0, 4))))];
  for (const year of dayYears) {
    const days = dayPageDates().filter((d) => d.startsWith(`${year}-`));
    routes.push({
      path: paths.archiveYear(year),
      kind: 'archive-year',
      decision: staticDecision('archive-year'),
      lastmod: maxFetched(days.flatMap((d) => Object.values(dayObservations(d)))),
      sitemap: 'pages',
    });
  }

  for (const c of CURRENCY_ORDER) {
    const obs = observationsOf(c);
    routes.push({
      path: paths.hub(c),
      kind: 'hub',
      decision: isIndexablePage({ kind: 'hub', isCanonical: true, observationCount: obs.length, hasSourceDisclosure: true }),
      lastmod: maxFetched(obs.slice(-1)),
      sitemap: 'currencies',
    });
    for (const year of yearsOf(c)) {
      routes.push({
        path: paths.year(c, year),
        kind: 'year',
        decision: yearDecision(c, year),
        lastmod: maxFetched(periodObservations(c, String(year))),
        sitemap: 'years',
      });
    }
    for (const ym of monthsOf(c)) {
      routes.push({
        path: paths.month(c, ym),
        kind: 'month',
        decision: monthDecision(c, ym),
        lastmod: maxFetched(periodObservations(c, ym)),
        sitemap: 'months',
      });
    }
  }

  for (const date of dayPageDates()) {
    routes.push({
      path: paths.day(date),
      kind: 'day',
      decision: dayDecision(date),
      lastmod: maxFetched(Object.values(dayObservations(date))),
      sitemap: `dates-${date.slice(0, 4)}`,
    });
  }
  cache = routes;
  return routes;
}

/** Sitemap index'te yer alan gruplar (kademeli indeksleme). */
export function activeSitemapGroups(): string[] {
  const groups = ['pages', 'currencies', 'years', 'months'];
  const dayYears = new Set(dayPageDates().map((d) => Number(d.slice(0, 4))));
  for (const y of [...DATE_SITEMAP_YEARS].sort((a, b) => b - a)) if (dayYears.has(y)) groups.push(`dates-${y}`);
  return groups;
}

/** Tüm sitemap grupları (dosyası üretilenler). */
export function allSitemapGroups(): string[] {
  return [...new Set(allRoutes().map((r) => r.sitemap))];
}
