/**
 * Build sonrası (astro build'den sonra): reklam CANLI kipteyse dist/_headers içindeki CSP'yi reklam politikasına çevirir.
 * Diğer kiplerde dosyaya dokunmaz. Kaynak politika public/_headers'ta sıkı hâlde durur (src/lib/ads/csp.ts açıklaması).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { ADS } from '../../src/config/ads.ts';
import { ADS_CSP, applyCsp } from '../../src/lib/ads/csp.ts';

if (ADS.mode !== 'live') {
  console.log(`apply-csp: reklam kipi "${ADS.mode}", _headers değişmedi (sıkı CSP).`);
} else {
  const path = 'dist/_headers';
  writeFileSync(path, applyCsp(readFileSync(path, 'utf8'), ADS_CSP));
  console.log('apply-csp: reklam CANLI kip, dist/_headers CSP reklam politikasına çevrildi (DECISIONS D-018).');
}
