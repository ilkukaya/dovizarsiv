# Lansman kontrol listesi

Durum: **2026-09-28**. Site `https://dovizarsiv.netlify.app/` adresinde yayında (Netlify, `main`'den otomatik). Alan adı, reklam ve Search Console henüz yok;
bu listedeki "Owner" maddeleri müsait olunca yapılır. ✅ = yapıldı ve doğrulandı, ⬜ = bekliyor.

## A. Teknik (yapıldı)

| | Madde | Kanıt |
|---|---|---|
| ✅ | Tam geçmiş veri (1950 → bugün), günlük güncelleme zamanlaması ölçüldü | DECISIONS D-013, D-014 |
| ✅ | Tarih konvansiyonu B, 73 TCMB bülteniyle birebir | DECISIONS D-012 |
| ✅ | EVDS ile rastgele 10 tarih birebir (ham değerler) | DECISIONS D-014, D-019 |
| ✅ | Ortalama/en düşük/en yüksek/yüzde bağımsız (Python) yeniden hesap: 44 karşılaştırma, 0 fark | DECISIONS D-019 |
| ✅ | `npm run build` (build-guard, seo:validate, links:check) temiz, production kipinde de | 9.081 sayfa, 679.913 iç link |
| ✅ | Birim testleri | 167/167 |
| ✅ | Smoke (Playwright): tarih bulucu, 404, araçlar, rehber, yasal sayfalar, paylaş, tercihler, baskı, klavye | `npm run qa:smoke` |
| ✅ | 360–1440 px yatay taşma yok (25 sayfa, araç sonuçları açıkken de) | `npm run qa:layout` |
| ✅ | Lighthouse mobil+masaüstü: 100/100/100/100, CLS 0,000; en yüksek LCP 1,5 sn | `npm run qa:lighthouse` |
| ✅ | Güvenlik başlıkları, CSP (`script-src 'self'`), `/usd` → `/dolar/` 301, gerçek 404 canlıda doğrulandı | Actions canlı kontrolü |
| ✅ | Sitemap index + robots.txt canlıda; gün sitemap'leri kademeli (henüz index'te yok) | `docs/indexing-rollout.md` |
| ✅ | Yayıncı adı ve iletişim e-postası dolu | `src/config/site.ts` |
| ✅ | Reklam KAPALI: çıktıda reklam kutusu/script/ads.txt yok | smoke testi |
| ✅ | API anahtarı repoda, çıktıda ve loglarda yok (yalnızca GitHub Secrets) | build-guard `--post` |
| ✅ | CI yeşil (typecheck, test, veri doğrulaması, build) | GitHub Actions |

## B. Owner: alan adı ve yayın

| | Madde | Nasıl |
|---|---|---|
| ⬜ | `dovizarsiv.net` alan adını alın | Kayıt firması |
| ⬜ | Alan adını bağlayın (Netlify → Domain management ya da Cloudflare Pages → Custom domains) | README "Yayın" |
| ⬜ | `www` → apex 301 yönlendirmesi | README "Yayın", adım 5 |
| ⬜ | HTTPS ve canonical'ın (`https://dovizarsiv.net/…`) yanıt verdiğini kontrol edin | `curl -I https://dovizarsiv.net/` |
| ⬜ | (Öneri) Cloudflare Pages'e geçiş: Netlify ücretsiz planı ayda ≈20 deploy'a yeter; günlük veri güncellemesi ≈22 deploy üretir | DECISIONS D-001 |
| ⬜ | `EVDS_API_KEY` GitHub Secret'ı: mevcut. Anahtar sohbette paylaşıldığı için EVDS'den yenilemeniz önerilir; yalnızca Secret'ı güncelleyin | EVDS → Profilim |

## C. Owner: Search Console ve kademeli indeksleme

| | Madde | Nasıl |
|---|---|---|
| ⬜ | Search Console: alan adı mülkü, DNS TXT doğrulaması | README "Search Console…" |
| ⬜ | `https://dovizarsiv.net/sitemap-index.xml` gönderimi | Search Console → Sitemaps |
| ⬜ | Gün sitemap'lerini yıl yıl açın (2026, 2025 → … 2000); ilk adım L+7 gün | `docs/indexing-rollout.md`, `src/config/indexing.ts` |
| ⬜ | İlk hafta: kapsam raporu, "Tarandı – dizine eklenmedi" oranı, Core Web Vitals (alan verisi) | Search Console |

## D. Owner: içerik incelemesi

| | Madde | Nasıl |
|---|---|---|
| ⬜ | 10 rehber yazısını bir insan okusun; "gösterge" yorumu, efektif/döviz tanımı, alış/satış yönü | `docs/guides-review.md` |
| ⬜ | Gizlilik ve KVKK metnini hukuken gözden geçirin (barındırma sağlayıcısı, localStorage, iletişim) | `docs/guides-review.md` §4–6 |
| ⬜ | Doğrulanamayan olguları isterseniz resmî kaynaktan doğrulayıp yazılara ekleyin | `docs/guides-review.md` "bilerek yazılmayan olgular" |
| ⬜ | Veri kullanım şartlarını 6 ayda bir ve iş modeli değişmeden önce kontrol edin (sonraki: **2027-03-28**) | `docs/data-usage/README.md` |

## E. Owner: reklam (yalnızca ileride)

Reklam açılmadan **önce** sırayla (ayrıntı README "Reklam, onay yönetimi ve ads.txt", DECISIONS D-018):

| | Madde |
|---|---|
| ⬜ | AdSense başvurusu, site onayı, gerçek publisher ID ve reklam birimi kimlikleri |
| ⬜ | AdSense → Privacy & messaging: Google sertifikalı CMP mesajı; script adresi `PUBLIC_CMP_SRC` (snippet ek kod içeriyorsa `runtime.ts` genişletilir) |
| ⬜ | Ortam değişkenleri: `PUBLIC_ADSENSE_ENABLED=true`, `PUBLIC_ADSENSE_CLIENT`, `PUBLIC_ADSENSE_SLOT_PRIMARY` (+ isteğe bağlı `..._SECONDARY`), `PUBLIC_CMP_SRC` |
| ⬜ | Reklam CSP'sini `Content-Security-Policy-Report-Only` ile deneyin (Google önerisi) |
| ⬜ | `/ads.txt` yayında ve AdSense'te "Authorized" mı kontrol edin |
| ⬜ | Gizlilik, çerez ve reklam politikası sayfalarını güncelleyin (sağlayıcı, çerezler, onay yönetimi) |
| ⬜ | Az slotla başlayın; Core Web Vitals'ı (canlı CLS) izleyin |

## F. Bilinen sınırlar ve takip edilecekler

- **Metin motoru (DO-NOT-TOUCH):** `src/lib/text/engine.ts` satır 214'te dönem ortalaması `s.mean.round(4)` ile yuvarlanır. 1990 öncesi çok küçük yeni-TL değerlerinde
  (ör. 1985 sterlin) cümledeki ortalama "0,0007 TL" görünür, istatistik kartlarında ise tam değer (8 ondalık) yazar. Düzeltme tek satırdır (`roundRate(s.mean)`); protected dosya olduğu için owner onayı beklenir.
- **Hesaplayıcı JS gerektirir.** JS kapalıyken sayfa açıklaması ve arşiv linkleri görünür; tarih seçici de JS'siz `/tarih-arsivi/`'ne düşer.
- **Netlify deploy kredisi:** bkz. B.
- **Yerel Lighthouse** CDN değildir; gerçek alan verisi lansman sonrası izlenmelidir.
- **CMP snippet biçimi** ve duyarlı reklam öznitelikleri doğrulanamadı (DECISIONS D-018).
- **Veri revizyonu:** geçmiş bir değer EVDS'de değişirse `data/metadata/revisions.json`'a yazılır; büyük dalga crosscheck'te Actions'ı düşürür (HANDOFF §F).
