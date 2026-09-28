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

async function raw(url, max = 3000) {
  const r = await get(url, { headers: { 'user-agent': 'Mozilla/5.0 dovizarsiv-phase0-probe' } });
  section(`RAW ${url} -> ${r.status} ${r.ct} len=${r.body.length}`);
  out(r.body.slice(0, max));
  return r;
}

if (MODE === 'r5') {
  // Resmi EVDS belgeleri: 18 = Kullanım Şartları (TR), 21 = Terms of Use (EN), 8 = Web Servis Kılavuzu
  const { writeFile } = await import('node:fs/promises');
  for (const id of [18, 21, 8]) {
    const r = await fetch(`https://evds3.tcmb.gov.tr/igmevdsms-dis/documents/showDocument?docId=${id}`,
      { headers: { 'user-agent': 'Mozilla/5.0 dovizarsiv-phase0-probe' }, signal: AbortSignal.timeout(30000) });
    const buf = Buffer.from(await r.arrayBuffer());
    section(`DOC ${id} -> ${r.status} ${r.headers.get('content-type')} ${buf.length}B`);
    await writeFile(`/tmp/doc-${id}.pdf`, buf);
  }
}

if (MODE === 'r4') {
  // EVDS kullanım şartları ve gizlilik belgeleri (resmi doküman uç noktası)
  const base = 'https://evds3.tcmb.gov.tr/igmevdsms-dis';
  const ua = { 'user-agent': 'Mozilla/5.0 dovizarsiv-phase0-probe' };
  const keys = await get(`${base}/genel-ayarlar/multiple?keys=DOC_ID_EVDS_KULLANIM_SARTLARI,DOC_ID_EVDS_TERMS_OF_USE`, { headers: ua });
  section(`DOC KEYS -> ${keys.status}`);
  out(keys.body.slice(0, 1000));
  const docs = await get(`${base}/documents?lang=TR`, { headers: ua });
  section(`DOC LIST -> ${docs.status}`);
  out(docs.body.slice(0, 6000));
  const { writeFile } = await import('node:fs/promises');
  try {
    for (const k of JSON.parse(keys.body)) {
      const r = await fetch(`${base}/documents/showDocument?docId=${k.value}`, { headers: ua, signal: AbortSignal.timeout(30000) });
      const buf = Buffer.from(await r.arrayBuffer());
      section(`DOC ${k.key} id=${k.value} -> ${r.status} ${r.headers.get('content-type')} ${buf.length}B`);
      await writeFile(`/tmp/${k.key}.bin`, buf);
    }
  } catch (e) { out('DOC ERR ' + e); }
}

if (MODE === 'r3') {
  // EVDS kullanım şartları: SPA paketinde gömülü metin ve doküman uç noktaları
  const home = await get('https://evds3.tcmb.gov.tr/');
  const idx = home.body.match(/\/assets\/index-[^"]+\.js/)?.[0];
  const b = (await get('https://evds3.tcmb.gov.tr' + idx)).body;
  for (const needle of ['KULLANIM ŞARTLARI', 'kullanım esasları hakkında', 'DOC_ID_EVDS_TERMS_OF_USE', 'igmevdsms-dis', 'kaynak gösteril', 'ücret', 'ticari']) {
    let i = -1, n = 0;
    while ((i = b.indexOf(needle, i + 1)) !== -1 && n < 4) {
      section(`CTX "${needle}" @${i}`);
      out(b.slice(Math.max(0, i - 1500), i + 4000).replace(/\\n/g, '\n'));
      n++;
    }
  }
  await page('https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Bottom+Menu/Diger/Kullanim+Sartlari', 20000);
}

if (MODE === 'r2') {
  await raw('https://developers.cloudflare.com/pages/functions/pricing/index.md', 5000);
  await raw('https://developers.cloudflare.com/pages/platform/limits/index.md', 200);
  await raw('https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits', 0)
    .then((r) => out(strip(r.body).match(/GitHub Pages limits[\s\S]{0,3000}/)?.[0] || ''));
  await page('https://www.netlify.com/pricing/', 5000);
  await page('https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/temel+faaliyetler/doviz+efektif/doviz+ve+efektif+piyasalari/gosterge+niteligindeki+kurlar', 5000);
  // EVDS3 SPA: paketleri tara
  const home = await raw('https://evds3.tcmb.gov.tr/', 2500);
  const srcs = [...home.body.matchAll(/(?:src|href)="([^"]+\.(?:js|json)[^"]*)"/g)].map((m) => new URL(m[1], 'https://evds3.tcmb.gov.tr/').href);
  out('SCRIPTS: ' + srcs.join(' | '));
  const pats = /igmevdsms[^"'`\s]{0,80}|serieList|datagroups|["'`][^"'`]{0,60}\.pdf["'`]|kullan[ıi]m[^"'`<]{0,200}|headers?:\{[^}]{0,120}key[^}]{0,60}\}|limit[^"'`]{0,80}istek[^"'`]{0,80}/gi;
  for (const s of srcs.slice(0, 15)) {
    const r = await get(s);
    const hits = [...new Set((r.body.match(pats) || []))].slice(0, 80);
    section(`BUNDLE ${s} ${r.status} len=${r.body.length}`);
    out(hits.join('\n'));
  }
  // Anahtarsız API denemesi: hata biçimini görmek için
  for (const u of ['https://evds3.tcmb.gov.tr/igmevdsms-dis/categories/type=json',
                   'https://evds3.tcmb.gov.tr/igmevdsms-dis/serieList/code=bie_dkdovytl&type=json',
                   'https://evds2.tcmb.gov.tr/service/evds/categories/type=json']) {
    const r = await get(u);
    section(`NOKEY ${u} -> ${r.status} ${r.ct}`);
    out(strip(r.body).slice(0, 800));
  }
  // Kurlar arşivinin başlangıcı
  for (const d of ['1996-04-16','1996-04-17','1996-01-02','1997-01-02','1998-01-02','1999-01-04','2000-01-04']) {
    const [y, m, dd] = d.split('-');
    const r = await get(`https://www.tcmb.gov.tr/kurlar/${y}${m}/${dd}${m}${y}.xml`);
    out(`XML ${d} -> ${r.status} ${(r.body.match(/<Tarih_Date[^>]*>/) || [''])[0]}`);
  }
}


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
