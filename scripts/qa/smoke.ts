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

// ---- Araçlar (SPEC §6.9, §11.4 "hesaplayıcı doğruluğu") ----
async function resultText(p: Page): Promise<string> {
  await p.waitForSelector('[data-result] .tool-result__body', { timeout: 15000 });
  return ((await p.textContent('[data-result]')) ?? '').replace(/\s+/g, ' ');
}
async function openTool(path: string): Promise<void> {
  await page.goto(`${BASE}${path}`);
}

await openTool('/hesaplama/gecmis-doviz/');
await page.fill('#gd-tarih', '2020-01-15');
await page.fill('#gd-tutar', '100');
await page.selectOption('#gd-kaynak', 'USD');
await page.selectOption('#gd-hedef', 'TRY');
await page.click('.tool button[type=submit]');
let text = await resultText(page);
check(text.includes('100 USD = 588,27 TL'), 'geçmiş döviz: 100 USD → 588,27 TL (15.01.2020, döviz alış 5,8827)');
check(text.includes('5,8827 TL') && text.includes('TCMB bu günde kur belirledi'), 'geçmiş döviz: kur, kur günü ve kaynak gösterilir');
check(/Kaynak: Türkiye Cumhuriyet Merkez Bankası/.test(text) && text.includes('Döviz Arşiv hesaplamasıdır'), 'geçmiş döviz: kaynak ve hesaplama etiketi');
check((await page.getAttribute('[data-announce]', 'aria-live')) === 'polite', 'geçmiş döviz: sonuç aria-live ile duyurulur');
await page.waitForFunction(() => document.querySelector('[data-announce]')?.textContent?.includes('588,27'));

await page.fill('#gd-tarih', '2020-01-12');
await page.click('.tool button[type=submit]');
await page.waitForFunction(() => document.querySelector('[data-result]')?.textContent?.includes('587,13'));
text = await resultText(page);
check(text.includes('10 Ocak 2020') && text.includes('kur belirlemedi'), 'geçmiş döviz: hafta sonu → 10 Ocak 2020 gözlemi, açıkça belirtilir');

await page.fill('#gd-tarih', '2020-01-15');
await page.fill('#gd-tutar', '1.000');
await page.selectOption('#gd-kaynak', 'TRY');
await page.selectOption('#gd-hedef', 'USD');
await page.click('.tool button[type=submit]');
await page.waitForFunction(() => document.querySelector('[data-result]')?.textContent?.includes('169,68'));
check(true, 'geçmiş döviz: 1.000 TL → 169,68 USD (döviz satış 5,8933)');

await page.selectOption('#gd-kaynak', 'USD');
await page.selectOption('#gd-hedef', 'TRY');
await page.fill('#gd-tarih', '1999-06-15');
check(await page.isVisible('[data-tl-unit]'), 'geçmiş döviz: 2005 öncesinde TL birimi seçimi görünür');
await page.fill('#gd-tutar', '100');
await page.selectOption('#gd-tl', 'old');
await page.click('.tool button[type=submit]');
await page.waitForFunction(() => document.querySelector('[data-result]')?.textContent?.includes('41.172.800 eski TL'));
text = await resultText(page);
check(text.includes('41,1728 yeni TL'), 'geçmiş döviz: 15.06.1999 100 USD = 41.172.800 eski TL = 41,1728 yeni TL');

await page.selectOption('#gd-kaynak', 'EUR');
await page.fill('#gd-tarih', '1990-01-01');
await page.click('.tool button[type=submit]');
await page.waitForSelector('.tool-message--error');
check(((await page.textContent('[data-message]')) ?? '').includes('başlıyor'), 'geçmiş döviz: kapsam öncesi tarih anlaşılır hata verir');
await page.fill('#gd-tutar', 'abc');
await page.fill('#gd-tarih', '2020-01-15');
await page.click('.tool button[type=submit]');
await page.waitForFunction(() => document.querySelector('[data-message]')?.textContent?.includes('rakamlarla'));
check(await page.isHidden('[data-result] .tool-result__body'), 'geçmiş döviz: geçersiz tutarda sonuç gösterilmez');

await openTool('/hesaplama/kur-degisimi/');
await page.selectOption('#kd-para', 'USD');
await page.selectOption('#kd-kur', 'forexSelling');
await page.fill('#kd-bas', '2020-01-02');
await page.fill('#kd-bit', '2020-12-31');
await page.click('.tool button[type=submit]');
text = await resultText(page);
check(text.includes('%24,74') && text.includes('1,4742'), 'kur değişimi: USD satış 02.01.2020 → 31.12.2020 = %24,74, fark 1,4742');
check(text.includes('364'), 'kur değişimi: 364 takvim günü');
check((await page.locator('.chart svg path.chart__line').count()) === 1, 'kur değişimi: grafik çizilir');

await openTool('/karsilastir/');
await page.selectOption('#kc-bas', '2019');
await page.selectOption('#kc-bit', '2020');
await page.click('.tool button[type=submit]');
text = await resultText(page);
const rows2020 = await page.locator('[data-result] table').first().locator('tbody tr').count();
check(rows2020 === 2, 'karşılaştırma: 2019–2020 için iki yıl satırı');
const usd2020 = await page.locator('[data-result] table').first().locator('tbody tr').nth(1).innerText();
await page.goto(`${BASE}/dolar/2020/`);
const yearPageText = ((await page.textContent('main')) ?? '').replace(/\s+/g, ' ');
const meanCell = usd2020.split(/\s+/).find((t) => /^\d,\d{4}$/.test(t));
check(usd2020.startsWith('2020') && !!meanCell && yearPageText.includes(meanCell), `karşılaştırma: 2020 ortalaması (${meanCell}) yıl sayfasıyla aynı`);

await openTool('/tarih/2020-01-15/');
await page.fill('#mh-tutar', '250');
await page.selectOption('#mh-para', 'EUR');
await page.click('[data-tool=mini] button[type=submit]');
await page.waitForFunction(() => document.querySelector('[data-tool=mini] [data-result]')?.textContent?.includes('1.637,6'));
check(true, 'gün sayfası mini hesaplayıcı: 250 EUR × 6,5504 = 1.637,60 TL');

await browser.close();
server.close();
if (failures.length) {
  console.error(`smoke BAŞARISIZ: ${failures.length}`);
  process.exit(1);
}
console.log('smoke TAMAM');
