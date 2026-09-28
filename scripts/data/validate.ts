/**
 * npm run data:validate — yerel verinin bütünlük kontrolü (SPEC §4.6, §11.7).
 * Kapsam, duplikeler, geçersiz tarih/değer, 2005 dönüşümü, tarih konvansiyonu tutarlılığı, güncellik,
 * API anahtarı sızıntısı ve mock veri. Ciddi hatada çıkış kodu 1.
 */
import { readFileSync } from 'node:fs';
import { DAY_PAGES_START, EVDS_SERIES, REDENOMINATION } from '../../src/config/evds-series.ts';
import { Decimal } from '../../src/lib/calculations/decimal.ts';
import { buildDeterminationIndex } from '../../src/lib/data/convention.ts';
import { daysBetween, isValidIsoDate, todayIstanbul, yearOf } from '../../src/lib/data/dates.ts';
import { SCHEMA_VERSION, type Observation } from '../../src/lib/data/model.ts';
import { isPreRedenomination, toTry } from '../../src/lib/data/normalize.ts';
import { CURRENCIES, RATE_FIELDS } from '../../src/lib/providers/types.ts';
import { annotate, loadEnv, parseArgs } from './lib/env.ts';
import { listYearFiles, readJson, readUnmapped, readYearFile, metadataPath, yearFilePath } from './lib/storage.ts';

/** En uzun resmî tatil zinciri (9 günlük bayram + hafta sonları) için pay. */
const MAX_STALENESS_DAYS = 16;
const MAX_DETERMINATION_GAP_DAYS = 14;

const errors: string[] = [];
const warnings: string[] = [];
const fail = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

function main(): void {
  loadEnv();
  const { flags } = parseArgs(process.argv.slice(2));
  const years = listYearFiles();
  if (years.length === 0) {
    fail('data/normalized altında hiç yıl dosyası yok. Önce: npm run data:update -- --full');
    return report();
  }

  const all: Observation[] = [];
  const keys = new Set<string>();
  const sourceKeys = new Set<string>();
  for (const year of years) {
    const file = readYearFile(year);
    if (file.schemaVersion !== SCHEMA_VERSION) fail(`${year}: schemaVersion ${file.schemaVersion} beklenen ${SCHEMA_VERSION}`);
    if (file.year !== year) fail(`${year}.json içindeki year alanı ${file.year}`);
    if (file.source !== 'TCMB_EVDS') fail(`${year}: bilinmeyen kaynak "${String(file.source)}" (mock veri yasak)`);
    if (file.unit !== 'TRY') fail(`${year}: beklenmeyen birim ${String(file.unit)}`);
    if (file.dateConvention !== 'determination-date') fail(`${year}: beklenmeyen tarih konvansiyonu`);
    let prev = '';
    for (const obs of file.observations) {
      const id = `${obs.date}/${obs.currency}`;
      if (!isValidIsoDate(obs.date) || !isValidIsoDate(obs.sourceDate)) fail(`${id}: geçersiz tarih`);
      if (yearOf(obs.date) !== year) fail(`${id}: yanlış yıl dosyasında (${year})`);
      if (!CURRENCIES.includes(obs.currency)) fail(`${id}: bilinmeyen para birimi`);
      const order = `${obs.date}/${CURRENCIES.indexOf(obs.currency)}`;
      if (order <= prev) fail(`${id}: sıralama bozuk`);
      prev = order;
      if (keys.has(id)) fail(`${id}: duplike tarih/para birimi`);
      keys.add(id);
      const sid = `${obs.sourceDate}/${obs.currency}`;
      if (sourceKeys.has(sid)) fail(`${sid}: duplike kaynak satırı`);
      sourceKeys.add(sid);
      if (obs.sourceDate <= obs.date) fail(`${id}: kaynak tarihi (${obs.sourceDate}) belirlenme gününden sonra olmalı`);
      // Belirlenme ile geçerlilik arasında uzun boşluk = kaynakta eksik veri olabilir (en uzun bayram zinciri ~10 gün).
      const gap = daysBetween(obs.date, obs.sourceDate);
      if (gap > MAX_DETERMINATION_GAP_DAYS) {
        (obs.date >= '1990-01-01' ? fail : warn)(`${id}: belirlenme günü ile kaynak satırı arasında ${gap} gün (${obs.sourceDate}); kaynakta boşluk olabilir`);
      }
      const allowed = new Set([...RATE_FIELDS, 'date', 'sourceDate', 'currency', 'raw', 'fetchedAt', 'rawChecksum', 'normalization']);
      for (const key of Object.keys(obs)) if (!allowed.has(key)) fail(`${id}: bilinmeyen alan ${key}`);
      for (const field of RATE_FIELDS) {
        const value = obs[field];
        const raw = obs.raw[field];
        if ((value === undefined) !== (raw === undefined)) {
          fail(`${id}.${field}: normalize ve ham değer birlikte olmalı`);
          continue;
        }
        if (value === undefined || raw === undefined) continue;
        if (!Decimal.isValid(value) || !Decimal.isValid(raw)) {
          fail(`${id}.${field}: sayısal olmayan değer`);
          continue;
        }
        const v = Decimal.parse(value);
        if (v.isNegative() || v.isZero()) fail(`${id}.${field}: pozitif olmayan değer ${value}`);
        if (!toTry(Decimal.parse(raw), obs.sourceDate).eq(v)) fail(`${id}.${field}: ham→TRY dönüşümü tutarsız (${raw} → ${value})`);
      }
      const pre = isPreRedenomination(obs.sourceDate);
      if (pre && obs.normalization?.factor !== REDENOMINATION.factor) fail(`${id}: 2005 öncesi kaynak satırında normalization işareti yok`);
      if (!pre && obs.normalization) fail(`${id}: 2005 sonrası kaynak satırında normalization işareti var`);
      for (const [buy, sell] of [['forexBuying', 'forexSelling'], ['cashBuying', 'cashSelling']] as const) {
        const b = obs[buy];
        const s = obs[sell];
        if (b && s && Decimal.parse(b).cmp(Decimal.parse(s)) > 0) {
          // Kaynak tutarsızlığı tamir edilmez. Gün sayfası kapsamında (DAY_PAGES_START+) hata, öncesinde uyarı.
          (obs.date >= DAY_PAGES_START ? fail : warn)(`${id}: ${buy} (${b}) > ${sell} (${s}) — kaynakta (EVDS ${obs.sourceDate}) böyle`);
        }
      }
      all.push(obs);
    }
  }

  // Tarih konvansiyonu: depodaki tüm kaynak tarihlerinden eşleme yeniden kurulur ve karşılaştırılır.
  const sourceDates = [...all.map((o) => o.sourceDate), ...readUnmapped().map((u) => u.sourceDate)];
  const index = buildDeterminationIndex(sourceDates);
  for (const obs of all) {
    const expected = index.determinedOn(obs.sourceDate);
    if (expected !== obs.date) fail(`${obs.sourceDate}/${obs.currency}: belirlenme günü ${obs.date}, eşleme fonksiyonu ${String(expected)} diyor`);
  }

  // Kapsam: etkin her para birimi için döviz alış/satış verisi olmalı.
  for (const currency of CURRENCIES) {
    for (const field of ['forexBuying', 'forexSelling'] as const) {
      if (!all.some((o) => o.currency === currency && o[field] !== undefined)) fail(`${currency}.${field}: hiç veri yok`);
    }
  }

  // Güncellik.
  const lastDate = all.reduce((m, o) => (o.date > m ? o.date : m), '');
  const age = daysBetween(lastDate, todayIstanbul());
  if (age > MAX_STALENESS_DAYS) fail(`Son belirlenme günü ${lastDate}, ${age} gün önce (sınır ${MAX_STALENESS_DAYS})`);
  else if (age > 4 && !flags.has('allow-stale')) warn(`Son belirlenme günü ${lastDate}, ${age} gün önce`);

  // API anahtarı sızıntısı.
  const key = process.env.EVDS_API_KEY;
  if (key && key.length >= 6) {
    for (const year of years) {
      if (readFileSync(yearFilePath(year), 'utf8').includes(key)) fail(`${year}.json EVDS API anahtarını içeriyor!`);
    }
    for (const name of ['coverage.json', 'series.json', 'revisions.json', 'crosscheck.json', 'unmapped-source.json']) {
      try {
        if (readFileSync(metadataPath(name), 'utf8').includes(key)) fail(`metadata/${name} EVDS API anahtarını içeriyor!`);
      } catch {
        /* dosya yoksa sorun değil */
      }
    }
  }

  // Seri kaydı ile saklanan seri haritası tutarlı mı?
  const firstFile = readYearFile(years[years.length - 1]!);
  for (const currency of CURRENCIES) {
    for (const field of RATE_FIELDS) {
      if (firstFile.sourceSeries[currency]?.[field] !== EVDS_SERIES[currency][field].raw) {
        fail(`sourceSeries ${currency}.${field} registry ile uyuşmuyor`);
      }
    }
  }

  const cross = readJson<{ counts?: { mismatches: number } }>(metadataPath('crosscheck.json'), {});
  if ((cross.counts?.mismatches ?? 0) > 0) warn(`Çapraz kontrol: ${cross.counts!.mismatches} uyuşmazlık (data/metadata/crosscheck.json)`);

  console.log(`data:validate: ${years.length} yıl dosyası (${years[0]}–${years[years.length - 1]}), ${all.length} gözlem, son belirlenme günü ${lastDate}`);
  report();
}

function report(): void {
  for (const w of warnings.slice(0, 100)) annotate('warning', w);
  if (errors.length > 0) {
    for (const e of errors.slice(0, 200)) console.error(`HATA: ${e}`);
    console.error(`data:validate BAŞARISIZ: ${errors.length} hata${errors.length > 200 ? ' (ilk 200 gösterildi)' : ''}`);
    process.exit(1);
  }
  console.log(`data:validate TAMAM (${warnings.length} uyarı)`);
}

main();
