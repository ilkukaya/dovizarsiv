/**
 * Statik görselleri üretir (SPEC §8): apple-touch-icon, PWA ikonları ve sayfa türü başına OG görseli.
 * Stok görsel ya da fotoğraf yok; tipografik kimlik. Çıktılar public/ altına commit edilir.
 * Çalıştırma: npx tsx scripts/assets/generate-images.ts  (yerelde Chromium gerekir)
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

const icon = (size: number) => `<!doctype html><html><body style="margin:0">
<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:#fbfaf7">
<div style="width:${size * 0.82}px;height:${size * 0.82}px;border:${Math.max(3, size * 0.07)}px solid #1d2733;border-radius:${size * 0.12}px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font:700 ${size * 0.4}px system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1d2733">TL</div>
</div></body></html>`;

const og = (title: string, subtitle: string) => `<!doctype html><html><body style="margin:0">
<div style="width:1200px;height:630px;box-sizing:border-box;padding:80px;background:#fbfaf7;color:#1d2733;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;display:flex;flex-direction:column;justify-content:space-between">
  <div style="display:flex;align-items:center;gap:20px;font-weight:700;font-size:40px">
    <span style="border:5px solid #1d2733;border-radius:10px;padding:2px 14px;font-size:30px">TL</span> Döviz Arşiv
  </div>
  <div>
    <div style="font-size:72px;font-weight:700;line-height:1.1;max-width:1000px">${title}</div>
    <div style="font-size:34px;color:#4f5b69;margin-top:24px">${subtitle}</div>
  </div>
  <div style="font-size:26px;color:#4f5b69;border-top:2px solid #dcdad3;padding-top:24px">Kaynak: TCMB EVDS · dovizarsiv.net</div>
</div></body></html>`;

async function main(): Promise<void> {
  mkdirSync('public/og', { recursive: true });
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage();
  for (const [file, size] of [['public/apple-touch-icon.png', 180], ['public/icon-192.png', 192], ['public/icon-512.png', 512]] as const) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(icon(size));
    await page.screenshot({ path: file, omitBackground: false });
  }
  await page.setViewportSize({ width: 1200, height: 630 });
  for (const [file, title, subtitle] of [
    ['public/og/ana-sayfa.png', 'Geçmiş Döviz Kurlarına Hızlıca Ulaşın', 'Dolar, euro ve sterlin kurları arşivi'],
    ['public/og/arsiv.png', 'TCMB Döviz Kuru Arşivi', 'Günlük, aylık ve yıllık tablolar'],
    ['public/og/gun.png', 'Günün TCMB Döviz Kurları', 'Döviz alış, satış ve efektif kurlar'],
  ] as const) {
    await page.setContent(og(title, subtitle));
    await page.screenshot({ path: file });
  }
  await browser.close();
  console.log('görseller üretildi');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
