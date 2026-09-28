/**
 * Reklam açıkken Content-Security-Policy (docs/DECISIONS.md D-018).
 *
 * Kaynaklar (2026-09-28'de çekildi): Google AdSense Help "Integrate the AdSense ad code with a Content Security Policy (CSP)"
 * (support.google.com/adsense/answer/16283098) ve Google Publisher Tag "Integrate with a Content Security Policy".
 * İkisi de YALNIZCA strict CSP'yi (istek başına nonce) destekler; kullanılan alan adları zamanla değiştiği için allowlist
 * önermez. Aynı sayfalar "daha gevşek bir politika seçebilirsiniz" ve "yayıncıların CSP kullanması zorunlu değildir" der;
 * "daha kısıtlayıcı politikalar haber verilmeden bozulabilir".
 * Cloudflare Pages statik olduğundan istek başına nonce üretilemez. Bu yüzden reklam CANLI kipteyken politika, Google'ın
 * desteklediği yönergelerin (object-src 'none'; script-src … 'unsafe-inline' 'unsafe-eval' https:) daha gevşek bir biçimine
 * çekilir: script/img/connect/frame kaynaklarına https: açılır. Reklam kapalıyken politika `public/_headers`'taki sıkı hâlinde
 * kalır (script-src 'self'). Sıkı CSP'yi korumak isteyen Pages Functions ile nonce üretebilir (ücretsiz plan limitleri D-001).
 * Yayına almadan önce Content-Security-Policy-Report-Only ile denenmesi Google tarafından önerilir (LAUNCH-CHECKLIST).
 */
export const ADS_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' https:",
  "connect-src 'self' https:",
  'frame-src https:',
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const CSP_LINE = /^(\s*)Content-Security-Policy:.*$/m;

/** `_headers` metnindeki Content-Security-Policy satırını değiştirir; tam olarak bir satır bulunmalıdır. */
export function applyCsp(headers: string, csp: string): string {
  const matches = headers.match(new RegExp(CSP_LINE.source, 'gm')) ?? [];
  if (matches.length !== 1) throw new Error(`_headers içinde tam 1 Content-Security-Policy satırı beklenirdi, ${matches.length} bulundu`);
  return headers.replace(CSP_LINE, (_m, indent: string) => `${indent}Content-Security-Policy: ${csp}`);
}
