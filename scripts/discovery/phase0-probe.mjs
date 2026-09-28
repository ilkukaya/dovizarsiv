// Faz 0 keşif sondası. Üretim kodu değildir; yalnızca GitHub Actions üzerinde,
// geliştirme ortamının ağ politikası TCMB/Cloudflare'e erişemediği için çalıştırılır.
// EVDS anahtarı yalnızca HTTP header'ında gönderilir; hiçbir yere yazdırılmaz.
const KEY = process.env.EVDS_API_KEY || '';
const out = (s) => console.log(s);
const strip = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

async function get(url, opts = {}) {
  try {
    const r = await fetch(url, { redirect: 'follow', ...opts, signal: AbortSignal.timeout(30000) });
    const body = await r.text();
    return { status: r.status, url: r.url, ct: r.headers.get('content-type') || '', body };
  } catch (e) {
    return { status: 0, url, ct: '', body: String(e) };
  }
}

function section(t) { out(`\n==================== ${t} ====================`); }

async function page(url, max = 12000) {
  const r = await get(url, { headers: { 'user-agent': 'Mozilla/5.0 dovizarsiv-phase0-probe' } });
  section(`PAGE ${url} -> ${r.status} ${r.url} ${r.ct}`);
  if (r.ct.includes('html')) {
    const links = [...r.body.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
      .filter((h) => /kullan|sart|şart|dokuman|doküman|pdf|term|limit|api|kurlar/i.test(h));
    out('LINKS: ' + [...new Set(links)].slice(0, 60).join(' | '));
    out(strip(r.body).slice(0, max));
  } else {
    out(r.body.slice(0, max));
  }
}

async function evds(label, url) {
  const r = await get(url, { headers: { key: KEY, 'user-agent': 'dovizarsiv-phase0-probe' } });
  section(`EVDS ${label} -> ${r.status} ${r.ct}`);
  out(`URL: ${url}`);
  out(r.body.slice(0, 6000));
  return r;
}

const MODE = process.argv[2] || 'all';

if (MODE === 'all' || MODE === 'pages') {
  await page('https://developers.cloudflare.com/pages/platform/limits/');
  await page('https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/', 6000);
  await page('https://www.cloudflare.com/plans/developer-platform/', 6000);
  await page('https://evds3.tcmb.gov.tr/', 4000);
  await page('https://evds3.tcmb.gov.tr/dokumanlar', 8000);
  await page('https://evds2.tcmb.gov.tr/index.php?/evds/userDocs', 8000);
}

if (MODE === 'all' || MODE === 'xml') {
  // TCMB günlük kur XML'i (anahtarsız, resmi). Tarih konvansiyonu ve 2005 karşılaştırması için.
  for (const d of ['2004-12-29','2004-12-30','2004-12-31','2005-01-03','2005-01-04','2020-01-13','2020-01-14','2020-01-15','2020-01-16','2024-03-29','2024-04-01']) {
    const [y, m, dd] = d.split('-');
    const url = `https://www.tcmb.gov.tr/kurlar/${y}${m}/${dd}${m}${y}.xml`;
    const r = await get(url, { headers: { 'user-agent': 'Mozilla/5.0 dovizarsiv-phase0-probe' } });
    section(`XML ${d} -> ${r.status}`);
    if (r.status === 200) {
      const head = r.body.match(/<Tarih_Date[^>]*>/)?.[0] || '';
      out(head);
      for (const code of ['USD', 'EUR', 'GBP']) {
        const block = r.body.match(new RegExp(`<Currency[^>]*Kod="${code}"[\\s\\S]*?</Currency>`))?.[0] || '';
        const f = (tag) => block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1] ?? '∅';
        out(`${code} unit=${f('Unit')} FB=${f('ForexBuying')} FS=${f('ForexSelling')} BB=${f('BanknoteBuying')} BS=${f('BanknoteSelling')}`);
      }
    }
  }
}

if (MODE === 'all' || MODE === 'evds') {
  section(`EVDS key present: ${KEY ? 'yes' : 'no'}`);
  if (KEY) {
    const bases = ['https://evds3.tcmb.gov.tr/igmevdsms-dis/', 'https://evds2.tcmb.gov.tr/service/evds/'];
    for (const b of bases) {
      await evds(`${b} categories`, `${b}categories/type=json`);
      const dg = await evds(`${b} datagroups cat=2`, `${b}datagroups/mode=2&code=2&type=json`);
      await evds(`${b} serieList bie_dkdovytl`, `${b}serieList/code=bie_dkdovytl&type=json`);
      await evds(`${b} series sample 2020`,
        `${b}series=TP.DK.USD.A.YTL-TP.DK.USD.S.YTL-TP.DK.EUR.A.YTL-TP.DK.EUR.S.YTL-TP.DK.GBP.A.YTL-TP.DK.GBP.S.YTL&startDate=13-01-2020&endDate=16-01-2020&type=json`);
      if (dg.status === 200) break;
    }
  }
}
