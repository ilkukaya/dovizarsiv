/**
 * Lighthouse ölçümü (SPEC §9 hedefleri: LCP < 2,0 sn, CLS < 0,05; INP laboratuvarda ölçülemez → TBT vekil).
 * dist/ yerel olarak sunulur; mobil (varsayılan) ve masaüstü profilleri. Sonuç tablo olarak basılır.
 * Not: yerel sunucu CDN değildir; Cloudflare üzerinde gerçek alan verisi (CrUX) ayrıca izlenmelidir.
 * Çalıştırma: npm run build && npm run qa:lighthouse
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const PAGES = ['/', '/dolar/', '/dolar/2020/', '/dolar/2020/01/', '/tarih/2020-01-15/', '/tarih-arsivi/2020/', '/metodoloji/'];

const server = createServer((req, res) => {
  let file = join('dist', decodeURIComponent(req.url.split('?')[0]));
  if (file.endsWith('/') || (existsSync(file) && statSync(file).isDirectory())) file = join(file, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'public, max-age=3600' });
  createReadStream(file).pipe(res);
}).listen(4397);

const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium', chromeFlags: ['--headless=new', '--no-sandbox'] });
const rows = [];
for (const formFactor of ['mobile', 'desktop']) {
  for (const path of PAGES) {
    const config = formFactor === 'desktop' ? (await import('lighthouse/core/config/desktop-config.js')).default : undefined;
    const result = await lighthouse(`http://localhost:4397${path}`, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] }, config);
    const { categories, audits } = result.lhr;
    rows.push({
      formFactor,
      path,
      perf: Math.round(categories.performance.score * 100),
      a11y: Math.round(categories.accessibility.score * 100),
      bp: Math.round(categories['best-practices'].score * 100),
      seo: Math.round(categories.seo.score * 100),
      lcp: (audits['largest-contentful-paint'].numericValue / 1000).toFixed(2),
      cls: audits['cumulative-layout-shift'].numericValue.toFixed(3),
      tbt: Math.round(audits['total-blocking-time'].numericValue),
      bytes: Math.round(audits['total-byte-weight'].numericValue / 1024),
      failedA11y: Object.values(audits).filter((a) => a.score === 0 && result.lhr.categories.accessibility.auditRefs.some((r) => r.id === a.id)).map((a) => a.id),
    });
  }
}
await chrome.kill();
server.close();
console.log('| Profil | Sayfa | Performans | Erişilebilirlik | En iyi uygulamalar | SEO | LCP (sn) | CLS | TBT (ms) | Aktarım (KB) |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.formFactor} | ${r.path} | ${r.perf} | ${r.a11y} | ${r.bp} | ${r.seo} | ${r.lcp} | ${r.cls} | ${r.tbt} | ${r.bytes} |`);
for (const r of rows) if (r.failedA11y.length) console.log(`erişilebilirlik uyarıları ${r.formFactor} ${r.path}: ${r.failedA11y.join(', ')}`);
