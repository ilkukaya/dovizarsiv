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

- **Günlük güncelleme:** `.github/workflows/data-update.yml`, hafta içi 16.40 TSİ'de çalışır (kur 15.30'da belirlenir,
  ≈16.00'da EVDS'ye düşer; DECISIONS D-013). 19.40 yedek ve ertesi sabah 07.15 telafi çalışmaları vardır. Yeni veri varsa `data/` commit'lenir, Cloudflare Pages yeniden build eder.
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

## Yayın (deploy)

Site tamamen statiktir (`dist/`). `npm run build` tek geçerli build komutudur (build-guard + astro build + CSP dönüşümü + seo:validate + links:check).

**Bugünkü yayın: Netlify** (`dovizarsiv.netlify.app`). Netlify repoya bağlıdır; `main`'e her push ya da veri commit'i `netlify.toml`'daki ayarlarla derlenir
(`npm run build`, çıktı `dist`, `NODE_VERSION=22`, `DOVIZARSIV_ENV=production`). `_headers` ve `_redirects` Netlify'da aynen çalışır.
Ücretsiz planda her production deploy kredi harcar (DECISIONS D-001: ayda ≈20 deploy). Günlük veri commit'i ayda ≈22 deploy demektir;
krediyi Netlify panelinden izleyin.

**Planlanan ana host: Cloudflare Pages** (statik istekler sınırsız ve ücretsiz):
1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → bu repo.
2. Production branch: `main`. Build command: `npm run build`. Output: `dist`. Ortam değişkeni: `NODE_VERSION=22`.
3. Settings → Builds → Branch control: preview build'leri kapatın ya da sınırlayın (ücretsiz plan: 500 build/ay).
4. Custom domains → `dovizarsiv.net`.
5. **www → apex:** `www` için DNS kaydı (proxied) + Rules → Redirect Rules: `http.host eq "www.dovizarsiv.net"` → `https://dovizarsiv.net${http.request.uri.path}` (301, query string korunur).
6. Canlıda kontrol: `curl -I https://dovizarsiv.net/` → `content-security-policy`, `x-content-type-options`; `/usd` → `/dolar/` 301; `/tarih/2020-02-31/` → 404.

**Alan adı bağlama (Netlify ya da Cloudflare):** kanonik adres `https://dovizarsiv.net`'tir (`src/config/site.ts`). Alan adı bağlanana kadar
`*.netlify.app` adresi de yanıt verir; sayfaların canonical'ı yine `dovizarsiv.net`'i gösterir. Alan adını bağladıktan sonra `www` → apex yönlendirmesini ekleyin.

`src/config/site.ts` içindeki `publisherName` ve `contactEmail` boş bırakılırsa production build başarısız olur.

## Veri kullanım uyumu

EVDS ve TCMB internet sitesi kullanım şartlarının tarihli kopyaları ve yorum notu `docs/data-usage/` altındadır.
**Her 6 ayda bir ve iş modeli değişmeden önce** şartları yeniden kontrol edin; değişiklik varsa yeni tarihli kopya ekleyip
DECISIONS'a kayıt düşün. Site ücretsizdir; veriye bağlı ücretli özellik eklenemez (build guard).

## Search Console ve kademeli indeksleme

1. Search Console → Mülk ekle → Alan adı → `dovizarsiv.net` → verilen TXT kaydını Cloudflare DNS'e ekleyin → Doğrula.
2. Sitemaps → `https://dovizarsiv.net/sitemap-index.xml` gönderin.
3. Gün sitemap'lerini `docs/indexing-rollout.md` takvimine göre `src/config/indexing.ts` → `DATE_SITEMAP_YEARS`'a ekleyin.

## Reklam, onay yönetimi ve ads.txt

Reklam **varsayılan olarak kapalıdır**: kapalıyken çıktıda reklam kutusu, script, `/ads.txt` ve `/ads/runtime.js` yoktur. Tasarım kararları ve Google
dokümanlarından doğrulananlar için DECISIONS **D-018**. Aktivasyon (SPEC §13) yalnızca gerçek AdSense hesabıyla, sırayla:

1. **AdSense başvurusu** ve site onayı; gerçek publisher ID (`ca-pub-` + 16 rakam) ve reklam birimi kimlikleri.
2. **Onay yönetimi (CMP):** AdSense hesabında "Privacy & messaging" sekmesinden mesajı oluşturun (AEA/UK/İsviçre için Google sertifikalı CMP zorunlu; Türkiye için KVKK çerez bilgilendirmesi).
   Aldığınız script adresini `PUBLIC_CMP_SRC`'ye yazın. Snippet ek satır içi kod içeriyorsa `src/lib/ads/runtime.ts` genişletilmelidir (DECISIONS D-018 "doğrulanamayanlar").
3. **Ortam değişkenleri** (Netlify/Cloudflare panelinde; koda yazılmaz): `PUBLIC_ADSENSE_ENABLED=true`, `PUBLIC_ADSENSE_CLIENT`, `PUBLIC_ADSENSE_SLOT_PRIMARY`
   (ve isteğe bağlı `PUBLIC_ADSENSE_SLOT_SECONDARY`), `PUBLIC_CMP_SRC`. Geçersiz ya da eksik değerde build hata verir; production'da CMP olmadan reklam açılamaz.
4. **ads.txt** otomatik üretilir (`google.com, pub-…, DIRECT, f08c47fec0942fa0`, kök dizinde); sahte ID hiçbir zaman yazılmaz. AdSense → Siteler'den "ads.txt" durumunu kontrol edin.
5. **CSP:** reklam canlı kipteyken build sonrası `dist/_headers` içindeki CSP, Google'ın desteklediği daha gevşek biçime çevrilir (Google yalnızca nonce'lu strict CSP'yi destekler; alan adı listesi tutulmaz).
   Yayına almadan önce bu politikayı `Content-Security-Policy-Report-Only` ile deneyin (Google'ın önerisi).
6. **Gizlilik, çerez ve reklam politikası sayfalarını güncelleyin** (`src/pages/gizlilik.astro`, `cerez-politikasi.astro`, `reklam-politikasi.astro`): reklam sağlayıcısı, çerezler ve onay yönetimi yazılmadan yayına almayın.
7. Az sayıda slotla başlayın; Core Web Vitals'ı (Search Console / CrUX) izleyin, deneyim bozulmadıkça slot sayısını artırmayın.

QA için **test kipi**: `PUBLIC_ADSENSE_ENABLED=true PUBLIC_ADSENSE_TEST_MODE=true npm run build` sabit yükseklikli yer tutucu kutular basar (harici script yok); production'da build'i düşürür.
Yerleşim kuralları (SPEC §10): tarih seçici, hesaplayıcı formları, önceki/sonraki gezinme yakınında ve araç/404/yasal sayfalarda reklam yoktur; ikincil slot yalnızca ≥ 900 px'te görünür.

## Analitik

`PUBLIC_ANALYTICS_ENABLED=false` (varsayılan; şu an kod yoktur). Seçenekler (karar owner'ındır):
- **Cloudflare Web Analytics:** çerezsiz, yalnızca Cloudflare'de barındırılırsa kolay; onay banner'ı gerektirmeyebilir (hukuki durum için danışın).
- **GA4 + Consent Mode v2:** ayrıntılı ama çerez ve onay gerektirir; `window.dovizarsivConsent.update(...)` bağlantı noktası vardır.
Meta Pixel, Hotjar ve Clarity eklenmez. Ölçüm eklenirse gizlilik ve çerez sayfaları aynı değişiklikle güncellenmelidir.

## Para birimi, rehber ve sayfa ekleme

- **Para birimi:** önce EVDS'de serinin varlığını `data:discover` ile doğrulayın. Ardından `src/config/evds-series.ts` ve `src/config/currencies.ts`'e ekleyip
  `data:update -- --full` çalıştırın. Bu, veri katmanına dokunur (owner onayı, DECISIONS kaydı). Dosya sayısı etkisini hesaplayın (HANDOFF.md §F-4).
- **Rehber yazısı:** `src/content/guides/<slug>.md` dosyası ekleyin (frontmatter: `title`, `description` 50–170 karakter, `order`, `updated`, en az bir `sources` ve `related`).
  Ardından `src/config/static-routes.ts`'e `/rehber/<slug>/` satırını (`kind: 'guide'`, `sitemap: 'guides'`, aynı `updated`) ekleyin. `npm test` (yasak kalıp, kaynak, rota tutarlılığı)
  ve `npm run build` (seo:validate, links:check) bunu denetler. Doğrulanamayan olgu yazılmaz; iddiaları `docs/guides-review.md`'ye işleyin.
- **Yeni sayfa (araç, yasal, bilgi):** HANDOFF.md §B "Yeni sayfa nasıl eklenir".

## Kalite kapıları ve testler

| Komut | Ne denetler |
|---|---|
| `npm test` | 167+ birim testi (Decimal, normalizasyon, tarih konvansiyonu, araç mantığı, metin motoru, rehber kalite kapısı, reklam yapılandırması/çalışma zamanı/CSP, tercihler) |
| `npm run build` | build-guard (yayıncı bilgisi, ücretli özellik, mock veri, API anahtarı izi) + seo:validate + links:check |
| `npm run qa:smoke` | Playwright: tarih bulucu, 404, araçlar, mini hesaplayıcı, rehber/yasal sayfalar, paylaş, localStorage, baskı, klavye, "reklam kapalı = iz yok" |
| `npm run qa:layout` | 25 sayfa × 7 genişlikte yatay taşma (araç sonuçları açıkken de) |
| `npm run qa:lighthouse` | mobil ve masaüstü Lighthouse tablosu |
| `npm run verify:stats` + `python3 scripts/validation/independent-recompute.py` | ortalama, en düşük/en yüksek, yüzde değişimin bağımsız (Python Decimal) yeniden hesabı |
| `[verify]` commit etiketi (Actions) | TCMB bülteni ve EVDS ile birebir tarih/değer karşılaştırması (konteyner TCMB'ye erişemez) |

## Sorun giderme

| Belirti | Neden / çözüm |
|---|---|
| Actions "Veri güncelleme" kırmızı, `crosscheck` uyuşmazlığı | Arşiv serisi ile `.YTL` serisi farklı değer veriyor. `data/metadata/crosscheck.json`'a bakın; veriyi elle düzeltmeyin |
| `data:validate` tazelik hatası | EVDS birkaç gündür yeni gün vermiyor ya da iş akışı çalışmıyor (main'de mi?) |
| Build "description … karakter" hatası | Sayfa açıklaması 50–170 karakter aralığında olmalı |
| `seo:validate`: "hiçbir sitemap'te yok" | Yeni sayfa `src/config/static-routes.ts`'e eklenmemiş |
| `links:check`: kırık link | `FEATURES` bayrağı sayfa var olmadan açılmış olabilir |
| Tarayıcıda script çalışmıyor, konsolda CSP hatası | Satır içi script eklenmiş. Harici modül script'e taşıyın |
| Build: "publisherName boş (production)" | `src/config/site.ts` yayıncı adı ve e-posta doldurulmalı (`DOVIZARSIV_ENV=production` ya da `CF_PAGES_BRANCH=main` iken zorunlu) |
| Build: "Reklam yapılandırması geçersiz" | `PUBLIC_ADSENSE_*` değerleri eksik/biçimsiz ya da production'da `PUBLIC_CMP_SRC` yok; ayrıntı hata metninde |
| CI `typecheck`: `astro:content` bulunamadı | `npm run typecheck` önce `astro sync` çalıştırır; yerelde `.astro/` silinmişse aynı komutu kullanın |
| Reklam açıldı ama reklam görünmüyor | Tarayıcı konsolunda CSP ihlali, ads.txt durumu (AdSense → Siteler), onay (CMP) mesajı ve reklam birimi kimliklerini kontrol edin; site onayı bekleniyor olabilir |
| Araç "Kur verisi yüklenemedi" diyor | `/veri/kurlar/{yıl}.json` erişilemiyor (ağ ya da yanlış base). Sayfayı yenileyin; başarısız istek önbelleğe alınmaz |
| Gün sayfası yok (404) | O gün TCMB kur belirlemedi (hafta sonu/tatil/arife) ya da 2000 öncesi; ay sayfası kullanılır. Tarih seçici en yakın önceki günü açar |
| Veri güncellemesi yok | `data-update.yml` yalnızca varsayılan dalda (`main`) zamanlanır; EVDS yayın saati DECISIONS D-013 |
| Netlify deploy krediniz bitti | Ücretsiz planda ayda ≈20 deploy (D-001); Cloudflare Pages'e geçin ya da veri güncellemesini seyreltin |
