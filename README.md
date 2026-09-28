# Döviz Arşiv (dovizarsiv.net)

TCMB'nin 1950'den bugüne belirlediği dolar, euro ve sterlin kurlarının ücretsiz, statik ve kaynak gösterimli arşivi.
Veri kaynağı: Türkiye Cumhuriyet Merkez Bankası (TCMB), Elektronik Veri Dağıtım Sistemi (EVDS).

- Ürün tanımı: [`docs/SPEC.md`](docs/SPEC.md)
- Doğrulanmış kararlar: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Devir belgesi (mimari, komutlar, dokunulmazlar, görev listesi): [`docs/HANDOFF.md`](docs/HANDOFF.md)
- Arama niyeti eşlemesi: [`docs/seo-intent-map.md`](docs/seo-intent-map.md) · Kademeli indeksleme: [`docs/indexing-rollout.md`](docs/indexing-rollout.md)

## Mimari (özet)

Astro (statik çıktı) + TypeScript + düz CSS. Veri GitHub Actions'ta EVDS'den çekilir, `data/normalized/` altında JSON olarak
repoda tutulur ve build sırasında sayfalara dönüşür. Ziyaretçi EVDS'ye hiç istek atmaz. Barındırma: Cloudflare Pages (ücretsiz).
Ayrıntılar HANDOFF.md §B'de.

## Kurulum

```sh
npm ci                 # Node 22
cp .env.example .env   # EVDS_API_KEY yalnızca .env ve GitHub Secrets'ta durur; asla commit edilmez
npm run dev
```

### EVDS API anahtarı

1. https://evds3.tcmb.gov.tr/ adresinde üye olun ve giriş yapın.
2. Profil → "API Anahtarı" ile anahtar oluşturun.
3. Yerelde `.env` → `EVDS_API_KEY=...`. GitHub'da: Settings → Secrets and variables → Actions → `EVDS_API_KEY`.

Anahtar kodda, logda, commit'te veya build çıktısında yer almaz. `build-guard --post`, dist/ içinde anahtar bulursa build'i düşürür.

## Veri

| Komut | Açıklama |
|---|---|
| `npm run data:discover` | Seri kodlarını ve son tarihi EVDS metadata'sından doğrular |
| `npm run data:update` | Artımlı güncelleme. `-- --full`: 1950'den tam yenileme |
| `npm run data:validate` | Şema, aralık, alış ≤ satış, tazelik, çapraz kontrol |
| `npm run data:stats` | Özet, anomali raporu (`data/metadata/anomalies.json`) |

- **Günlük güncelleme:** `.github/workflows/data-update.yml`, hafta içi TCMB'nin 15.30 kurunun EVDS'ye düşmesinden sonra çalışır
  (saat: DECISIONS D-013). Yeni veri varsa `data/` commit'lenir, Cloudflare Pages yeniden build eder.
- **Tarih konvansiyonu:** sayfadaki tarih, TCMB'nin kuru **belirlediği** gündür. EVDS aynı kuru bir sonraki iş gününün tarihiyle
  yayımlar (DECISIONS D-012, `/metodoloji/#tarih-konvansiyonu`).
- **2005 para reformu:** 2005 öncesi değerler 1.000.000'a bölünerek yeni TL'ye çevrilir. Eski TL karşılığı "Döviz Arşiv hesaplaması"
  olarak gösterilir (D-005).
- **Revizyonlar:** değişen geçmiş değerler `data/metadata/revisions.json`'a yazılır. Otomatik silme yapılmaz.

## Geliştirme ve build

```sh
npm run typecheck && npm test
npm run build        # build-guard → astro build → build-guard → seo:validate → links:check
npm run qa:layout    # 360–1440 px yatay taşma
npm run qa:smoke     # Playwright smoke (Chromium gerekir; CHROMIUM_PATH ile yol verilebilir)
npm run qa:lighthouse
```

Build şu durumlarda başarısız olur: production'da yayıncı adı/e-posta boş, ücretli veri özelliği tanımlı, para birimi verisi
eksik, çıktıda API anahtarı ya da test verisi izi, SEO veya iç link hatası (SPEC §11.7).

## Cloudflare Pages deploy'u

1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → bu repo.
2. Production branch: `main`. Build command: `npm run build`. Build output: `dist`. Ortam değişkeni: `NODE_VERSION=22`.
3. Settings → Builds → Branch control: preview build'leri kapatın ya da yalnızca gereken dallara açın (ücretsiz plan: 500 build/ay).
4. Custom domains → `dovizarsiv.net` ekleyin.
5. **www → apex:** `www.dovizarsiv.net` için DNS kaydı (proxied) + Rules → Redirect Rules: `http.host eq "www.dovizarsiv.net"`
   → `https://dovizarsiv.net${http.request.uri.path}` (301, query string korunur).
6. Canlıda kontrol: `curl -I https://dovizarsiv.net/` → `content-security-policy`, `x-content-type-options` başlıkları;
   `/usd` → `/dolar/` 301; `/tarih/2020-02-31/` → 404.

`src/config/site.ts` içindeki `publisherName` ve `contactEmail` doldurulmadan production build başarısız olur.

## Veri kullanım uyumu

EVDS ve TCMB internet sitesi kullanım şartlarının tarihli kopyaları ve yorum notu `docs/data-usage/` altındadır.
**Her 6 ayda bir ve iş modeli değişmeden önce** şartları yeniden kontrol edin; değişiklik varsa yeni tarihli kopya ekleyip
DECISIONS'a kayıt düşün. Site ücretsizdir; veriye bağlı ücretli özellik eklenemez (build guard).

## Search Console ve kademeli indeksleme

1. Search Console → Mülk ekle → Alan adı → `dovizarsiv.net` → verilen TXT kaydını Cloudflare DNS'e ekleyin → Doğrula.
2. Sitemaps → `https://dovizarsiv.net/sitemap-index.xml` gönderin.
3. Gün sitemap'lerini `docs/indexing-rollout.md` takvimine göre `src/config/indexing.ts` → `DATE_SITEMAP_YEARS`'a ekleyin.

## CSP ve reklam

Bugünkü CSP `script-src 'self'`'tir. Tüm script'ler harici dosyadır (`assetsInlineLimit: 0`), satır içi script yazmayın.
AdSense/CMP açılırken `public/_headers`'daki CSP genişletilir. Gerekli alan adları ve aktivasyon adımları HANDOFF.md §D-7'dedir.
_(AdSense/CMP/ads.txt kurulum ayrıntıları: Sonnet tamamlayacak.)_

## Para birimi ve rehber ekleme

- **Para birimi:** önce EVDS'de serinin varlığını `data:discover` ile doğrulayın. Ardından `src/config/evds-series.ts` ve
  `src/config/currencies.ts`'e ekleyip `data:update -- --full` çalıştırın. Bu, DO-NOT-TOUCH alanına dokunur ve owner onayı ister.
  Dosya sayısı etkisini hesaplayın (HANDOFF.md §F-4).
- **Rehber:** _(Sonnet tamamlayacak.)_

## Sorun giderme

| Belirti | Neden / çözüm |
|---|---|
| Actions "Veri güncelleme" kırmızı, `crosscheck` uyuşmazlığı | Arşiv serisi ile `.YTL` serisi farklı değer veriyor. `data/metadata/crosscheck.json`'a bakın; veriyi elle düzeltmeyin |
| `data:validate` tazelik hatası | EVDS birkaç gündür yeni gün vermiyor ya da iş akışı çalışmıyor (main'de mi?) |
| Build "description … karakter" hatası | Sayfa açıklaması 50–170 karakter aralığında olmalı |
| `seo:validate`: "hiçbir sitemap'te yok" | Yeni sayfa `src/config/static-routes.ts`'e eklenmemiş |
| `links:check`: kırık link | `FEATURES` bayrağı sayfa var olmadan açılmış olabilir |
| Tarayıcıda script çalışmıyor, konsolda CSP hatası | Satır içi script eklenmiş. Harici modül script'e taşıyın |
| _(Diğerleri: Sonnet tamamlayacak.)_ | |
