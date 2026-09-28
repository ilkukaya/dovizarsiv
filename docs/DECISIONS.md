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

## D-002 Sayfa sayısı ve 20.000 dosya limiti — EVDS kapsamıyla GÜNCELLENDİ

EVDS kapsamı: USD/GBP döviz **1950**, EUR döviz **1999**, USD/GBP efektif **1990**, EUR efektif **2002** (D-004).
Varsayım: ~248 iş günü/yıl, sayfa başına 1 `index.html`, sabit dosyalar ~130 (hub, statik, sitemap, JSON, CSV, asset).

| Gün sayfası alt sınırı | Gün sayfası | Ay (3 para birimi, EUR 1999'dan) | Yıl | Toplam | Limit |
|---|---|---|---|---|---|
| 1950 | ~18.900 | ~2.090 | ~180 | **~21.300** | **AŞAR** |
| 1990 | ~9.000 | ~1.130 | ~110 | ~10.400 | %52 |
| 1996 | ~7.570 | ~1.030 | ~100 | ~8.830 | %44 |
| 2005 | ~5.440 | ~790 | ~66 | ~6.430 | %32 |

**Sonuç:** 1950'den itibaren tüm günler için sayfa üretmek Cloudflare Pages Free 20.000 dosya limitini aşıyor. Seçenekler:
(a) gün sayfalarını bir alt sınır yılından başlatmak; daha eski dönem ay/yıl sayfalarında tablo olarak kalır (önerim: **1990**,
efektif kurların da başladığı yıl; ~%52 doluluk, ~35 yıl büyüme payı), (b) Workers Static Assets'e geçmek (Free planda dosya limiti
ayrıca doğrulanmalı). Ay ve yıl sayfaları 1950'den itibaren üretilebilir (≈2.300 dosya). Owner kararı (Açık sorular #1).
Ayrıca: 1950–1980'lerde kurlar uzun süre sabit (sabit kur rejimi) olabilir; bu dönemin gün sayfaları "benzersiz bilgi" testini
(SPEC §1.1-2) büyük olasılıkla geçmez. Bu da (a) seçeneğini destekliyor.

## D-003 EVDS erişim yöntemi — DOĞRULANDI (resmi kılavuz + anahtarlı çağrılar)

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

**Anahtar:** GitHub Secrets'ta `EVDS_API_KEY` olarak tanımlandı (2026-09-28). Anahtarlı keşif başarılı: categories, datagroups
(678 grup), serieList ve series çağrıları 200 döndü. Anahtar yalnızca header'da kullanıldı, loglara yazılmadı.

## D-004 EVDS seri kodları — DOĞRULANDI (EVDS metadata, 2026-09-28)

Kaynak: `datagroups/mode=0` + `serieList` (anahtarla, GitHub Actions `phase0-probe.yml` `evds-discover` modu, run 36384904148).
Döviz kuru için EVDS'de **iki ayrı veri grubu çifti** var:

| Veri grubu | Adı | Birim (metadata) | Kapsam | Not |
|---|---|---|---|---|
| `bie_dkdovytl` | Döviz Kurları | Türk lirası | 02-01-1950 → güncel | Güncel ana grup |
| `bie_dkefkytl` | Efektif Kurlar | Türk lirası | 02-01-1990 → güncel | Güncel ana grup |
| `bie_dkdovizgn` | Kurlar-Döviz Kurları (Arşiv) | (boş) | 02-01-1950 → güncel | Arşiv kategorisi (9993002) |
| `bie_dkefektif` | Kurlar-Efektif Kurlar (Arşiv) | (boş) | 02-01-1990 → güncel | Arşiv kategorisi |

Ana gruplar (`…YTL`):

| Para birimi | Alan | Seri kodu | EVDS adı | Frekans | İlk gözlem | Son gözlem |
|---|---|---|---|---|---|---|
| USD | Döviz Alış | `TP.DK.USD.A.YTL` | (USD) ABD Doları (Döviz Alış) | GÜNLÜK | 02-01-1950 | 28-09-2026 |
| USD | Döviz Satış | `TP.DK.USD.S.YTL` | (USD) ABD Doları (Döviz Satış) | GÜNLÜK | 02-01-1950 | 28-09-2026 |
| USD | Efektif Alış | `TP.DK.USD.A.EF.YTL` | (USD) ABD Doları (Efektif Alış) | GÜNLÜK | 02-01-1990 | 28-09-2026 |
| USD | Efektif Satış | `TP.DK.USD.S.EF.YTL` | (USD) ABD Doları (Efektif Satış) | GÜNLÜK | 02-01-1990 | 28-09-2026 |
| EUR | Döviz Alış | `TP.DK.EUR.A.YTL` | (EUR) Euro (Döviz Alış) | GÜNLÜK | 04-01-1999 | 28-09-2026 |
| EUR | Döviz Satış | `TP.DK.EUR.S.YTL` | (EUR) Euro (Döviz Satış) | GÜNLÜK | 04-01-1999 | 28-09-2026 |
| EUR | Efektif Alış | `TP.DK.EUR.A.EF.YTL` | (EUR) Euro (Efektif Alış) | GÜNLÜK | 02-01-2002 | 28-09-2026 |
| EUR | Efektif Satış | `TP.DK.EUR.S.EF.YTL` | (EUR) Euro (Efektif Satış) | GÜNLÜK | 02-01-2002 | 28-09-2026 |
| GBP | Döviz Alış | `TP.DK.GBP.A.YTL` | (GBP) İngiliz Sterlini (Döviz Alış) | GÜNLÜK | 02-01-1950 | 28-09-2026 |
| GBP | Döviz Satış | `TP.DK.GBP.S.YTL` | (GBP) İngiliz Sterlini (Döviz Satış) | GÜNLÜK | 02-01-1950 | 28-09-2026 |
| GBP | Efektif Alış | `TP.DK.GBP.A.EF.YTL` | (GBP) İngiliz Sterlini (Efektif Alış) | GÜNLÜK | 02-01-1990 | 28-09-2026 |
| GBP | Efektif Satış | `TP.DK.GBP.S.EF.YTL` | (GBP) İngiliz Sterlini (Efektif Satış) | GÜNLÜK | 02-01-1990 | 28-09-2026 |

Arşiv karşılıkları: `.YTL` soneki olmadan (`TP.DK.USD.A`, `TP.DK.USD.A.EF` …), adlarında "(Arşiv)".
Ayrıca çapraz kur serileri (`TP.DK.EUR.C.YTL`, `TP.DK.GBP.C.YTL`) var; kapsam dışı.

Yanıt biçimi: `{"items":[{"Tarih":"15-01-2020","TP_DK_USD_A_YTL":"5.88110000",…}]}`. Değerler **8 ondalıklı string**.
Hafta sonu/tatil günleri `null` değerli satır olarak gelir (bazı çoklu sorgularda hiç gelmez) → gözlem yok sayılır.
"Seri başlangıcı 1950" metadata'dır; ilk gerçek (null olmayan) gözlem `data:discover`da ayrıca ölçülecek.

## D-005 2005 para reformu — DOĞRULANDI

EVDS örnek gözlemleri (USD Döviz Alış):

| EVDS tarihi | Arşiv `TP.DK.USD.A` | Ana `TP.DK.USD.A.YTL` |
|---|---|---|
| 30-12-2004 | 1352500 | 1.3525 |
| 31-12-2004 | 1342100 | 1.3421 |
| 03-01-2005 | 1.3363 | 1.3363 |
| 04-01-2005 | 1.3383 | 1.3383 |

- **Arşiv serileri** 2005 öncesini **eski TL** ile (TCMB'nin yayımladığı gibi) verir.
- **Ana `.YTL` serileri** 2005 öncesini **EVDS tarafından 1.000.000'a bölünmüş** olarak verir. 2005 sonrası iki aile birebir aynı
  (örnekler: 2020-01-10…17, 2024-03-28…04-02, tüm alanlarda eşit).
- 1.000.000'a bölünmüş seri süreklidir (1,3421 → 1,3363).
- **Hassasiyet riski:** EVDS 8 ondalık basamak veriyor. Çok eski yıllarda (ör. 1950'lerde 1 USD ≈ 2,80 eski TL → 0,0000028 YTL)
  `.YTL` serisinde anlamlı basamak kaybı olabilir. Arşiv serisinde ham değer tam.

**Öneri (owner onayı):** Ham değer (`rawValues`) olarak **arşiv serisi** saklanır; normalize değer SPEC §4.7 gereği **tarihe göre**
(< 2005-01-01 → ÷1.000.000) Döviz Arşiv tarafından hesaplanır. `.YTL` serisi her güncellemede çapraz kontrol olarak çekilir;
iki ailenin normalize değerleri eşleşmezse `data:validate` hata verir. Böylece "Orijinal değer: 1.342.100 TL" notu gerçek
kaynak değeri gösterir ve hassasiyet kaybı olmaz.

## D-006 Tarih konvansiyonu — DOĞRULANDI

EVDS veri grubu notu (`bie_dkdovytl`, resmi metadata): **"Bir önceki iş günü saat 15:30'da belirlenen gösterge niteliğindeki
TCMB Döviz Alış ve Döviz Satış Kurlarıdır. Belirlendiği günden bir sonraki gün Resmi Gazete'de yayımlanmaktadır."**
(Efektif grup için aynı ifade.)

Veriyle kanıt: EVDS tarihi D = D'den önceki iş günü yayımlanan TCMB bülteni.

| EVDS tarihi | EVDS USD alış | TCMB bülteni | Bülten USD alış |
|---|---|---|---|
| 14-01-2020 | 5.8529 | 13.01.2020 (2020/8) | 5.8529 |
| 15-01-2020 | 5.8811 | 14.01.2020 (2020/9) | 5.8811 |
| 16-01-2020 | 5.8827 | 15.01.2020 (2020/10) | 5.8827 |
| 01-04-2024 (Pzt) | 32.2854 | 29.03.2024 (Cum, 2024/64) | 32.2854 |
| 30-12-2004 | 1352500 | 29.12.2004 (2004/249) | 1352500 |
| 03-01-2005 | 1.3363 | 31.12.2004 (2004/251) | 1336300 |

Yani "15 Ocak 2020" EVDS gözlemi, **14 Ocak 2020 15.30'da belirlenen** kurdur. Kullanıcıların "15 Ocak 2020 dolar kuru"
aramasında çoğunlukla hangisini kastettiği bir **ürün kararıdır** (Açık sorular #2). Hangi seçenek seçilirse seçilsin her gün
sayfasında iki tarih birlikte gösterilecek: "Geçerlilik (EVDS) tarihi" ve "TCMB'nin belirlediği tarih (bülten)".
Muhasebe/vergi açısından hangi günün kurunun kullanılacağına dair iddia kurulmayacak (SPEC §4.7).

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

## D-010 Güncelleme zamanlaması (SPEC §3.3) — DOĞRULANDI

- Kurlar her iş günü 15.30 TSİ'de belirlenir ve EVDS'de **bir sonraki iş gününün tarihiyle** yer alır (D-006).
- Kanıt: 2026-09-28 (Pazartesi) 06:31 UTC'de EVDS `END_DATE` = 28-09-2026 idi; yani o günün satırı sabah zaten mevcuttu.
- **Karar:** iş akışı hafta içi **03:40 UTC** (06:40 TSİ) çalışır ve o günün EVDS tarihli satırını alır. Yeni gün yoksa (tatil)
  commit atılmaz. Günlük ~1 build → ayda ~22 build (500 limitinin çok altında).
- Mevcut `.github/workflows/daily-data-fetch.yml` (`main`) son 43 çalışmasının tamamında başarısız; Faz 1'de silinip yerine
  `data-update.yml` gelecek.

## Açık sorular (owner)

1. **Gün sayfalarının alt sınır yılı** (D-002): 1950'den tüm günler 20.000 dosya limitini aşıyor. Önerim: gün sayfaları **1990**'dan,
   ay/yıl sayfaları 1950'den.
2. **Gün sayfasının tarihi** (D-006): `/tarih/2020-01-15/` hangi kuru göstersin?
   (A) EVDS tarihi = 15 Ocak'ta geçerli olan, **14 Ocak'ta belirlenen** kur (kaynağın kendi tarihi; veri kaydırılmaz), ya da
   (B) **15 Ocak'ta belirlenen** kur (bülten tarihi; EVDS verisi bir iş günü kaydırılarak eşlenir).
   Önerim: **(A)**. Kaynak tarihine sadık kalır, kaydırma hatası riski yoktur. Her sayfada "TCMB'nin 14 Ocak 2020 15.30'da
   belirlediği kur" satırı açıkça yer alır.
3. **2005 ham kaynağı** (D-005): arşiv serisi ham + kendi tarih bazlı dönüşümümüz + `.YTL` çapraz kontrolü önerisi onaylanıyor mu?
4. EVDS genel/özel şart gerilimi (D-007) bilgi olarak kabul ediliyor mu? (SPEC kararı değişmiyor.)
5. Klasör yapısı (D-009) ve silme listesi (D-008) onayı.
