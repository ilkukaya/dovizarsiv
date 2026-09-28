/**
 * Reklam çalışma zamanı (yalnızca ADS.mode === 'live' iken /ads/runtime.js olarak üretilir; başka kipte dosya YOKTUR).
 * Sırası (Google "Set up consent mode on websites"): 1) varsayılan onay durumu "denied" (wait_for_update 500 ms),
 * 2) onay yönetimi (CMP) script'i, 3) AdSense script'i, 4) görünür reklam birimlerinin başlatılması.
 * Onay penceresini bu site çizmez ve onay kararını kendisi vermez: Google sertifikalı CMP `gtag('consent','update',…)` çağırır.
 * Özel bir CMP için `window.dovizarsivConsent.update({...})` bağlantı noktası vardır.
 * Bu dosya tarayıcı için düz JS üretir (bağımlılık yok); vm ile testi tests/ads-runtime.test.ts'de.
 */
import type { AdsConfig } from '../../config/ads.ts';

export const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

export function runtimeSource(config: Pick<AdsConfig, 'clientId' | 'cmpSrc'>): string {
  const cfg = JSON.stringify({ clientId: config.clientId, cmpSrc: config.cmpSrc, adsenseSrc: ADSENSE_SRC }).replace(/</g, '\\u003c');
  return `(function () {
  if (window.__dovizarsivAds) return;
  window.__dovizarsivAds = true;
  var cfg = ${cfg};
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (!window.gtag) window.gtag = gtag;
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
  window.dovizarsivConsent = { update: function (state) { gtag('consent', 'update', state); } };
  function load(src, crossorigin) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    if (crossorigin) s.setAttribute('crossorigin', 'anonymous');
    document.head.appendChild(s);
  }
  if (cfg.cmpSrc) load(cfg.cmpSrc, false);
  load(cfg.adsenseSrc + '?client=' + encodeURIComponent(cfg.clientId), true);
  window.adsbygoogle = window.adsbygoogle || [];
  var units = document.querySelectorAll('ins.adsbygoogle');
  for (var i = 0; i < units.length; i++) {
    // Gizli birimler (ör. mobilde ikincil slot) başlatılmaz.
    if (units[i].offsetParent === null) continue;
    try { window.adsbygoogle.push({}); } catch (e) {}
  }
})();
`;
}
