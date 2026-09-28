/**
 * Mobil/masaüstü düzen kontrolü (SPEC §9, §11.5). dist/ statik olarak sunulur; her sayfa 360–1440 px genişliklerde açılır:
 * - sayfa gövdesi yatay taşmamalı (documentElement.scrollWidth ≤ innerWidth)
 * - tablolar kendi kapsayıcısında kayar
 * İsteğe bağlı: --shots=<dizin> ile 390 ve 1440 px ekran görüntüleri.
 * Çalıştırma: npm run build && npm run qa:layout
 */
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const DIST = 'dist';
const WIDTHS = [360, 375, 390, 412, 768, 1024, 1440];
export const PAGES = [
  '/',
  '/dolar/',
  '/dolar/2020/',
  '/dolar/2020/01/',
  '/euro/',
  '/sterlin/',
  '/tarih/2020-01-15/',
  '/tarih/2004-12-31/',
  '/tarih-arsivi/',
  '/tarih-arsivi/2020/',
  '/hesaplama/gecmis-doviz/',
  '/hesaplama/kur-degisimi/',
  '/karsilastir/',
  '/rehber/',
  '/rehber/doviz-alis-satis-kuru-farki/',
  '/rehber/2005-para-reformu-eski-tl/',
  '/hakkimizda/',
  '/iletisim/',
  '/gizlilik/',
  '/cerez-politikasi/',
  '/kullanim-kosullari/',
  '/reklam-politikasi/',
  '/metodoloji/',
  '/veri-kaynaklari/',
  '/bu-sayfa-yok/',
];
/** Araç sayfalarında sonuç durumunu da ölçmek için varsayılan değerlerle formu gönderir. */
const TOOL_PATHS = new Set(['/hesaplama/gecmis-doviz/', '/hesaplama/kur-degisimi/', '/karsilastir/', '/tarih/2020-01-15/', '/tarih/2004-12-31/']);
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml' };

function serve(port: number) {
  return createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]!);
    let file = join(DIST, url);
    if (url.endsWith('/')) file = join(file, 'index.html');
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': TYPES['.html']! });
      createReadStream(join(DIST, '404.html')).pipe(res);
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  }).listen(port);
}

async function main(): Promise<void> {
  const shots = process.argv.find((a) => a.startsWith('--shots='))?.slice(8);
  if (shots) mkdirSync(shots, { recursive: true });
  const port = 4399;
  const server = serve(port);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
  const problems: string[] = [];
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const path of PAGES) {
      await page.goto(`http://localhost:${port}${path}`, { waitUntil: 'load' });
      if (TOOL_PATHS.has(path)) {
        await page.click('.tool button[type=submit]');
        await page.waitForSelector('[data-result] .tool-result__body', { timeout: 15000 });
      }
      const r = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        inner: window.innerWidth,
        wide: [...document.querySelectorAll<HTMLElement>('main *')]
          .filter((el) => !el.closest('.table-scroll') && el.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 3)
          .map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
      }));
      if (r.scroll > r.inner) problems.push(`${width}px ${path}: yatay taşma ${r.scroll} > ${r.inner} (${r.wide.join(', ')})`);
      if (shots && (width === 390 || width === 1440)) {
        const name = `${width}-${path.replace(/\//g, '_') || 'root'}.png`;
        await page.screenshot({ path: join(shots, name), fullPage: false });
      }
    }
    await page.close();
  }
  await browser.close();
  server.close();
  console.log(`layout-check: ${PAGES.length} sayfa × ${WIDTHS.length} genişlik`);
  if (problems.length) {
    for (const p of problems) console.error(`TAŞMA ${p}`);
    process.exit(1);
  }
  console.log('layout-check TAMAM: yatay taşma yok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
