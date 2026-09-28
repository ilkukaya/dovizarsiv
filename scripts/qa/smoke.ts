/**
 * Referans smoke testi (SPEC §11.4'ün çekirdeği; Sonnet genişletecek). dist/ yerel sunulur, Chromium ile:
 * - tarih bulucu: kur belirlenmiş gün → /tarih/D/; hafta sonu → önceki belirlenme günü + ?istenen= bandı
 * - 2000 öncesi tarih → ay sayfası; geçersiz gün sayfası → 404; mobil menü açılır
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { chromium, type Page } from 'playwright';

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]!);
  let file = join('dist', url);
  if (url.endsWith('/')) file = join(file, 'index.html');
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': TYPES['.html']! });
    createReadStream('dist/404.html').pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(4396);
const BASE = 'http://localhost:4396';

const failures: string[] = [];
function check(cond: boolean, msg: string): void {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures.push(msg);
}

async function findDate(page: Page, value: string): Promise<void> {
  await page.goto(`${BASE}/`);
  await page.fill('#ana-tarih', value);
  await Promise.all([page.waitForURL(/\/(tarih|dolar)\//), page.click('form[data-date-finder] button[type=submit]')]);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 800 } });

await findDate(page, '2020-01-15');
check(page.url() === `${BASE}/tarih/2020-01-15/`, 'kur belirlenmiş gün doğrudan gün sayfasını açar');
check((await page.textContent('h1')) === '15 Ocak 2020 Döviz Kurları', 'gün sayfası H1');
check(await page.isHidden('[data-requested-band]'), 'istenen bandı gizli');

await findDate(page, '2020-01-12');
check(page.url() === `${BASE}/tarih/2020-01-10/?istenen=2020-01-12`, 'hafta sonu → önceki belirlenme günü (?istenen=)');
check((await page.textContent('[data-requested-band]'))?.includes('12 Ocak 2020') === true, 'istenen tarih bandı görünür');
check((await page.getAttribute('link[rel=canonical]', 'href')) === 'https://dovizarsiv.net/tarih/2020-01-10/', 'canonical parametresiz');

await findDate(page, '2024-04-10');
check(page.url() === `${BASE}/tarih/2024-04-08/?istenen=2024-04-10`, 'bayram günü → arife öncesi son belirlenme günü');

await findDate(page, '1985-06-15');
check(page.url() === `${BASE}/dolar/1985/06/`, '2000 öncesi tarih → ay sayfası');

const res = await page.goto(`${BASE}/tarih/2020-02-31/`);
check(res?.status() === 404, 'geçersiz tarih gerçek 404');
const weekend = await page.goto(`${BASE}/tarih/2020-01-11/`);
check(weekend?.status() === 404, 'kur belirlenmeyen gün için sayfa yok (404)');

await page.goto(`${BASE}/`);
await page.click('.mobile-menu summary');
check(await page.isVisible('.mobile-nav a[href="/dolar/"]'), 'mobil menü açılır');

await browser.close();
server.close();
if (failures.length) {
  console.error(`smoke BAŞARISIZ: ${failures.length}`);
  process.exit(1);
}
console.log('smoke TAMAM');
