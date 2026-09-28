/**
 * Build koruması (SPEC §4.2, §4.4, §6.11, §11.7). `npm run build` içinde astro build'den önce (--pre) ve sonra (--post) çalışır.
 *
 * --pre : veriye bağlı ücretli özellik yapılandırılmışsa, production'da yayıncı adı/iletişim e-postası boşsa,
 *         etkin para birimi verisi eksikse → başarısız.
 * --post: dist/ içinde EVDS API anahtarı, test fixture/mock veri izi varsa → başarısız.
 *
 * Production: Cloudflare Pages production dalı (CF_PAGES_BRANCH=main) ya da DOVIZARSIV_ENV=production.
 */
import { readFileSync } from 'node:fs';
import { PAID_FEATURES, SITE } from '../../src/config/site.ts';
import { CURRENCY_ORDER } from '../../src/config/currencies.ts';
import { listFiles } from '../seo/lib/dist.ts';
import { observationsOf } from '../../src/lib/data/store.ts';

const mode = process.argv.includes('--post') ? 'post' : 'pre';
const production = process.env.DOVIZARSIV_ENV === 'production' || process.env.CF_PAGES_BRANCH === 'main';
const errors: string[] = [];

if (mode === 'pre') {
  if (PAID_FEATURES.length > 0) errors.push(`Veriye bağlı ücretli özellik yapılandırılmış: ${PAID_FEATURES.join(', ')} (SPEC §4.2: site ücretsiz kalır)`);
  if (production) {
    if (!SITE.publisherName.trim()) errors.push('src/config/site.ts: publisherName boş (production)');
    if (!SITE.contactEmail.trim()) errors.push('src/config/site.ts: contactEmail boş (production)');
  } else if (!SITE.publisherName.trim() || !SITE.contactEmail.trim()) {
    console.log('[uyarı] site.ts yayıncı adı/iletişim e-postası boş; production build başarısız olacak.');
  }
  for (const c of CURRENCY_ORDER) if (observationsOf(c).length === 0) errors.push(`${c}: veri yok (etkin para birimi)`);
} else {
  const key = process.env.EVDS_API_KEY ?? '';
  const markers = ['"_note":"Gerçek EVDS3 yanıtı', 'tests/fixtures', 'MOCK_DATA'];
  for (const file of listFiles()) {
    if (!/\.(html|json|xml|csv|txt|js|css|webmanifest)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    if (key.length >= 6 && text.includes(key)) errors.push(`${file}: EVDS API anahtarı çıktıda!`);
    for (const m of markers) if (text.includes(m)) errors.push(`${file}: test/mock veri izi (${m})`);
  }
}

if (errors.length) {
  for (const e of errors) console.error(`BUILD GUARD (${mode}) HATA: ${e}`);
  process.exit(1);
}
console.log(`build-guard (${mode}) TAMAM${production ? ' [production]' : ''}`);
