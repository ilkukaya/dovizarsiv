/**
 * Tarih konvansiyonu doğrulaması (owner kararı "B"): sitedeki `date` = TCMB'nin kuru belirlediği gün.
 * Seçilmiş tarihlerde TCMB günlük bülten XML'i ile yerel normalize veri karşılaştırılır.
 *
 * YALNIZCA GitHub Actions'ta, doğrulama amacıyla çalışır. XML verisi hiçbir dosyaya yazılmaz; üretim verisine girmez
 * (TCMB genel site şartları, DECISIONS D-007). Sonuç Markdown tablosu olarak basılır (+ $GITHUB_STEP_SUMMARY).
 *
 * Kurallar:
 * - XML varsa (o gün kur belirlenmiş): sitede date=X gözlemi olmalı ve 3 para birimi × 4 alanın tamamı eşleşmeli.
 * - XML yoksa (404: hafta sonu, tatil, yarım gün): sitede date=X gözlemi OLMAMALI.
 */
import { appendFileSync } from 'node:fs';
import { Decimal } from '../../src/lib/calculations/decimal.ts';
import { weekday, type IsoDate } from '../../src/lib/data/dates.ts';
import type { Observation } from '../../src/lib/data/model.ts';
import { WEEKDAYS_TR } from '../../src/lib/formatting/format.ts';
import { CURRENCIES, RATE_FIELDS, type RateField } from '../../src/lib/providers/types.ts';
import { readAllObservations } from '../data/lib/storage.ts';

export const CASES: Array<[IsoDate, string]> = [
  // Hafta sonu geçişleri
  ['2000-01-07', 'hafta sonu öncesi (Cuma)'],
  ['2000-01-10', 'hafta sonu sonrası (Pazartesi)'],
  ['2008-06-06', 'hafta sonu öncesi (Cuma)'],
  ['2008-06-07', 'Cumartesi'],
  ['2008-06-09', 'hafta sonu sonrası (Pazartesi)'],
  ['2020-01-10', 'hafta sonu öncesi (Cuma)'],
  ['2020-01-11', 'Cumartesi'],
  ['2020-01-13', 'hafta sonu sonrası (Pazartesi)'],
  ['2020-01-15', 'referans gün (SPEC §11.5)'],
  ['2024-03-29', 'hafta sonu öncesi (Cuma)'],
  ['2024-04-01', 'hafta sonu sonrası (Pazartesi)'],
  // Yılbaşı geçişleri
  ['1999-12-31', 'yılbaşı öncesi'],
  ['2000-01-03', 'yılbaşı sonrası'],
  ['2004-12-31', 'yılbaşı öncesi + 2005 para reformu'],
  ['2005-01-03', 'yılbaşı sonrası + 2005 para reformu'],
  ['2008-12-31', 'yılbaşı öncesi'],
  ['2009-01-01', 'yılbaşı tatili'],
  ['2009-01-02', 'yılbaşı sonrası'],
  ['2019-12-31', 'yılbaşı öncesi'],
  ['2020-01-01', 'yılbaşı tatili'],
  ['2020-01-02', 'yılbaşı sonrası'],
  ['2023-12-29', 'yılbaşı öncesi (Cuma)'],
  ['2024-01-01', 'yılbaşı tatili (Pazartesi)'],
  ['2024-01-02', 'yılbaşı sonrası'],
  // Resmî tatiller
  ['2024-04-22', '23 Nisan öncesi'],
  ['2024-04-23', '23 Nisan tatili'],
  ['2024-04-24', '23 Nisan sonrası'],
  ['2023-05-01', '1 Mayıs tatili'],
  ['2023-05-02', '1 Mayıs sonrası'],
  ['2023-05-18', '19 Mayıs öncesi'],
  ['2023-05-19', '19 Mayıs tatili'],
  ['2016-07-15', '15 Temmuz (2016: henüz tatil değil)'],
  ['2019-07-15', '15 Temmuz tatili'],
  ['2022-08-30', '30 Ağustos tatili'],
  ['2019-10-28', '29 Ekim arifesi (yarım gün)'],
  ['2019-10-29', 'Cumhuriyet Bayramı'],
  ['2019-10-30', 'Cumhuriyet Bayramı sonrası'],
  // Arife ve bayramlar
  ['2024-04-08', 'Ramazan Bayramı 2024 öncesi'],
  ['2024-04-09', 'Ramazan Bayramı 2024 arifesi'],
  ['2024-04-10', 'Ramazan Bayramı 2024 1. gün'],
  ['2024-04-12', 'Ramazan Bayramı 2024 3. gün'],
  ['2024-04-15', 'Ramazan Bayramı 2024 sonrası'],
  ['2023-04-19', 'Ramazan Bayramı 2023 öncesi'],
  ['2023-04-20', 'Ramazan Bayramı 2023 arifesi'],
  ['2023-04-21', 'Ramazan Bayramı 2023 1. gün'],
  ['2023-04-24', 'Ramazan Bayramı 2023 sonrası'],
  ['2023-06-26', 'Kurban Bayramı 2023 öncesi'],
  ['2023-06-27', 'Kurban Bayramı 2023 arifesi'],
  ['2023-06-28', 'Kurban Bayramı 2023 1. gün'],
  ['2023-07-03', 'Kurban Bayramı 2023 sonrası'],
  ['2025-06-04', 'Kurban Bayramı 2025 öncesi'],
  ['2025-06-05', 'Kurban Bayramı 2025 arifesi'],
  ['2025-06-06', 'Kurban Bayramı 2025 1. gün'],
  ['2025-06-09', 'Kurban Bayramı 2025 4. gün'],
  ['2025-06-10', 'Kurban Bayramı 2025 sonrası'],
  // Uzun (idari izinli) bayram tatilleri
  ['2018-08-17', 'Kurban 2018 uzun tatil öncesi (Cuma)'],
  ['2018-08-20', 'Kurban 2018 arifesi / idari izin'],
  ['2018-08-24', 'Kurban 2018 bayram / tatil'],
  ['2018-08-27', 'Kurban 2018 uzun tatil sonrası'],
  ['2019-05-31', 'Ramazan 2019 uzun tatil öncesi (Cuma)'],
  ['2019-06-03', 'Ramazan 2019 arifesi / idari izin'],
  ['2019-06-07', 'Ramazan 2019 idari izin'],
  ['2019-06-10', 'Ramazan 2019 uzun tatil sonrası'],
  ['2024-06-14', 'Kurban 2024 öncesi (Cuma)'],
  ['2024-06-17', 'Kurban 2024 bayram'],
  ['2024-06-20', 'Kurban 2024 bayram sonrası / idari izin?'],
  ['2024-06-21', 'Kurban 2024 idari izin?'],
  ['2024-06-24', 'Kurban 2024 uzun tatil sonrası'],
  // 2001 krizi (dalgalı kura geçiş) ve yakın tarih
  ['2001-02-21', '2001 krizi'],
  ['2001-02-22', '2001 krizi: dalgalı kur'],
  ['2001-02-23', '2001 krizi'],
  ['2026-09-24', 'yakın tarih'],
  ['2026-09-25', 'yakın tarih (Cuma)'],
];

const XML_FIELDS: Record<RateField, string> = {
  forexBuying: 'ForexBuying',
  forexSelling: 'ForexSelling',
  cashBuying: 'BanknoteBuying',
  cashSelling: 'BanknoteSelling',
};

interface Bulletin {
  date: IsoDate;
  number: string;
  values: Map<string, Decimal>; // "USD.forexBuying" → TRY
}

async function fetchBulletin(date: IsoDate): Promise<Bulletin | null> {
  const [y, m, d] = date.split('-');
  const url = `https://www.tcmb.gov.tr/kurlar/${y}${m}/${d}${m}${y}.xml`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': 'dovizarsiv-verify/1.0' }, signal: AbortSignal.timeout(30_000) }).catch(() => null);
    if (res?.status === 404) return null;
    if (res?.ok) {
      const xml = await res.text();
      const head = /<Tarih_Date[^>]*>/.exec(xml)?.[0] ?? '';
      const tarih = /Tarih="(\d{2})\.(\d{2})\.(\d{4})"/.exec(head);
      const bulletinDate = tarih ? `${tarih[3]}-${tarih[2]}-${tarih[1]}` : '';
      const values = new Map<string, Decimal>();
      for (const currency of CURRENCIES) {
        const block = new RegExp(`<Currency[^>]*Kod="${currency}"[\\s\\S]*?</Currency>`).exec(xml)?.[0] ?? '';
        const unit = /<Unit>(\d+)<\/Unit>/.exec(block)?.[1] ?? '1';
        if (unit !== '1') throw new Error(`${date} ${currency}: beklenmeyen birim ${unit}`);
        for (const field of RATE_FIELDS) {
          const text = new RegExp(`<${XML_FIELDS[field]}>([^<]*)</${XML_FIELDS[field]}>`).exec(block)?.[1]?.trim();
          if (!text) continue;
          const v = Decimal.parse(text);
          // Bülten tarihi 2005 öncesiyse bülten eski TL cinsindendir.
          values.set(`${currency}.${field}`, bulletinDate < '2005-01-01' ? v.shiftLeft(6) : v);
        }
      }
      return { date: bulletinDate, number: /Bulten_No="([^"]+)"/.exec(head)?.[1] ?? '', values };
    }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
  throw new Error(`${date}: TCMB XML alınamadı`);
}

async function main(): Promise<void> {
  const observations = readAllObservations();
  const byDate = new Map<IsoDate, Observation[]>();
  for (const o of observations) {
    const list = byDate.get(o.date) ?? [];
    list.push(o);
    byDate.set(o.date, list);
  }
  const lines: string[] = [
    '| # | Tarih | Gün | Senaryo | TCMB bülteni | Sitede gözlem | Kaynak EVDS satırı | USD döviz alış (bülten / site) | Alan eşleşmesi | Sonuç |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  let failures = 0;
  let n = 0;
  for (const [date, scenario] of CASES) {
    n++;
    const bulletin = await fetchBulletin(date);
    await new Promise((r) => setTimeout(r, 500));
    const ours = byDate.get(date) ?? [];
    const day = WEEKDAYS_TR[weekday(date)];
    let ok: boolean;
    let fieldText = '—';
    let usdText = '—';
    if (!bulletin) {
      ok = ours.length === 0;
      lines.push(`| ${n} | ${date} | ${day} | ${scenario} | yok (404) | ${ours.length ? 'VAR' : 'yok'} | — | — | — | ${ok ? '✅' : '❌'} |`);
    } else {
      let matched = 0;
      let compared = 0;
      const diffs: string[] = [];
      for (const currency of CURRENCIES) {
        const obs = ours.find((o) => o.currency === currency);
        for (const field of RATE_FIELDS) {
          const expected = bulletin.values.get(`${currency}.${field}`);
          const actual = obs?.[field];
          if (!expected && !actual) continue;
          compared++;
          if (expected && actual && expected.eq(Decimal.parse(actual))) matched++;
          else diffs.push(`${currency}.${field}: bülten ${expected?.toString() ?? '-'} / site ${actual ?? '-'}`);
        }
      }
      ok = bulletin.date === date && ours.length > 0 && compared > 0 && matched === compared;
      fieldText = `${matched}/${compared}`;
      const usd = ours.find((o) => o.currency === 'USD');
      usdText = `${bulletin.values.get('USD.forexBuying')?.toString() ?? '-'} / ${usd?.forexBuying ?? '-'}`;
      lines.push(
        `| ${n} | ${date} | ${day} | ${scenario} | ${bulletin.number} (${bulletin.date}) | ${ours.length ? 'var' : 'YOK'} | ${usd?.sourceDate ?? '—'} | ${usdText} | ${fieldText} | ${ok ? '✅' : '❌'} |`,
      );
      if (!ok) for (const d of diffs.slice(0, 12)) console.error(`  ${date} FARK ${d}`);
    }
    if (!ok) failures++;
  }
  const summary = `\n**Sonuç:** ${CASES.length} tarih, ${CASES.length - failures} başarılı, ${failures} başarısız.\n`;
  const output = `### Tarih konvansiyonu doğrulaması (TCMB bülten XML ↔ site verisi)\n\n${lines.join('\n')}\n${summary}`;
  console.log(output);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, output);
  if (failures > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(`verify:bulletins BAŞARISIZ: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
