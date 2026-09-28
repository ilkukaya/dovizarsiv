# HANDOFF: Opus → Sonnet

Bu belge, Opus'un bitirdiği temeli (Faz 0–2) ve Sonnet'in yapacağı işleri tanımlar. Önce `docs/SPEC.md`'yi, sonra
`docs/DECISIONS.md`'yi okuyun. SPEC değişmez; doğrulanan her yeni bilgi DECISIONS'a yeni bir `D-0xx` kaydı olarak yazılır.

---

## A. Durum

| Alan | Durum |
|---|---|
| Veri hattı (SPEC §4) | ✅ 1950 → bugün tam geçmiş; 45.437 gözlem, 19.262 belirlenme günü; çapraz kontrol 0 uyuşmazlık (D-014) |
| Tarih konvansiyonu B (owner kararı #2) | ✅ tek fonksiyon + testler; 73 TCMB XML bülteniyle birebir doğrulandı (D-012) |
| Günlük güncelleme (GitHub Actions) | ✅ `data-update.yml`: hafta içi 16.40 TSİ + 19.40 yedek + ertesi sabah 07.15 telafi (D-013: kur ≈16.00'da EVDS'de) |
| Referans sayfalar (SPEC §6.3–6.8, §6.11'in ikisi, §6.12) | ✅ ana sayfa, 3 hub, yıl, ay, gün, tarih arşivi, metodoloji, veri kaynakları, 404 |
| Teknik SEO (SPEC §8) | ✅ merkezi layout, isIndexablePage, sitemap index + gruplar, robots, `_headers`, `_redirects`, JSON-LD |
| Kalite kapıları (SPEC §11.1, 11.2, 11.3, 11.7) | ✅ seo:validate, links:check, build-guard, 71 birim testi |
| QA (SPEC §9, §11.5) | ✅ 360–1440 px taşma yok; Lighthouse 7 sayfa × 2 profil = 100/100/100/100 (D-015) |
| Araçlar (D-1…D-4) | ✅ Faz A: 3 araç + gün sayfası mini hesaplayıcı; mantık `src/lib/tools/`, 21 birim testi, smoke senaryoları |
| Rehber (10 yazı) ve yasal sayfalar (D-5, D-6) | ✅ Faz B: `src/content/guides/`, 6 yasal sayfa; insan incelemesi: `docs/guides-review.md` |
| Reklam altyapısı, paylaş/baskı/localStorage (D-7, D-8) | ✅ Faz C: varsayılan KAPALI; `src/config/ads.ts`, `AdSlot`, `/ads/runtime.js`, `ads.txt`, CSP dönüşümü; DECISIONS D-018 |
| E2E, a11y/perf turu, README, lansman listesi (D-9, D-10) | ✅ Faz D: klavye/etiket smoke'u, README tamamlandı, `docs/LAUNCH-CHECKLIST.md`, bağımsız veri doğrulaması (DECISIONS D-019) |

### Komutlar

| Komut | Ne yapar |
|---|---|
| `npm ci` | Bağımlılıklar (Node 22) |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | build-guard `--pre` → `astro build` → build-guard `--post` → `seo:validate` → `links:check`. **Tek geçerli build komutu**; Cloudflare Pages da bunu çalıştırır |
| `npm run build:site` | Yalnızca `astro build` (hızlı deneme; doğrulama yok, deploy için kullanılmaz) |
| `npm test` / `npm run typecheck` | vitest / `tsc --noEmit` (strict + `noUncheckedIndexedAccess`) |
| `npm run seo:validate` / `npm run links:check` | dist/ üzerinde SEO ve iç link doğrulaması (build içinde de çalışır) |
| `npm run qa:layout` | 13 sayfa × 7 genişlikte yatay taşma kontrolü (`-- --shots=dizin` ile ekran görüntüsü) |
| `npm run qa:smoke` | Tarih bulucu, 404, mobil menü smoke testi (Sonnet genişletir) |
| `npm run qa:lighthouse` | Lighthouse tablosu (mobil + masaüstü) |
| `npm run data:discover` | EVDS seri keşfi (`--latest`: son tarih; `--watch --until=HH:MM`: yayın saati izleme) |
| `npm run data:update` | Artımlı güncelleme (`-- --full`: 1950'den tam yenileme). `EVDS_API_KEY` gerekir |
| `npm run data:validate` / `npm run data:stats` | Veri doğrulama / özet + anomali raporu |
| `npm run verify:bulletins` / `npm run verify:evds-spot` | TCMB XML bülten ve EVDS birebir kontrolü (yalnızca Actions'ta; konteynerden TCMB'ye erişim yok) |
| `npm run assets:images` | favicon/OG PNG'lerini yeniden üretir |

Bu geliştirme ortamı `tcmb.gov.tr`'ye erişemez. EVDS gerektiren işler GitHub Actions'ta commit mesajı etiketiyle tetiklenir:
`[data-update]`, `[data-full]`, `[verify]`, `[watch]` (yalnızca `claude/**` dallarında). Veriyi elle düzenlemeyin.

---

## B. Mimari

```
EVDS (yalnızca Actions) ──> scripts/data/update.ts ──> data/normalized/{yıl}.json  (tek doğruluk kaynağı)
                                                    ├─> data/aggregate/{USD,EUR,GBP}/…
                                                    └─> data/metadata/… (coverage, crosscheck, anomalies, flat-months, …)
data/normalized ──> src/lib/data/store.ts (build zamanı) ──> sayfalar, endpoint'ler, sitemap
                                                          └─> dist/veri/kurlar/{yıl}.json, dist/veri/gunler.json (araçlar için)
```

- **Ziyaretçi hiçbir zaman EVDS'ye istek atmaz.** Site tamamen statiktir; tarayıcıya yalnızca gereken yılın küçük JSON'u gider.
- **Gözlem modeli** (`src/lib/data/model.ts`): `date` = TCMB'nin kuru **belirlediği** gün (sitenin tarihi); `sourceDate` = EVDS
  satırının tarihi (kurun **geçerli** olduğu gün). Değerler ondalık **string**'tir; hesaplar `Decimal` (BigInt) ile yapılır,
  yuvarlama yalnızca gösterimde (`src/lib/formatting/format.ts`) olur. `number`/`parseFloat` ile kur hesabı yapmayın.
- **2005 öncesi** değerler depoda yeni TL'dir (÷10⁶, `normalization` alanında kayıtlı). Eski TL gösterimi `toTry`/`buildDayView` ile yapılır ve
  "Döviz Arşiv hesaplaması" olarak etiketlenir.
- **Konvansiyon B:** gün sayfasının ana değeri o gün belirlenen kurdur. İkinci satır "Bu tarihte geçerli olan kur (bir önceki
  iş günü belirlenen)" `store.validOn()` ile gelir. Ay/yıl istatistikleri, araçlar ve metin motoru aynı konvansiyonu kullanır.
- **Kur türü varsayılanı** (`src/lib/calculations/convert.ts` → `defaultRateField`): TL → döviz **döviz satış**, döviz → TL **döviz alış**.

### Klasörler

| Yol | Sorumluluk |
|---|---|
| `src/config/` | `site.ts` (kimlik, FEATURES, PAID_FEATURES), `currencies.ts`, `evds-series.ts`, `indexing.ts`, `static-routes.ts` |
| `src/lib/data/` | model, konvansiyon, normalize, store, lookup, tarih yardımcıları |
| `src/lib/calculations/` | Decimal, istatistik, çevirme |
| `src/lib/formatting/` | tr-TR sayı ve tarih biçimleri, `decadeLabel` |
| `src/lib/text/engine.ts` | programatik metin motoru |
| `src/lib/seo/` | indexable, urls, schema, routes |
| `src/lib/pages/day.ts` | gün sayfası görünüm modeli (`buildDayView`) |
| `src/lib/charts/svg.ts` | build zamanı SVG grafik |
| `src/components/`, `src/layouts/`, `src/styles/` | UI |
| `scripts/{data,seo,validation,qa,assets}` | hat, doğrulayıcılar, QA |

### Bileşenler (props)

| Bileşen | Props | Not |
|---|---|---|
| `BaseLayout` | `title` (marka eki olmadan), `description` (50–170 karakter, aksi halde build düşer), `path` (canonical), `page: IndexabilityInput`, `crumbs?`, `schema?: JsonLd[]`, `ogImage?`, `rawTitle?`, `navCurrent?` | Title/description/canonical/robots/OG/JSON-LD'nin **tek** yeri. Sayfa meta etiketi yazmaz |
| `SiteHeader` | `current?` | FEATURES bayrakları açılınca Hesaplama/Rehber linkleri kendiliğinden görünür |
| `SiteFooter` | — | FEATURES.legalPages açılınca yasal linkler görünür |
| `Breadcrumbs` | `crumbs: {name, path}[]` | Layout basar; BreadcrumbList JSON-LD ile aynı veri |
| `SourceDisclosure` | `dataType?`, `dataDate?`, `calculated?`, `preRedenomination?` | Her veri sayfasında ZORUNLU (`data-source-disclosure`; seo:validate kontrol eder) |
| `ExchangeRateTable` | `caption`, `firstHeader`, `valueHeaders`, `rows: RateRow[]`, `showChange?`, `changeHeader?`, `fractionDigits?` | Mobilde kendi kabında kayar |
| `RateStatGrid` | `stats: Stat[]`, `label` | |
| `HistoricalChart` | `id`, `title`, `summary`, `points`, `scale?`, `xLabel?`, `tableNote?` | Build zamanı SVG, JS yok; erişilebilir özet + tablo |
| `Move` | `pct: Decimal \| null` | ▲/▼/● + yüzde; renk tek başına anlam taşımaz |
| `DateFinder` | `id?`, `label?`, `buttonText?` | Harici modül script; JS yoksa /tarih-arsivi/'ne düşer |
| `RelatedDates` | `date` | Önceki/sonraki 5 gözlem, diğer yılların aynı günü |
| `ArchiveNavigator` | `years`, `hrefFor`, `current?`, `headingLevel?`, `title?` | Onlu yıllara gruplar |

### Yeni sayfa nasıl eklenir

1. Yol için `src/lib/seo/urls.ts` → `paths` yardımcısını kullanın (araç ve rehber yolları hazır). Trailing slash zorunlu.
2. Sayfayı `BaseLayout` ile sarın; `page.kind` doğru olsun (`tool`, `guide`, `legal`, `info`).
3. Veriden türemeyen her yeni sayfayı `src/config/static-routes.ts` → `STATIC_ROUTES` listesine ekleyin (`sitemap: 'pages'` ya da
   `'guides'`, `updated`: son anlamlı içerik değişikliği). Eklemezseniz `seo:validate` "indekslenebilir ama hiçbir sitemap'te yok"
   hatasıyla build'i düşürür. Bu, kasıtlı bir korumadır.
4. İlgili `FEATURES` bayrağını `true` yapın. Menü ve footer linkleri bayrakla açılır. Bayrak açılınca `links:check`, linklenen her
   sayfanın var olmasını ister.
5. Yeni niyet ise `docs/seo-intent-map.md`'yi güncelleyin.
6. `npm run build && npm run qa:layout && npm run qa:smoke`.

### Metin motoru nasıl kullanılır

`src/lib/text/engine.ts` fonksiyonları veri gerçeği (`DayFacts`, `DayCurrencyFacts`, `PeriodFacts`) alır, cümle dizisi döndürür.
Veri yoksa cümle üretmez. Dallanma yükseliş/düşüş/yatay, rekor, seri başlangıcı ve ay içi konuma göredir. Kurallar:
- Motoru çağırın, çıktısını değiştirmeyin. Yeni cümle kalıbı gerekiyorsa **Opus'un alanıdır** (DO-NOT-TOUCH). Sonnet yeni metni
  sayfa içinde sabit, veri dışı açıklama olarak yazabilir; programatik cümle üretemez.
- Ek eklemeyin: "2020'de", "1950'lerden" gibi Türkçe ekler motor dışında yazılırken ünlü uyumu hatası çıkar. Onlu yıl için
  `decadeLabel()`, tarih için `formatDate()`/`formatDateLong()` kullanın ve cümleyi eksiz kurun ("… tarihinde").
- Sebep yorumu yok (SPEC §6.7): "… nedeniyle yükseldi" yazılmaz.

---

## C. DO-NOT-TOUCH (değiştirmek için owner onayı + DECISIONS kaydı gerekir)

1. **Veri katmanı ve normalize model:** `scripts/data/**`, `src/lib/data/**` (model, `convention.ts`, `normalize.ts`, `store.ts`),
   `src/lib/providers/**`, `src/config/evds-series.ts`, `data/**` (bot yazar; elle düzenleme yok).
2. **Hesap çekirdeği:** `src/lib/calculations/decimal.ts`, `stats.ts`, `convert.ts`. Yeni fonksiyon eklenebilir, var olanın davranışı değişmez.
3. **URL şeması:** `src/lib/seo/urls.ts` içindeki mevcut yollar, `astro.config.mjs` (`trailingSlash: 'always'`, `build.format: 'directory'`,
   `assetsInlineLimit: 0`), `public/_redirects`'teki mevcut kurallar.
4. **İndekslenebilirlik:** `src/lib/seo/indexable.ts` kuralları.
5. **SEO layout'u:** `src/layouts/BaseLayout.astro` (title/description/canonical/robots/OG/JSON-LD mantığı), `src/lib/seo/schema.ts`.
6. **Sitemap mantığı:** `src/lib/seo/routes.ts`, `src/pages/sitemap-*.ts`, `src/pages/robots.txt.ts`. Genişleme noktaları
   `static-routes.ts` ve `indexing.ts`'dir.
7. **Metin motoru:** `src/lib/text/engine.ts` ve testi.
8. **Tasarım token'ları:** `src/styles/tokens.css`. Yeni bileşen stili `components.css`'e eklenir ve mevcut token'ları kullanır.
9. **Kalite kapıları:** `scripts/seo/**`, `scripts/validation/**`. Kural gevşetilmez, test atlanmaz.
10. **`src/config/site.ts` → `PAID_FEATURES`** boş kalır (SPEC §4.2).

Dokunulabilecekler: sayfa şablonlarına **ekleme** (ör. gün sayfasındaki mini hesaplayıcı yuvası), yeni bileşen, `components.css`'e
ekleme, `FEATURES` bayrakları, `static-routes.ts`, `indexing.ts` (takvime göre), `public/` altına yeni dosya, `_headers` CSP
genişletmesi (reklam açılırken, §D-7).

---

## D. Sonnet görev listesi (sırayla)

Her görevin sonunda `npm run typecheck && npm test && npm run build && npm run qa:layout && npm run qa:smoke` temiz olmalı.
Commit başına bir görev. Veri, SEO çekirdeği ve metin motoru değişmez (§C).

### D-1 Geçmiş döviz hesaplayıcısı `/hesaplama/gecmis-doviz/` (SPEC §6.9, §5, §6.2) ✅ TAMAMLANDI (Faz A)
- Island. Veri `/veri/kurlar/{yıl}.json`'dan lazy yüklenir (biçim: `fields` + `rows`, `dateConvention: "determination-date"`).
  Yalnızca seçilen yıl, gerekirse önceki yıl (yılın ilk günleri için) yüklenir.
- Girdiler: tarih, tutar, kaynak ve hedef para birimi (TL dahil), kur türü (varsayılan `defaultRateField`).
- Kur belirlenmeyen tarih → en yakın önceki belirlenme günü. Sonuçta hem **seçilen tarih** hem **kullanılan gözlem tarihi** gösterilir.
- Sonuç: kur türü, kullanılan kur, formül, sonuç, kaynak. SPEC'teki uyarı cümlesi birebir.
- Hesap `Decimal` ile yapılır (tarayıcıya `decimal.ts` import edilebilir). Gösterim `format.ts` ile. 2005 öncesi tarihte eski TL karşılığı da gösterilir.
- JS yokken sayfa anlamlı kalır: açıklama + tarih arşivi linki. Etkileşim durumu indekslenebilir URL üretmez.
- **Kabul:** 2020-01-15, 100 USD → TL = 100 × 5,8827 (döviz alış) = 588,27 TL. 2020-01-12 (Pazar) → 2020-01-10 gözlemi.
  1999-06-15 → eski TL + yeni TL. `STATIC_ROUTES`'a eklendi, `FEATURES.tools` henüz kapalı (D-3 bitince açılır). Smoke'a senaryo eklendi.

### D-2 Kur değişimi `/hesaplama/kur-degisimi/` (SPEC §6.9) ✅ TAMAMLANDI (Faz A)
- Para birimi, kur türü, başlangıç ve bitiş tarihi. Sonuç: iki gözlem (tarihleriyle), mutlak ve yüzde fark (`percentChange`),
  takvim günü sayısı (`daysBetween`), basit SVG grafik (`src/lib/charts/svg.ts` → `buildChart` tarayıcıda kullanılabilir).
- "Getiri" değil "kur değişimi" dili. Yıllar arası seçimde yalnızca gereken yıl JSON'ları yüklenir.
- **Kabul:** yüzde fark yıl sayfasındaki ilk→son değişimle aynı aralıkta birebir tutar (ör. `/dolar/2020/`).

### D-3 Karşılaştırma `/karsilastir/` (SPEC §6.9) ✅ TAMAMLANDI (Faz A)
- Seçilen yıllar × para birimleri için ortalama, en düşük, en yüksek, yıl sonu. Değerler yıl sayfalarıyla birebir aynıdır
  (aynı `summarize` mantığı; eşitlikte en erken tarih). Crawl trap yok: parametreli URL indekslenmez, link üretilmez.
- **Kabul:** 3 araç bitince `FEATURES.tools = true`. Menüde "Hesaplama" görünür, `links:check` temiz, `seo-intent-map` güncel.

### D-4 Gün sayfası mini hesaplayıcı (SPEC §6.7) ✅ TAMAMLANDI (Faz A)
- `src/pages/tarih/[date].astro` içindeki `<div data-mini-calculator-slot hidden>` yuvasını doldurun. O günün kurlarını build
  zamanında `data-*` öznitelikleriyle yuvaya yazın (JSON fetch gerekmez). Script harici modül olmalı (CSP).
- Statik "Hazır hesaplar" tablosu yerinde kalır; island yalnızca özel tutar içindir. CLS 0 kalmalı (yer ayrılmış kutu).
- **Kabul:** Lighthouse `/tarih/2020-01-15/` mobil CLS < 0,05, TBT < 50 ms.

### D-5 Rehber `/rehber/` + 10 yazı (SPEC §6.10, §7) ✅ TAMAMLANDI (Faz B; insan incelemesi bekliyor: docs/guides-review.md)
- `src/content/` altında content collection. Her yazı Article JSON-LD (yeni tipli yardımcı `schema.ts`'e **eklenebilir**;
  mevcut yardımcılar değişmez), BreadcrumbList, ilgili arşiv/araç linkleri.
- Doğrulanamayan olgu yok. Olgular resmi kaynaklara linklenir (TCMB, Resmî Gazete). Yazar/uzman/editör uydurulmaz.
  Yazılar "insan incelemesine hazır taslak"tır; README'de inceleme notu yer alır.
- Yazı 10 (2005 para reformu) `/metodoloji/#para-reformu-2005`'e, yazı 7 (hafta sonu) ay sayfalarına ve metodolojinin
  `#hafta-sonu-tatil` bölümüne linkler. Tarih konvansiyonu anlatımı D-012 ile birebir tutarlıdır.
- **Kabul:** `STATIC_ROUTES` `sitemap: 'guides'`, `FEATURES.guides = true`, seo:validate temiz.

### D-6 Güven ve yasal sayfalar (SPEC §6.11) ✅ TAMAMLANDI (Faz B)
- `/hakkimizda/`, `/iletisim/`, `/gizlilik/` (KVKK), `/cerez-politikasi/`, `/kullanim-kosullari/`, `/reklam-politikasi/`.
- Yayıncı ve e-posta **yalnızca** `SITE.publisherName` / `SITE.contactEmail`'den gelir. Boşsa alan hiç basılmaz (yer tutucu yok).
  İletişim formu yok (sunucu yok); e-posta linki.
- Gizlilik/çerez metni sitenin gerçekte yaptığını anlatır: bugün çerez yok, analitik kapalı, localStorage yalnızca tercih için
  (D-8). Reklam açılınca güncellenecek bölümler işaretlenir.
- **Kabul:** `FEATURES.legalPages = true`, footer linkleri görünür, `links:check` temiz. `organization()` şeması publisher doluysa basılır.

### D-7 Reklam altyapısı: AdSlot, CMP/Consent Mode v2, ads.txt (SPEC §10) ✅ TAMAMLANDI (Faz C; ayrıntı ve doğrulanamayanlar: DECISIONS D-018)
- `AdSlot` bileşeni: `PUBLIC_ADSENSE_ENABLED !== 'true'` ise **hiçbir şey basmaz** (boş kutu, yer tutucu, script yok).
  Açıkken sabit yükseklikli rezerv alan (CLS < 0,05). Gün, ay, yıl ve hub sayfalarında SPEC'teki yerlere; 404'te yok.
- CMP ve Consent Mode v2: varsayılan `denied`. Yalnızca reklam açıkken yüklenir.
- `ads.txt`: sahte publisher ID yok. Env boşken dosya üretilmez (ya da endpoint 404 döner). README'de kurulum.
- CSP'nin reklam açıkken genişletilmesi: alan adlarını aktivasyon anında Google'ın güncel dokümanından doğrulayın ve
  `_headers`'a yazın. Bilinen başlangıç listesi: `pagead2.googlesyndication.com`, `*.googlesyndication.com`,
  `*.doubleclick.net`, `www.google.com`, `*.adtrafficquality.google`, `fundingchoicesmessages.google.com`. Liste DECISIONS'a kaydedilir.
- **Kabul:** env kapalıyken build çıktısı bugünküyle bayt bayt aynı HTML iskeletine sahip (reklam izi yok). Açıkken Lighthouse CLS < 0,05.

### D-8 Paylaş, yazdırma CSS'i, localStorage (SPEC §9) ✅ TAMAMLANDI (Faz C)
- Paylaş: `navigator.share` varsa, yoksa "linki kopyala". Canonical URL paylaşılır (`?istenen=` değil).
- Yazdırma CSS'i: header/nav/reklam gizli, tablolar tam genişlik, kaynak kutusu görünür, URL basılı.
- localStorage yalnızca kullanıcı tercihi için (ör. son seçilen para birimi / kur türü). try/catch ile sarılır, veri önbelleği tutulmaz.
- **Kabul:** yazdırma önizlemesi `/tarih/2020-01-15/` tek sayfaya sığar. localStorage kapalı tarayıcıda hata yok.

### D-9 E2E, erişilebilirlik ve performans turu (SPEC §11.4, §11.5, §9) ✅ TAMAMLANDI (Faz D)
- `scripts/qa/smoke.ts`'i genişletin (Playwright): araçlar, mini hesaplayıcı, rehber, yasal sayfalar, klavye ile tarih bulucu.
  Mevcut senaryoları silmeyin. CI'ye `qa:smoke` işi eklenebilir (Chromium kurulumu gerekir).
- `qa:layout` sayfa listesine yeni sayfa türlerini ekleyin.
- Lighthouse: tüm sayfa türleri mobil LCP < 2,0 sn, CLS < 0,05; erişilebilirlik 100. Sonuçlar DECISIONS'a.

### D-10 README'yi tamamlama ve lansman kontrol listesi (SPEC §12, §13) ✅ TAMAMLANDI (Faz D)
- README'deki "Sonnet tamamlayacak" başlıklarını doldurun: AdSense/CMP/ads.txt aktivasyonu, rehber ekleme, sorun giderme ayrıntıları.
- `docs/LAUNCH-CHECKLIST.md`: §G owner görevleri + teknik son kontroller (production build, sitemap gönderimi, `_headers`
  canlıda doğrulama, www→apex, 404 davranışı, robots, ilk kademeli indeksleme adımı).

---

## E. Güncelleme zamanlaması

Günlük akış: TCMB kuru 15.30 TSİ'de belirler, kur ≈16.00 TSİ'de EVDS'ye düşer (D-013). `data-update.yml` hafta içi 16.40 TSİ'de
çalışır; 19.40 TSİ yedek ve ertesi sabah 07.15 TSİ telafi çalışması vardır. Yeni veri varsa `data/`
commit'lenir; bu commit Cloudflare Pages build'ini tetikler. Zamanlanmış iş akışları yalnızca **varsayılan dalda** (main) çalışır.

---

## F. Riskler ve açık sorular

1. **EVDS yayın saati:** D-013 tek günlük ölçüme dayanır (≈16.00 TSİ). Yedek (19.40) ve ertesi sabah telafi (07.15) çalışmaları gecikmelere karşı güvencedir.
   Son belirlenme günü 4 günden eskiyse `data:validate` uyarır, 16 günden eskiyse başarısız olur (Actions kırmızı).
2. **EVDS kullanım şartları (D-007):** EVDS'nin kendi şartları ticari kullanıma izin veriyor, TCMB genel site şartları ise daha
   kısıtlayıcı bir dil taşıyor. Owner riski kabul etti. `docs/data-usage/` 6 ayda bir ve iş modeli değişmeden önce yeniden kontrol edilir.
3. **Veri revizyonu:** geçmiş bir değer EVDS'de değişirse `data/metadata/revisions.json`'a yazılır, sayfanın `lastmod`'u değişir.
   Otomatik silme yok. Büyük revizyon dalgası (ör. seri kodu değişikliği) crosscheck uyuşmazlığıyla Actions'ı düşürür → Opus/owner incelemesi.
4. **20.000 dosya limiti:** bugün 9.179 dosya (%46). Her yıl ≈250 gün sayfası eklenir. Sonnet'in sayfaları birkaç düzine dosyadır.
   Yeni para birimi eklemek (SPEC §13) ay/yıl sayfalarını ≈900 artırır. Build guard'a limit kontrolü eklemek Opus işidir, gerekirse.
5. **Kaynaktaki tek tutarsızlık:** 1991-10-11 GBP efektif alış > satış (D-014). Gün sayfası kapsamı dışında, düzeltilmedi.
6. **Lighthouse yerel ölçümdür;** gerçek alan verisi (CrUX / Search Console CWV) lansmandan sonra izlenmelidir.
7. **Açık soru (owner):** analitik (SPEC §10) varsayılan kapalı. Cloudflare Web Analytics (çerezsiz) önerilir; karar owner'ın.

---

## G. Owner görevleri

1. **`src/config/site.ts`:** `publisherName` ve `contactEmail` doldurun. Production build boşken **başarısız olur**.
2. **Branch'i main'e birleştirin.** Zamanlanmış veri güncellemesi yalnızca varsayılan dalda çalışır. Ardından eski
   `daily-data-fetch.yml`'in main'de kalmadığını doğrulayın (D-008).
3. **GitHub Secrets:** `EVDS_API_KEY` (mevcut). Anahtar sohbette paylaşıldığı için EVDS profilinden yenilemek iyi olur. Yeniledikten
   sonra yalnızca GitHub Secret'ı güncelleyin.
4. **Cloudflare Pages:** repo bağlantısı, production branch `main`, build komutu `npm run build`, çıktı dizini `dist`,
   ortam değişkeni `NODE_VERSION=22`. "Branch deployment controls" ile preview build'leri kapatın ya da sınırlayın (D-001: 500 build/ay).
   Özel alan adı `dovizarsiv.net`, `www` → apex 301 (Bulk Redirects ya da Redirect Rule).
5. **Search Console:** DNS doğrulaması, `https://dovizarsiv.net/sitemap-index.xml` gönderimi, ardından `docs/indexing-rollout.md` takvimi.
6. **Veri kullanım şartları** kontrolü: 6 ayda bir (`docs/data-usage/README.md`).
7. **Rehber yazıları** (Sonnet D-5) yayından önce bir insan tarafından okunmalı.
8. **AdSense** (SPEC §13): başvuru ve gerçek publisher ID → env değişkenleri → ads.txt → CMP. Yalnızca lansman ve trafikten sonra.
