# DECISIONS — doğrulanmış bulgular ve kararlar

Bu dosya SPEC'i değiştirmez; Faz 0 ve sonrasında **resmi kaynaktan doğrulanan** bilgileri ve alınan kararları kaydeder.
Her kaydın yanında kaynak ve doğrulama tarihi bulunur. "DOĞRULANMADI" etiketli satırlar henüz kullanılamaz.

> **Doğrulama yöntemi notu (2026-09-28):** Geliştirme ortamının (Claude Code bulut konteyneri) ağ politikası
> `*.tcmb.gov.tr` ve `developers.cloudflare.com` alan adlarına erişimi engelliyor. Bu yüzden resmi sayfalar
> repodaki `.github/workflows/phase0-probe.yml` iş akışıyla GitHub Actions üzerinden çekildi, çıktılar iş loglarından okundu.
> Betik: `scripts/discovery/phase0-probe.mjs` (üretim kodu değildir, Faz 1'de silinecek).

---

## D-001 Hosting: Cloudflare Pages ücretsiz plan — DOĞRULANDI

Kaynaklar (2026-09-28'de çekildi):
- https://developers.cloudflare.com/pages/platform/limits/ ("Last updated Sep 5, 2026")
- https://developers.cloudflare.com/pages/functions/pricing/ ("Last updated Sep 8, 2026")

| Ölçüt | Cloudflare Pages Free | Netlify Free | GitHub Pages |
|---|---|---|---|
| Build | 500 build/ay, aynı anda 1, 20 dk zaman aşımı | Kredi havuzu: 300 kredi/ay; **her production deploy 15 kredi** → en fazla 20 deploy/ay (başka tüketim yokken) | Actions ile sınırsız; klasik build'de 10/saat yumuşak limit; deploy 10 dk zaman aşımı |
| Dosya sayısı | **20.000 dosya/site** | — (belirtilmemiş) | Site boyutu ≤ 1 GB |
| Tek dosya boyutu | 25 MiB | — | — |
| Bant genişliği / istek | **Statik istekler ücretsiz ve sınırsız** (Functions çağırmayan her istek) | 20 kredi/GB bant genişliği + 2 kredi/10k istek, aynı 300 kredilik havuzdan | 100 GB/ay yumuşak limit, 429 hız sınırı olabilir |
| `_headers` | 100 kural, başlık başı 2.000 karakter | var | **yok** |
| `_redirects` | 2.000 statik + 100 dinamik | var | **yok** |
| Özel alan adı | 100/proje | var | 1 |
| Ticari kullanım | izinli | izinli | "Ücretsiz web hosting olarak online iş ... için kullanılamaz" ifadesi var; reklamlı site gri alan |

Kaynaklar (Netlify/GitHub, 2026-09-28): https://www.netlify.com/pricing/ ,
https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

**Sonuç:** Cloudflare Pages Free uygun. Günlük (iş günü) veri commit'i ≈ 22 build/ay; geliştirme build'leriyle birlikte 500'ün
çok altında. Netlify Free, iş günü başına bir deploy ile ayda ~330 kredi harcar ve 300'lük havuzu **yalnızca deploy'la** aşar
(SPEC §3.1 gerekçesi rakamla doğrulandı). GitHub Pages `_headers`/`_redirects` desteklemediği için SPEC §8 ile uyumsuz.

**Dikkat:** Preview (branch) build'leri de 500/ay kotasından düşer. Pages projesinde "Branch deployment controls" ile
yalnızca `main` için build açılmalı ya da build watch paths ayarlanmalı (owner işi, README'ye yazılacak).

## D-002 Sayfa sayısı ve 20.000 dosya limiti — TAHMİN (EVDS kapsamı doğrulanınca kesinleşecek)

Varsayım: ~248 TCMB iş günü/yıl, 3 para birimi, `build.format: 'directory'` (sayfa başına 1 `index.html`).

| Sayfa türü | Formül | Senaryo A: 1996-04-16 → 2026-09 | Senaryo B: 2005-01 → 2026-09 |
|---|---|---|---|
| Gün `/tarih/YYYY-MM-DD/` | iş günü sayısı (para birimleri tek sayfada) | ~7.570 | ~5.440 |
| Ay `/dolar/YYYY/MM/` | 3 × ay sayısı | ~1.100 | ~783 |
| Yıl `/dolar/YYYY/` | 3 × yıl sayısı | 93 | 66 |
| Tarih arşivi yıl alt sayfaları | yıl sayısı + 1 | 32 | 23 |
| Hub, ana sayfa, araç, rehber (10), güven/yasal, 404 | sabit | ~30 | ~30 |
| Sitemap dosyaları | index + tür + yıl başına dates | ~40 | ~30 |
| Araç JSON parçaları (yıl başına 1, tüm para birimleri) | yıl sayısı | 31 | 22 |
| CSV (para birimi başına) | 3 | 3 | 3 |
| CSS/JS/ikon/OG/manifest/robots/_headers/_redirects | sabit | ~30 | ~30 |
| **Toplam** | | **~8.930 (%45)** | **~6.430 (%32)** |

Yıllık büyüme ≈ 248 gün + 36 ay + 3 yıl + ~3 dosya ≈ **290 dosya/yıl** → Senaryo A'da limite ~38 yıl var.

**Risk:** EVDS günlük döviz serileri 1996'dan çok daha eskiye gidiyorsa (ör. 1950'ler), gün sayfası sayısı 20.000'i
aşabilir. Bu durumda seçenekler: (a) belirli bir yıldan eski günler için gün sayfası üretmeyip ay tablosunda göstermek,
(b) Workers Static Assets'e geçmek. EVDS kapsamı doğrulanınca yeniden hesaplanacak.

## D-003 EVDS erişim yöntemi — DOĞRULANDI (resmi kılavuz + sunucu yanıtı)

Resmi kaynak: **"EVDS Web Servis Kılavuzu"**, EVDS3 docId=8, PDF tarihi 2026-02-26
(`https://evds3.tcmb.gov.tr/igmevdsms-dis/documents/showDocument?docId=8`, 2026-09-28'de çekildi).

- **EVDS2 kapatıldı.** EVDS3 arayüzündeki duyuru: "20 Şubat 2026 tarihinde EVDS2 sonlandırılacaktır. Bu tarihten sonra
  veri dağıtım hizmeti, EVDS3 üzerinden sunulacaktır." `evds2.tcmb.gov.tr` adresleri `evds3.tcmb.gov.tr`'ye yönleniyor.
  İnternetteki `evds2.../service/evds/` örnekleri **geçersiz**.
- **Kök adres:** `https://evds3.tcmb.gov.tr/igmevdsms-dis/`
- **Anahtar:** HTTP request header'ında, adı `key`. Kılavuz: "Key değerini iletmeyenler veya yanlış gönderenler 403 Forbidden
  hatası alacaktır." Sunucu kanıtı (2026-09-28, anahtarsız): `403 {"status":"403","message":"Required request header 'key' is not present"}`.
  Anahtar EVDS3 → Benim Sayfam → Profilim → "API Key Kopyala" ile alınır (kayıtlı kullanıcı gerekir).
- **Veri servisi:** `series=KOD1-KOD2&startDate=gg-aa-yyyy&endDate=gg-aa-yyyy&type=json|xml|csv`
  (+ isteğe bağlı `aggregationTypes`, `formulas`, `frequency`, `decimalSeperator`). Tarih biçimi **gg-aa-yyyy**.
- **İstek başına en fazla 1000 gözlem.** Daha geniş aralıkta "Bitiş Tarihi'nden geriye doğru 1000 gözlem" döner (sessiz kırpma!).
  → `data:update` tam geçmişi ≤ 1000 gözlemlik parçalarla (günlük seride ~3 yıl/parça) çekecek ve her parçanın
  ilk/son tarihini doğrulayacak.
- **Metadata servisleri:** `categories/type=json`; `datagroups/mode=0|1&code=…&type=json`
  (alanlar: Datagroup_Code, Start_Date, End_Date, Frequency_Str, Rev_Pol_Link…);
  `serieList/type=json&code=<veri grubu veya seri kodu>` (alanlar: Serie_Code, Serie_Name, Frequency_Str,
  Default_Agg_Method, Start_Date, End_Date, Rev_Pol_Link…). `data:discover` bunları kullanacak.
- **Sıklık/rate limit:** Kılavuzda sayısal limit **yok**. Kılavuz: "EVDS'de yer alan veriler en sık olarak günlük frekansta
  güncellenmektedir. Dolayısıyla Web servis yöntemi ile veri alımında günde bir kez veri çekilir. Ayrıca … aynı veri
  grubuna ait serileri birlikte kodlayarak tek çağrı ile veri çekilmesi de yararlı olacaktır."
  → Karar: günde bir çalıştırma, eşzamanlılık 1, istekler arası ≥ 1 sn, seriler tek çağrıda birleştirilir, 5xx/ağ
  hatalarında üstel geri çekilme (2/4/8/16 sn), 4xx'te durma.
- Kılavuzdaki `aggregationTypes`/`formulas` ile EVDS'nin hesapladığı ortalama/yüzde değerleri **kullanılmayacak**; tüm
  türetilmiş istatistikler kendi kodumuzla ham günlük gözlemlerden hesaplanacak (SPEC §5 "Döviz Arşiv hesaplaması").

**Engel:** GitHub Secrets'ta `EVDS_API_KEY` tanımlı değil (Actions logu: `EVDS key present: no`), yerel ortamda da yok.
Anahtarla yapılacak keşif hazır: `phase0-probe.yml` iş akışı `evds-discover` modunda categories → datagroups →
serieList zincirini çalıştırır ve örnek gözlemleri basar (anahtar yalnızca header'da, log'a yazılmaz).

## D-004 EVDS seri kodları — DOĞRULANMADI (aday kodlar kılavuzda görülüyor)

Resmi kılavuzdaki örnek çağrılarda şu kodlar geçiyor: `TP.DK.USD.A`, `TP.DK.EUR.A`, `TP.DK.GBP.A`, `TP.DK.JPY.A`
ve ayrıca **`.YTL` sonekli** `TP.DK.USD.A.YTL`, `TP.DK.USD.S.YTL`, `TP.DK.EUR.A.YTL`. Aynı para birimi için iki ayrı kod ailesi
bulunması, 2005 para reformuyla ilgili ayrı seriler (eski TL / YTL) olabileceğine işaret ediyor. Bu bir **hipotezdir**;
SPEC §4.1 ve §4.7 gereği metadata (Serie_Name, birim, Start_Date, End_Date) okunmadan hiçbir kod kullanılmayacak ve
iki aile metodoloji/birim kontrolü yapılmadan birleştirilmeyecek.

| Para birimi | Alan | Seri kodu | Etiket | Birim | Frekans | İlk gözlem | Son gözlem |
|---|---|---|---|---|---|---|---|
| USD | Döviz Alış | ? | ? | ? | ? | ? | ? |
| USD | Döviz Satış | ? | ? | ? | ? | ? | ? |
| USD | Efektif Alış | ? | ? | ? | ? | ? | ? |
| USD | Efektif Satış | ? | ? | ? | ? | ? | ? |
| EUR | (aynı 4 alan) | ? | | | | | |
| GBP | (aynı 4 alan) | ? | | | | | |

Anahtar tanımlanınca bu tablo `evds-discover` çıktısından doldurulacak; Faz 1'de `npm run data:discover` aynı kontrolü
her çalıştırmada yapıp config ile metadata uyuşmazsa hata verecek.

## D-005 2005 para reformu — TCMB kaynağında DOĞRULANDI, EVDS tarafı DOĞRULANMADI

TCMB'nin resmi günlük kur XML arşivinden (`https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml`, anahtarsız):

| Bülten | Tarih | USD Döviz Alış | USD Döviz Satış | EUR Döviz Alış | GBP Döviz Alış |
|---|---|---|---|---|---|
| 2004/249 | 29.12.2004 | 1352500 | 1359000 | 1842700 | 2603000 |
| 2004/250 | 30.12.2004 | 1342100 | 1348600 | 1826800 | 2576500 |
| 2004/251 | 31.12.2004 | 1336300 | 1342700 | 1823300 | 2579300 |
| 2005/1 | 03.01.2005 | 1.3383 | 1.3448 | 1.8105 | 2.5561 |
| 2005/2 | 04.01.2005 | 1.3427 | 1.3492 | 1.7976 | 2.5453 |

- TCMB'nin yayımladığı 2005 öncesi değerler **eski TL** cinsinden (ör. 1 USD = 1.336.300 TL). 2005-01-03'ten itibaren YTL.
- 1.000.000'a bölünmüş seri süreklidir: 31.12.2004 USD alış 1,3363 → 03.01.2005 1,3383 (%0,15).
- EVDS serilerinin 2005 öncesini eski TL mi yoksa yeniden ölçeklenmiş olarak mı verdiği **EVDS'den ayrıca doğrulanmalı**.

## D-006 Tarih konvansiyonu — KISMEN DOĞRULANDI

- TCMB resmi sayfası: "Gösterge Kurlar; Türkiye Cumhuriyet Merkez Bankası tarafından her iş günü, saat 15.30'da belirlenir."
  Belirleme 10.00–15.00 arasındaki 6 saatlik ortalamaya dayanır.
  (https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/temel+faaliyetler/doviz+efektif/doviz+ve+efektif+piyasalari/gosterge+niteligindeki+kurlar)
- XML dosyasının `Tarih` özniteliği belirlendiği günü ve bülten numarasını taşır (ör. `Tarih="15.01.2020" Bulten_No="2020/10"`,
  USD alış 5.8827 / satış 5.8933).
- **Açık soru:** EVDS'de 2020-01-15 tarihli gözlem, 15.01.2020 bülteni (5.8827) mi, yoksa 14.01.2020 bülteni (5.8811) mi?
  Anahtarla karşılaştırma yapılınca yanıtlanacak. Karşılaştırma için örnek değerler hazır (13–16 Ocak 2020, 29.03.2024, 01.04.2024).
- TCMB XML arşivinin ilk dosyası: **1996-04-16** (1996-01-02 → 404). EVDS kapsamı bundan farklı olabilir.

## D-007 Kullanım şartları — EVDS şartları SPEC §4.2'yi DOĞRULUYOR; genel TCMB şartlarıyla gerilim risk olarak kayıtlı

Metin kopyaları: `docs/data-usage/` (2026-09-28).

- **EVDS Kullanım Şartları** (EVDS3 docId=18, PDF 2026-01-28), §2: "EVDS uygulamasında sunulan veriler kaynak gösterilmek
  koşuluyla üçüncü kişiler tarafından kullanılabilir ve yayımlanabilir." ve "EVDS uygulamasında sunulan veriler başka bir
  üründe veya yayında ticari amaçla dahi kullanıldığında, bu durum ürünün kullanıcılarına ve abonelerine herhangi bir ek
  ücret olarak yansıtılmaz." → SPEC §4.2'nin öncülü **doğrulandı**.
  Ek zorunluluklar: çeviride "resmî TCMB çevirisi değildir" notu; "yatırım tavsiyesi içermemektedir".
- **Gerilim:** EVDS şartları, TCMB genel internet sitesi şartlarına "ek olarak" kabul edilir. Genel şartlar:
  "Sitede yer alan bilgiler, kaynak gösterilmek suretiyle yayımlanabilir; ancak bu bilgilerin ticari amaçlarla kullanımı
  TCMB'nin yazılı iznine tabidir." EVDS'ye özgü hüküm ticari kullanımı açıkça öngördüğü için EVDS verisi bakımından
  özel hüküm olarak okunuyor. SPEC'teki "izin kapısı yok" kararı değişmiyor; bu satır yalnızca bilinen risk olarak kayıtlı.
- **Sonuç kararı:** Üretim verisi yalnızca EVDS'den gelir. `tcmb.gov.tr/kurlar` XML'leri (genel site şartlarına tabi) üretimde
  kullanılmaz; Faz 0'da yalnızca karşılaştırma için okundu.

## D-008 Mevcut repo envanteri

| Öğe | Karar | Gerekçe |
|---|---|---|
| `src/pages/kripto/`, `src/data/crypto/`, `scripts/fetch-fawaz-api.py` | **Sil** | Kripto kapsam dışı (SPEC §1, §4.8); fawaz API TCMB dışı kaynak |
| `src/pages/altin/`, `src/data/gold/` | **Sil** | Altın ilk sürümde yok |
| `src/data/tcmb/*` (21 para birimi, yalnızca 2026'nın 64 günü) | **Sil** | Kaynak XML, `float` + `round(…,6)` ile hassasiyet kaybı riski, EVDS'den yeniden çekilecek |
| `scripts/fetch-tcmb.py`, `scripts/backfill-history.py` | **Sil** | Python; tek kaynak EVDS; hata güvenliği/revizyon yok |
| `.github/workflows/daily-data-fetch.yml` | **Sil/yeniden yaz** | `main` üzerinde son 43 zamanlanmış çalışmanın tamamı başarısız; doğrudan `main`'e push ediyor |
| `src/components/calculators/TimeMachine.tsx`, `src/lib/calculations.ts` | **Sil** | "Zaman makinesi", CAGR, kâr/zarar, enflasyon düzeltmesi: yatırım getirisi dili (SPEC §6.9 "kur değişimi" dili) |
| `src/components/charts/PriceChart.tsx` (Recharts) | **Sil** | Grafikler build-time SVG olacak (SPEC §1.1-3) |
| `src/lib/currencies.ts` | **Sil** | Kripto/altın/emoji bayrak içeriyor; yerini `src/config/evds-series.ts` + para birimi config'i alacak |
| `src/lib/formatters.ts` | **Yeniden yaz** | `new Date('YYYY-MM-DD')` UTC/yerel saat kaymasına açık; `%` biçimi tr-TR değil |
| `src/styles/global.css`, Tailwind, Inter/JetBrains Google Fonts | **Sil** | Koyu "trading" teması; SPEC §9 vanilla CSS + sistem fontu |
| `src/layouts/Base.astro`, `Header.astro`, `Footer.astro`, `ui/*` | **Sil** | Yeni tasarım sistemiyle yeniden yazılacak |
| `package.json` bağımlılıkları: react, react-dom, @astrojs/react, recharts, tailwindcss, @tailwindcss/vite, date-fns | **Kaldır** | SPEC §2 stack |
| `astro` (^6.1.3), `typescript`, `@astrojs/check`, `tsconfig.json` (strict) | **Koru** | Astro sürümü Faz 2'de npm'den güncel kararlı sürüme göre doğrulanacak |
| `public/favicon.svg`, `favicon.ico` | **Sil** | Yeni tipografik logo |
| `public/robots.txt` | **Yeniden yaz** | Sitemap index yolu SPEC §8'e göre |
| `.gitignore` | **Koru + genişlet** | `.env*` zaten var |
| `README.md` | **Yeniden yaz** | Astro başlangıç şablonu |
| `.vscode/` | Koru | Zararsız |

## D-009 Önerilen klasör yapısı (owner onayı bekliyor)

SPEC §12 ile uyumlu; ek olarak her klasörün sorumluluğu belirtildi.

```
.
├── astro.config.mjs            # output:'static', trailingSlash:'always', build.format:'directory'
├── package.json                # scripts: data:*, build, test, seo:validate, links:check
├── .env.example                # SPEC §12 (sırlar asla commit edilmez)
├── .github/workflows/
│   ├── data-update.yml         # iş günleri: data:update → data:validate → test → (değiştiyse) commit
│   └── ci.yml                  # PR/push: test + build + seo:validate + links:check
├── data/                       # build'in okuduğu TEK veri kaynağı (EVDS'ye build sırasında istek yok)
│   ├── normalized/YYYY.json    # yıllık gözlemler; geçmiş yıllar sabit
│   ├── aggregate/              # monthly/YYYY.json, yearly.json (data:stats üretir)
│   └── metadata/               # coverage.json, series.json, revisions.json, anomalies.json
├── scripts/
│   ├── data/                   # discover.ts, update.ts, validate.ts, stats.ts (tsx ile çalışır)
│   ├── seo/                    # validate.ts (dist/ üzerinde), links-check.ts
│   └── validation/             # build-guard.ts: API anahtarı taraması, site.ts boşluk, mock veri, ücretli özellik bayrağı
├── src/
│   ├── config/
│   │   ├── site.ts             # yayıncı adı, iletişim e-postası, domain (boşsa production build başarısız)
│   │   ├── evds-series.ts      # seri kaydı (registry): tek yer; kodlar data:discover ile doğrulanır
│   │   └── currencies.ts       # usd/eur/gbp → slug (dolar/euro/sterlin), Türkçe adlar
│   ├── lib/
│   │   ├── providers/          # provider.ts (arayüz), evds.ts, types.ts — EVDS URL'leri yalnızca burada
│   │   ├── data/               # yerel JSON okuma, gözlem indeksleri, önceki/sonraki gözlem
│   │   ├── calculations/       # decimal aritmetik, ortalama/min/max, yüzde değişim, dönüşüm
│   │   ├── formatting/         # tr-TR sayı/tarih biçimleyicileri (UTC-güvenli, string tarih)
│   │   ├── text/               # programatik metin motoru (veriye göre dallanan cümleler)
│   │   └── seo/                # meta, canonical, isIndexablePage, schema.org yardımcıları, sitemap
│   ├── components/             # SiteHeader, SiteFooter, Breadcrumbs, SourceDisclosure, ExchangeRateTable,
│   │                           # RateStatGrid, HistoricalChart (SVG), DateFinder (island), RelatedDates, ArchiveNavigator
│   ├── layouts/                # BaseLayout (SEO merkezi), DataPageLayout
│   ├── pages/                  # index, [currency]/ (hub, [year]/, [year]/[month]/), tarih/[date]/, tarih-arsivi/,
│   │                           # metodoloji/, veri-kaynaklari/, 404, sitemap-*.xml.ts, robots.txt.ts
│   ├── styles/                 # tokens.css, base.css, components.css, print.css
│   └── content/                # rehber yazıları (Sonnet, Faz sonrası)
├── public/                     # _headers, _redirects, favicon.svg, apple-touch-icon.png, site.webmanifest, og/*.png
├── tests/                      # vitest birim testleri + fixtures/ (küçük mock EVDS yanıtları, yalnızca test)
└── docs/                       # SPEC.md, DECISIONS.md, HANDOFF.md, seo-intent-map.md, indexing-rollout.md, data-usage/
```

Teknik tercihler (öneri):
- Veri script'leri TypeScript, `tsx` ile; test çatısı `vitest` (Astro/Vite ile aynı ekosistem, ek runtime yok).
- Decimal: değerler kaynakta string olarak saklanır; hesaplamalar ölçeklenmiş `BigInt` tabanlı küçük bir yardımcıyla
  (harici bağımlılık gerekmez). Ortalama gibi bölme içeren işlemlerde hassasiyet kuralı `/metodoloji/`de belgelenir.
- Tarihler her yerde `YYYY-MM-DD` string; `Date` nesnesi yalnızca UTC ile ve gün adı hesaplamak için.

## D-010 Güncelleme zamanlaması (SPEC §3.3) — KISMEN DOĞRULANDI

- Gösterge kurlar her iş günü **15.30 (TSİ, UTC+3)** = **12.30 UTC**'de belirlenir (TCMB resmi sayfası, D-006).
- EVDS'ye yansıma saati resmi kaynakta bulunamadı. **DOĞRULANMADI.**
- Öneri: iş günleri **13.40 UTC** (16.40 TSİ) ana çalışma + **16.20 UTC** yedek çalışma (ilk çalışmada yeni gün yoksa).
  Anahtar geldikten sonra birkaç gün gözlemle kesinleşecek. Cloudflare 500 build/ay limitiyle çakışmaz (yalnızca veri
  değiştiyse commit → ~22 build/ay).
- Mevcut `.github/workflows/daily-data-fetch.yml` (`main`) son 43 çalışmasının tamamında başarısız; Faz 1'de silinip
  yerine `data-update.yml` gelecek.

## Açık sorular (owner)

1. **`EVDS_API_KEY`**: GitHub → Settings → Secrets and variables → Actions → `EVDS_API_KEY` olarak eklenmesi.
   Olmadan D-004, D-005 (EVDS tarafı), D-006 (EVDS tarafı) ve kapsam (D-002) doğrulanamaz; Faz 1 başlayamaz.
2. EVDS genel/özel şart gerilimi (D-007) bilgi olarak kabul ediliyor mu? (SPEC kararı değişmiyor; yalnızca teyit.)
3. EVDS kapsamı 1996'dan çok eskiye giderse (D-002 riski) gün sayfaları için alt sınır yılı.
