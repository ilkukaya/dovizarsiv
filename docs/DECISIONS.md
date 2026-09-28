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

## D-009 Klasör yapısı — ONAYLANDI (owner, Faz 0 kararı #5)

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
- **Güncelleme (Faz 1):** konvansiyon B ile günün kuru, TCMB'nin o gün 15.30'da belirlediği kurdur; bu kur EVDS'ye ertesi
  iş günü tarihli satır olarak girer. Ölçüm (D-013): kur ≈16.00 TSİ'de EVDS'de. Ana çalışma 16.40 TSİ'ye alındı.
- ~~**Karar:** iş akışı hafta içi **03:40 UTC** (06:40 TSİ) çalışır~~ (D-013 ile değiştirildi) ve o günün EVDS tarihli satırını alır. Yeni gün yoksa (tatil)
  commit atılmaz. Günlük ~1 build → ayda ~22 build (500 limitinin çok altında).
- Mevcut `.github/workflows/daily-data-fetch.yml` (`main`) son 43 çalışmasının tamamında başarısız; Faz 1'de silinip yerine
  `data-update.yml` gelecek.

## D-011 Sayısal hassasiyet ve yuvarlama — UYGULANDI (Faz 1)

- Kaynak değerler string olarak saklanır (`raw`, EVDS'nin 8 ondalıklı metni birebir). Normalize değer, sondaki sıfırları atılmış
  kanonik ondalık string'dir (`5.88270000` → `5.8827`); kaynaktan fazla hassasiyet uydurulmaz.
- Aritmetik `src/lib/calculations/decimal.ts` (BigInt tabanlı). Toplama/çıkarma/çarpma ve 2005 dönüşümü (÷10⁶) TAMDIR.
  Bölme (ortalama, yüzde, TL→döviz) 12 ondalıkta half-even yuvarlanır. Float yalnızca grafik çiziminde kullanılır.
- Gösterim yuvarlaması yalnızca `src/lib/formatting/format.ts`'te: kur 4, yüzde 2, tutar 2 ondalık (tr-TR, half-even).
- EVDS `.YTL` serisi 1950–1980 döneminde değerleri 8 basamağa **half-up** yuvarlıyor (ör. 9,045 eski TL → 0,00000905).
  Bu nedenle ham kaynak olarak arşiv serisi (tam hassasiyet) kullanılıyor; `.YTL` yalnızca çapraz kontrol.

## D-012 Tarih konvansiyonu "B" — UYGULANDI VE DOĞRULANDI (Faz 1)

**Kural (tek fonksiyon: `src/lib/data/convention.ts` → `buildDeterminationIndex`):**
- Sitenin tarihi = TCMB'nin kuru 15.30'da belirlediği gün. EVDS'de D tarihli satır = D'den önceki son TCMB iş gününde belirlenen kur.
- EVDS, kur belirlenmeyen günlerde (arife, bayram, bazı resmî tatiller) bir önceki kuru **tekrarlayan satırlar** içeriyor
  (ör. her yıl 28 Ekim satırı, 2018-01-01, 2018-04-23, 2018-05-01 satırları). 1990-01-01'den itibaren bir satır önceki satırla
  birebir aynı değerleri taşıyorsa "taşınan kur" satırıdır ve belirlenme günü üretmez. Yeni kur taşıyan satırın kuru, önceki
  satırın gününde belirlenmiştir.
- 1990 öncesinde (sabit kur dönemleri; aynı değerler aylarca sürer) her satır ayrı belirlenme sayılır. Ölçüm: 1990 sonrası tüm
  aynı-değer dizileri 2–3 satırlık ve tatillere denk geliyor; 1950–1989'da 4–13+ satırlık diziler var.
- Taşınan-kur satırları ve serinin ilk satırı `data/metadata/source-extra.json`'da saklanır (ham kaynak eksiksiz; 88 satır).
- Arşivde olmayıp yalnızca `.YTL`'de bulunan satırlar her güncellemede sınıflanır. Yeni kur taşıyıp arşivde karşılığı yoksa hata
  verilir. Tek not: **2017-08-30** satırı (kur 3,4410) arşivde yok, arşivde bu kur 2017-08-31 satırında başlıyor. Belirlenme günü
  (2017-08-29) iki durumda da aynı; yalnızca "ilk geçerlilik günü" arşivde bir satır geç görünüyor.

**Doğrulama:** TCMB günlük bülten XML'leri (yalnızca GitHub Actions'ta, üretim verisine girmeden) ile 73 tarih:
hafta sonu geçişleri, yılbaşları, resmî tatiller, 28 Ekim arifesi, bayram arifeleri ve uzun (9 günlük) bayram tatilleri,
2005 geçişi, 2001 krizi. Kur belirlenmeyen günlerde (XML 404) sitede gözlem yok; belirlenen günlerde 3 para birimi ×
4 alanın tamamı birebir eşleşiyor (2001 öncesi EUR efektif olmadığı için 10/10).

| # | Tarih | Gün | Senaryo | TCMB bülteni | Sitede gözlem | Kaynak EVDS satırı | USD döviz alış (bülten / site) | Alan eşleşmesi | Sonuç |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2000-01-07 | Cuma | hafta sonu öncesi (Cuma) | yok (404) | yok | — | — | — | ✅ |
| 2 | 2000-01-10 | Pazartesi | hafta sonu sonrası (Pazartesi) | yok (404) | yok | — | — | — | ✅ |
| 3 | 2008-06-06 | Cuma | hafta sonu öncesi (Cuma) | 2008/111 | var | 2008-06-09 | 1.2335 / 1.2335 | 12/12 | ✅ |
| 4 | 2008-06-07 | Cumartesi | Cumartesi | yok (404) | yok | — | — | — | ✅ |
| 5 | 2008-06-09 | Pazartesi | hafta sonu sonrası (Pazartesi) | 2008/112 | var | 2008-06-10 | 1.2405 / 1.2405 | 12/12 | ✅ |
| 6 | 2020-01-10 | Cuma | hafta sonu öncesi (Cuma) | 2020/7 | var | 2020-01-13 | 5.8713 / 5.8713 | 12/12 | ✅ |
| 7 | 2020-01-11 | Cumartesi | Cumartesi | yok (404) | yok | — | — | — | ✅ |
| 8 | 2020-01-13 | Pazartesi | hafta sonu sonrası (Pazartesi) | 2020/8 | var | 2020-01-14 | 5.8529 / 5.8529 | 12/12 | ✅ |
| 9 | 2020-01-15 | Çarşamba | referans gün (SPEC §11.5) | 2020/10 | var | 2020-01-16 | 5.8827 / 5.8827 | 12/12 | ✅ |
| 10 | 2024-03-29 | Cuma | hafta sonu öncesi (Cuma) | 2024/64 | var | 2024-04-01 | 32.2854 / 32.2854 | 12/12 | ✅ |
| 11 | 2024-04-01 | Pazartesi | hafta sonu sonrası (Pazartesi) | 2024/65 | var | 2024-04-02 | 32.3568 / 32.3568 | 12/12 | ✅ |
| 12 | 1999-12-31 | Cuma | yılbaşı öncesi | yok (404) | yok | — | — | — | ✅ |
| 13 | 2000-01-03 | Pazartesi | yılbaşı sonrası | (no'suz) 2000-01-03 | var | 2000-01-04 | 0.540793 / 0.540793 | 10/10 | ✅ |
| 14 | 2004-12-31 | Cuma | yılbaşı öncesi + 2005 para reformu | 2004/251 | var | 2005-01-03 | 1.3363 / 1.3363 | 12/12 | ✅ |
| 15 | 2005-01-03 | Pazartesi | yılbaşı sonrası + 2005 para reformu | 2005/1 | var | 2005-01-04 | 1.3383 / 1.3383 | 12/12 | ✅ |
| 16 | 2008-12-31 | Çarşamba | yılbaşı öncesi | 2008/249 | var | 2009-01-02 | 1.5218 / 1.5218 | 12/12 | ✅ |
| 17 | 2009-01-01 | Perşembe | yılbaşı tatili | yok (404) | yok | — | — | — | ✅ |
| 18 | 2009-01-02 | Cuma | yılbaşı sonrası | 2009/1 | var | 2009-01-05 | 1.5293 / 1.5293 | 12/12 | ✅ |
| 19 | 2019-12-31 | Salı | yılbaşı öncesi | 2019/247 | var | 2020-01-02 | 5.94 / 5.94 | 12/12 | ✅ |
| 20 | 2020-01-01 | Çarşamba | yılbaşı tatili | yok (404) | yok | — | — | — | ✅ |
| 21 | 2020-01-02 | Perşembe | yılbaşı sonrası | 2020/1 | var | 2020-01-03 | 5.9478 / 5.9478 | 12/12 | ✅ |
| 22 | 2023-12-29 | Cuma | yılbaşı öncesi (Cuma) | 2023/251 | var | 2024-01-02 | 29.4382 / 29.4382 | 12/12 | ✅ |
| 23 | 2024-01-01 | Pazartesi | yılbaşı tatili (Pazartesi) | yok (404) | yok | — | — | — | ✅ |
| 24 | 2024-01-02 | Salı | yılbaşı sonrası | 2024/1 | var | 2024-01-03 | 29.6675 / 29.6675 | 12/12 | ✅ |
| 25 | 2024-04-22 | Pazartesi | 23 Nisan öncesi | 2024/76 | var | 2024-04-24 | 32.5 / 32.5 | 12/12 | ✅ |
| 26 | 2024-04-23 | Salı | 23 Nisan tatili | yok (404) | yok | — | — | — | ✅ |
| 27 | 2024-04-24 | Çarşamba | 23 Nisan sonrası | 2024/77 | var | 2024-04-25 | 32.4742 / 32.4742 | 12/12 | ✅ |
| 28 | 2023-05-01 | Pazartesi | 1 Mayıs tatili | yok (404) | yok | — | — | — | ✅ |
| 29 | 2023-05-02 | Salı | 1 Mayıs sonrası | 2023/84 | var | 2023-05-03 | 19.4417 / 19.4417 | 12/12 | ✅ |
| 30 | 2023-05-18 | Perşembe | 19 Mayıs öncesi | 2023/96 | var | 2023-05-22 | 19.7607 / 19.7607 | 12/12 | ✅ |
| 31 | 2023-05-19 | Cuma | 19 Mayıs tatili | yok (404) | yok | — | — | — | ✅ |
| 32 | 2016-07-15 | Cuma | 15 Temmuz (2016: henüz tatil değil) | 2016/135 | var | 2016-07-18 | 2.8834 / 2.8834 | 12/12 | ✅ |
| 33 | 2019-07-15 | Pazartesi | 15 Temmuz tatili | yok (404) | yok | — | — | — | ✅ |
| 34 | 2022-08-30 | Salı | 30 Ağustos tatili | yok (404) | yok | — | — | — | ✅ |
| 35 | 2019-10-28 | Pazartesi | 29 Ekim arifesi (yarım gün) | yok (404) | yok | — | — | — | ✅ |
| 36 | 2019-10-29 | Salı | Cumhuriyet Bayramı | yok (404) | yok | — | — | — | ✅ |
| 37 | 2019-10-30 | Çarşamba | Cumhuriyet Bayramı sonrası | 2019/203 | var | 2019-10-31 | 5.7363 / 5.7363 | 12/12 | ✅ |
| 38 | 2024-04-08 | Pazartesi | Ramazan Bayramı 2024 öncesi | 2024/70 | var | 2024-04-09 | 32.006 / 32.006 | 12/12 | ✅ |
| 39 | 2024-04-09 | Salı | Ramazan Bayramı 2024 arifesi | yok (404) | yok | — | — | — | ✅ |
| 40 | 2024-04-10 | Çarşamba | Ramazan Bayramı 2024 1. gün | yok (404) | yok | — | — | — | ✅ |
| 41 | 2024-04-12 | Cuma | Ramazan Bayramı 2024 3. gün | yok (404) | yok | — | — | — | ✅ |
| 42 | 2024-04-15 | Pazartesi | Ramazan Bayramı 2024 sonrası | 2024/71 | var | 2024-04-16 | 32.3271 / 32.3271 | 12/12 | ✅ |
| 43 | 2023-04-19 | Çarşamba | Ramazan Bayramı 2023 öncesi | 2023/78 | var | 2023-04-20 | 19.3806 / 19.3806 | 12/12 | ✅ |
| 44 | 2023-04-20 | Perşembe | Ramazan Bayramı 2023 arifesi | yok (404) | yok | — | — | — | ✅ |
| 45 | 2023-04-21 | Cuma | Ramazan Bayramı 2023 1. gün | yok (404) | yok | — | — | — | ✅ |
| 46 | 2023-04-24 | Pazartesi | Ramazan Bayramı 2023 sonrası | 2023/79 | var | 2023-04-25 | 19.3853 / 19.3853 | 12/12 | ✅ |
| 47 | 2023-06-26 | Pazartesi | Kurban Bayramı 2023 öncesi | 2023/122 | var | 2023-06-27 | 25.8231 / 25.8231 | 12/12 | ✅ |
| 48 | 2023-06-27 | Salı | Kurban Bayramı 2023 arifesi | yok (404) | yok | — | — | — | ✅ |
| 49 | 2023-06-28 | Çarşamba | Kurban Bayramı 2023 1. gün | yok (404) | yok | — | — | — | ✅ |
| 50 | 2023-07-03 | Pazartesi | Kurban Bayramı 2023 sonrası | 2023/123 | var | 2023-07-04 | 26.0312 / 26.0312 | 12/12 | ✅ |
| 51 | 2025-06-04 | Çarşamba | Kurban Bayramı 2025 öncesi | 2025/105 | var | 2025-06-05 | 39.0575 / 39.0575 | 12/12 | ✅ |
| 52 | 2025-06-05 | Perşembe | Kurban Bayramı 2025 arifesi | yok (404) | yok | — | — | — | ✅ |
| 53 | 2025-06-06 | Cuma | Kurban Bayramı 2025 1. gün | yok (404) | yok | — | — | — | ✅ |
| 54 | 2025-06-09 | Pazartesi | Kurban Bayramı 2025 4. gün | yok (404) | yok | — | — | — | ✅ |
| 55 | 2025-06-10 | Salı | Kurban Bayramı 2025 sonrası | 2025/106 | var | 2025-06-11 | 39.1385 / 39.1385 | 12/12 | ✅ |
| 56 | 2018-08-17 | Cuma | Kurban 2018 uzun tatil öncesi (Cuma) | 2018/160 | var | 2018-08-20 | 5.9944 / 5.9944 | 12/12 | ✅ |
| 57 | 2018-08-20 | Pazartesi | Kurban 2018 arifesi / idari izin | yok (404) | yok | — | — | — | ✅ |
| 58 | 2018-08-24 | Cuma | Kurban 2018 bayram / tatil | yok (404) | yok | — | — | — | ✅ |
| 59 | 2018-08-27 | Pazartesi | Kurban 2018 uzun tatil sonrası | 2018/161 | var | 2018-08-28 | 6.1901 / 6.1901 | 12/12 | ✅ |
| 60 | 2019-05-31 | Cuma | Ramazan 2019 uzun tatil öncesi (Cuma) | 2019/106 | var | 2019-06-03 | 5.8613 / 5.8613 | 12/12 | ✅ |
| 61 | 2019-06-03 | Pazartesi | Ramazan 2019 arifesi / idari izin | yok (404) | yok | — | — | — | ✅ |
| 62 | 2019-06-07 | Cuma | Ramazan 2019 idari izin | 2019/107 | var | 2019-06-10 | 5.8354 / 5.8354 | 12/12 | ✅ |
| 63 | 2019-06-10 | Pazartesi | Ramazan 2019 uzun tatil sonrası | 2019/108 | var | 2019-06-11 | 5.807 / 5.807 | 12/12 | ✅ |
| 64 | 2024-06-14 | Cuma | Kurban 2024 öncesi (Cuma) | 2024/113 | var | 2024-06-20 | 32.4579 / 32.4579 | 12/12 | ✅ |
| 65 | 2024-06-17 | Pazartesi | Kurban 2024 bayram | yok (404) | yok | — | — | — | ✅ |
| 66 | 2024-06-20 | Perşembe | Kurban 2024 bayram sonrası | 2024/114 | var | 2024-06-21 | 32.5711 / 32.5711 | 12/12 | ✅ |
| 67 | 2024-06-21 | Cuma | Kurban 2024 (idari izin değil) | 2024/115 | var | 2024-06-24 | 32.781 / 32.781 | 12/12 | ✅ |
| 68 | 2024-06-24 | Pazartesi | Kurban 2024 sonrası | 2024/116 | var | 2024-06-25 | 32.8078 / 32.8078 | 12/12 | ✅ |
| 69 | 2001-02-21 | Çarşamba | 2001 krizi | (no'suz) 2001-02-21 | var | 2001-02-22 | 0.685391 / 0.685391 | 10/10 | ✅ |
| 70 | 2001-02-22 | Perşembe | 2001 krizi: dalgalı kur | (no'suz) 2001-02-22 | var | 2001-02-23 | 0.957879 / 0.957879 | 10/10 | ✅ |
| 71 | 2001-02-23 | Cuma | 2001 krizi | (no'suz) 2001-02-23 | var | 2001-02-26 | 1.072988 / 1.072988 | 10/10 | ✅ |
| 72 | 2026-09-24 | Perşembe | yakın tarih | 2026/180 | var | 2026-09-25 | 48.7671 / 48.7671 | 12/12 | ✅ |
| 73 | 2026-09-25 | Cuma | yakın tarih (Cuma) | 2026/181 | var | 2026-09-28 | 48.7901 / 48.7901 | 12/12 | ✅ |

**Sonuç: 73 tarih, 73 başarılı, 0 başarısız** (GitHub Actions run 36393290372, 2026-09-28).

Not: 2000–2001 bültenlerinde `Bulten_No` alanı yok; tarih alanı eşleşiyor.

**2005 kenar durumu:** 31.12.2004'te belirlenen kur, EVDS'de 03.01.2005 satırında (arşiv serisinde bile) zaten yeni TL
(1,3363). TCMB bülteni aynı kuru eski TL ile (1.336.300) veriyor. Normalizasyon KAYNAK satır tarihine göre yapılır (değer
büyüklüğüne göre değil); 2004-12-31 gün sayfasında eski TL karşılığı "Döviz Arşiv hesaplaması" olarak gösterilir.

## D-013 EVDS yayın saati ve güncelleme zamanlaması — ÖLÇÜLDÜ (2026-09-28)

- **Yöntem:** `evds-watch.yml` (Actions run 36421860552), `npm run data:discover -- --watch`: 12:26 UTC'den itibaren
  5 dakikada bir EVDS'ye son satırlar soruldu.
- **Sonuç:** 2026-09-28 (Pazartesi) 15.30 TSİ'de belirlenen kur, EVDS'de **2026-09-29 tarihli satır** olarak
  12:57:06 UTC'de henüz yoktu, **13:02:07 UTC'de vardı** (ham arşiv serisi ve `.YTL` serisi aynı anda; USD döviz alış 48,9008).
  → Kur, belirlenmesinden **≈27–32 dakika sonra**, yaklaşık **16.00 TSİ**'de EVDS'ye düşüyor. Konvansiyon B ile uyumlu:
  yeni satırın tarihi bir sonraki iş günü, belirlenme günü bugün.
- **Karar (`data-update.yml`, hafta içi, UTC):**
  - `40 13 * * 1-5`: **16.40 TSİ** ana çalışma (ölçülen yayın anından ≈40 dk sonra; GitHub zamanlayıcı gecikmesi payı dahil).
  - `40 16 * * 1-5`: **19.40 TSİ** yedek (EVDS'nin geç yayımladığı günler).
  - `15 4 * * 1-5`: **07.15 TSİ** ertesi sabah telafi (önceki günün iki çalışması da kaçırdıysa; Pazartesi sabahı Cuma kurunu alır).
  - Yeni veri yoksa commit yok, build yok. Ayda ≈22 veri build'i (D-001 limitinin çok altında).
- **Sınırlılık:** tek günlük ölçüm. Yarım gün (arife) ve yoğun günlerde süre farklı olabilir. Yedek ve telafi çalışmaları
  bu yüzden var. Gecikme örüntüsü görülürse `npm run data:discover -- --watch` yeniden çalıştırılıp bu kayıt güncellenir.
- Zamanlanmış iş akışları yalnızca varsayılan dalda (main) çalışır.

## D-014 Faz 1 veri bulguları

- **Kapsam:** 45.437 gözlem, 19.262 belirlenme günü. USD/GBP döviz 1950-01-02, EUR döviz 1998-12-31 (EVDS 04.01.1999 satırı),
  USD/GBP efektif 1989-12-29, EUR efektif 2001-12-31 → son belirlenme günü 2026-09-25 (EVDS 28.09.2026 satırı).
- **Çapraz kontrol (arşiv ↔ .YTL, tam geçmiş):** 140.782 karşılaştırma; 131.290 tam eşleşme, 9.492 yalnızca 8 basamak
  yuvarlama (1950–1980), **0 uyuşmazlık**.
- **EVDS birebir kontrol (rastgele 10 tarih, katmanlı: 3 × <1990, 3 × 1990–2004, 4 × 2005+):** ham değerler 10/10 birebir.
  (İlk çalıştırmada 1954, 1960, 1972 tarihleri `.YTL`'nin 8 basamak yuvarlaması yüzünden kontrol betiği tarafından hatalı
  "fark" sayıldı; betik düzeltildi, ham değerler bu tarihlerde de birebir aynı.)
  Düzeltilmiş betikle yeniden çalıştırma (Actions run 36396138774, 2026-09-28): **10 tarih, 10 birebir eşleşme, 0 fark.**
- **Kaynak tutarsızlığı (tamir edilmedi):** 1991-10-11 (EVDS 1991-10-14) GBP efektif alış 0,00839229 > efektif satış 0,00834217.
  Gün sayfası kapsamı dışında; `data:validate` uyarı verir.
- **Anomali raporu (`data/metadata/anomalies.json`, eşik %5, döviz alış+satış):** 290 gözlem. En büyükleri bilinen olaylar:
  1960-08-19 (devalüasyon, +%221), 1980-01-24 (+%100), 1970-08-07 (+%66), 1979-06-11, 1994-04-05 (+%39), 2001-02-22 (dalgalı
  kura geçiş, +%40), 2021-12-21 (−%25). Otomatik silme yok.
- **Sabit kurlu aylar (döviz alış ve satış ay boyunca değişmemiş; `data/metadata/flat-months.json`):** USD 349 / 921,
  GBP 337 / 921, EUR 1 / 334 (1998-12, tek gözlem). Tamamı 1950-01 … 1980-09 arasında; 2000 sonrasında yok.
  Bu aylar ve tek gözlemli aylar `isIndexablePage` ile `noindex,follow` alır ve sitemap'e girmez.

## D-015 Faz 2 kalite sonuçları (2026-09-28)

- **Build:** 9.060 HTML sayfası, dist'te 9.179 dosya (Cloudflare Pages 20.000 limitinin %46'sı), yerel derleme ≈66 sn.
- **seo:validate:** temiz. 8.335 indekslenebilir sayfa, 724 noindex (sabit kurlu ve tek gözlemli ay/yıllar, 404), sitemap
  index'te 1.669 URL, kademeli indeksleme bekleyen 6.666 gün sayfası (docs/indexing-rollout.md).
- **links:check:** temiz. 545.550 iç link, kırık link ve yetim sayfa yok.
- **Negatif testler:** iki doğrulayıcı da kasıtlı bozulan çıktıda (eksik canonical, kırık link, sitemap'te noindex) hata verdi.
- **Düzen (`npm run qa:layout`):** 13 sayfa × 7 genişlik (360–1440 px); yatay taşma yok.
- **Smoke (`npm run qa:smoke`):** tarih bulucu (belirlenme günü, hafta sonu → `?istenen=`, bayram, 2000 öncesi → ay sayfası),
  gerçek 404, mobil menü: tamamı geçti.
- **Lighthouse 13.5 (`npm run qa:lighthouse`, yerel sunucu, CDN değil):** 7 sayfanın tamamı mobil ve masaüstünde
  Performans / Erişilebilirlik / En iyi uygulamalar / SEO = 100 / 100 / 100 / 100; CLS 0,000; TBT 0 ms.

| Sayfa | Mobil LCP (sn) | Masaüstü LCP (sn) | Aktarım (KB) |
|---|---|---|---|
| / | 0,91 | 0,24 | 26 |
| /dolar/ | 1,20 | 0,33 | 68 |
| /dolar/2020/ | 1,05 | 0,28 | 37 |
| /dolar/2020/01/ | 1,05 | 0,28 | 34 |
| /tarih/2020-01-15/ | 1,05 | 0,28 | 31 |
| /tarih-arsivi/2020/ | 1,20 | 0,32 | 59 |
| /metodoloji/ | 0,90 | 0,24 | 27 |

- **CSP:** `script-src 'self'`. Astro'nun satır içi modül script'leri CSP'yi bozacağı için `vite.build.assetsInlineLimit: 0`
  ile tüm script'ler harici dosyaya zorlandı. AdSense açılırken gerekli alan adları HANDOFF.md'de listelidir.
- **Ay sayfası boş gün metni:** SPEC §6.6'daki "TCMB kuru yayımlanmadı (hafta sonu/tatil)" yerine "TCMB kur belirlemedi
  (hafta sonu, resmî tatil ya da arife)" kullanıldı. Konvansiyon B'de satırın anlamı "o gün kur belirlenmedi"dir; arife
  günleri de (yarım gün, kur belirlenmez) bu gruba girer.

## D-016 Faz A: araçlar (Sonnet, 2026-09-28)

- **Mimari:** framework yok; her araç `src/components/tools/*.astro` içinde harici modül script'tir (CSP `script-src 'self'`).
  Hesap mantığı `src/lib/tools/{rates,historical,change,compare}.ts` (DOM'suz, `Decimal` ile, vitest'li), sunum `ui*.ts`.
  Hesaplayıcı `convert.ts`, `Decimal`, `lookup.ts`, `stats.ts`'i yeniden kullanır; yeni yuvarlama/istatistik mantığı yazılmadı.
- **Veri:** yalnızca `/veri/kurlar/{yıl}.json` (yıl başında gözlem yoksa bir önceki yıl da). Şema doğrulanır; beklenmeyen biçimde araç hata verir, yanlış veriyle hesap yapmaz. Başarısız istek önbellekten silinir.
- **Kur günü (konvansiyon B):** seçilen günün belirlenen kuru; gözlemsiz gün → en yakın önceki belirlenme günü ve bu sonuçta açıkça yazılır. Gelecek tarih ve para biriminin ilk gözleminden önceki tarih reddedilir (EUR: 31.12.1998).
- **Kur türü:** "Önerilen" = döviz→TL alış, TL→döviz satış (`defaultRateField`). Döviz→döviz: kaynak alış, hedef satış (TL üzerinden), tür (döviz/efektif) seçimden gelir. Yayımlanmamış kur türü (ör. EUR efektif 1998) sessizce atlanmaz, hata verir.
- **2005 öncesi TL:** depodaki değerler yeni TL. Kullanıcı tutarın eski/yeni TL olduğunu seçer (varsayılan: o tarihte geçerli olan eski TL); sonuç iki birimde gösterilir. 1 YTL = 1.000.000 TL kaydırması `Decimal.shiftLeft/Right` ile tam.
- **Tutar girişi:** tr-TR yazımı (`1.234,56`); virgül yoksa `1.500` binlik, `1234.56` ondalık okunur; negatif, boş, 15 basamaktan uzun reddedilir.
- **Doğrulama:** 21 birim testi; beklenen değerler kod dışında (Python Decimal) hesaplandı. 6 elle hesaplı örnek (588,27 · 169,684217670914 · 587,13 · 2417,128741111009 · 41.172.800 eski TL · 89,645240925299 · 133.630.000 eski TL). Karşılaştırma tablosu 1999, 2005, 2020 için `periodSummary` ile birebir aynı (test).
- **Tarayıcı smoke (Playwright):** her araç uçtan uca; hafta sonu, 2005 öncesi, kapsam dışı ve geçersiz tutar hataları; karşılaştırma 2020 ortalaması yıl sayfasıyla aynı; sonuç `aria-live` ile duyuruluyor.
- **Düzen:** 16 sayfa × 7 genişlik, araç sonuçları açıkken de yatay taşma yok.
- **Lighthouse (mobil / masaüstü):** araç sayfaları 100/100/100/100, CLS 0,000, TBT 0; LCP mobil 1,10–1,35 sn. Gün sayfası mini hesaplayıcıyla 31 → 51 KB, LCP mobil 1,05 → 1,40 sn (hedef < 2,0 sn).

## D-017 Faz B: rehber ve yasal sayfalar (Sonnet, 2026-09-28)

- **Rehber:** Markdown content collection (`src/content.config.ts`); şema build'de zorunlu (title, description 50–170, `updated`, ≥1 kaynak, ≥1 ilgili link). 10 yazı SPEC §6.10 sırasıyla; Article JSON-LD (yazar/uzman uydurulmaz: yayıncı olarak site adı ya da `site.ts` yayıncısı), BreadcrumbList, kaynak listesi, ilgili sayfalar.
- **Olgu kuralı:** ortam resmî sitelere erişemediğinden yazılar yalnızca DECISIONS'ta doğrulanmış bilgilere ve sitenin kendi verisine dayanır; kalan olgular `docs/guides-review.md`'de "bilerek yazılmadı" listesindedir (TCMB'nin kur hesaplama yöntemi, 2005 reformunun yasal ayrıntısı, resmî işlemlerde hangi günün kurunun kullanılacağı vb.).
- **Test kapısı (`tests/guides.test.ts`):** 10 yazı, sıra, description uzunluğu, kaynak, yasak kalıplar ("günümüzde", "bu yazımızda", sebep/tahmin dili…), iç link biçimi, `STATIC_ROUTES` tutarlılığı.
- **Yasal sayfalar (6):** bugünkü gerçek durumu anlatır: çerez yok, analitik ve reklam kapalı, tarayıcıda yalnızca tercih (localStorage), barındırma sağlayıcısı kayıtları. Yayıncı/e-posta yalnızca `site.ts`'den; boşsa satır basılmaz. Reklam/analitik açıldığında gizlilik, çerez ve reklam politikası sayfalarının güncellenmesi zorunlu (LAUNCH-CHECKLIST).
- **Menü/footer:** `FEATURES.guides` ve `FEATURES.legalPages` açıldı; 17 yeni rota `STATIC_ROUTES` ile sitemap'te (`guides` grubu ayrı).

## D-018 Faz C: reklam altyapısı, onay yönetimi, CSP, kolaylıklar (Sonnet, 2026-09-28)

**Resmî kaynaklardan doğrulananlar** (GitHub Actions üzerinden çekildi; 2026-09-28):

| Konu | Kaynak | Bulgu ve uygulamamız |
|---|---|---|
| ads.txt | AdSense Help "Ads.txt guide" (answer/7532444) | Satır: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`, sitenin kök dizininde. `/ads.txt` yalnızca canlı kipte ve geçerli ID ile üretilir |
| Reklam birimi kodu | AdSense Help "Where to place ad unit code in your HTML" (answer/9190028) | `adsbygoogle.js?client=ca-pub-…` (`crossorigin="anonymous"`), `<ins class="adsbygoogle" data-ad-client data-ad-slot>`, `(adsbygoogle = window.adsbygoogle \|\| []).push({})`. Aynı biçim |
| Consent Mode v2 | Google "Set up consent mode on websites" | Varsayılan `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage` = `denied`; CMP yavaş yüklenirse `wait_for_update` (500 ms); güncelleme `gtag('consent','update',…)`. `/ads/runtime.js` bunu AdSense'ten ÖNCE çalıştırır (testli) |
| CSP | AdSense Help answer/16283098; Publisher Tag CSP rehberi | Yalnızca strict CSP (nonce) desteklenir; "daha gevşek politika seçebilirsiniz", "CSP zorunlu değil". Statik hostingte nonce yok → reklam açıkken gevşek politika (aşağıda) |
| Yerleşim | Google Publisher Policies (answer/10502938) | Reklamlar "gezinme veya diğer eylem öğelerinin üstüne binmemeli ya da bitişik olmamalı, istem dışı tıklamaya yol açmamalı". Yerleşim kuralımız (SPEC §10) bununla uyumlu |
| Onay | aynı politika | AEA/UK kullanıcıları için "EU user consent policy"ye uyum gerekir → Google sertifikalı CMP zorunlu; Funding Choices artık AdSense'in "Privacy & messaging" sekmesine taşınmış |

**Kararlar**
- **Varsayılan KAPALI.** `PUBLIC_ADSENSE_ENABLED != "true"` iken çıktıda reklam kutusu, script, `/ads.txt`, `/ads/runtime.js` yoktur (smoke testi doğrular; stil dosyasında yalnızca etkisiz `.ad-slot` kuralları vardır).
- **Kipler** (`src/config/ads.ts`): `off` / `test` (sabit yükseklikli "Reklam alanı (test modu)", harici script yok; production'da build'i düşürür) / `live` (geçerli `ca-pub-` + 16 rakam, birincil slot; **production'da onay yönetimi `PUBLIC_CMP_SRC` zorunlu**, aksi hâlde build düşer).
- **Onay:** site kendi banner'ını çizmez ve onay kararı vermez. Varsayılan `denied` (Türkiye/KVKK için de). Google sertifikalı CMP `gtag('consent','update',…)` çağırır; özel CMP için `window.dovizarsivConsent.update(...)`.
- **CSP:** reklam kapalıyken `script-src 'self'` (sıkı). Canlı kipte `npm run build` sonrası `scripts/ads/apply-csp.ts`, `dist/_headers` içindeki CSP'yi Google'ın desteklediği daha gevşek biçime çevirir (`script-src 'self' 'unsafe-inline' 'unsafe-eval' https:`, `frame-src https:`, `img/connect-src https:`; `object-src 'none'`, `frame-ancestors 'self'`). Alan adı listesi TUTULMAZ (Google değişeceğini söylüyor).
- **Yerleşim:** birincil slot ana veri bölümünden sonra (gün, ay, yıl, hub, rehber), ikincil slot yalnızca ≥ 900 px'te alt bölümde. Tarih seçici, hesaplayıcı formları, önceki/sonraki gezinme yakınında, araç, 404, arşiv ve yasal sayfalarda reklam yok. Sağ kolon yerleşimi kurulmadı (sayfa düzeninde kolon yok).
- **Bug notu:** Astro'da `slot` özel bir öznitelik adıdır (üst bileşenin adlandırılmış yuvası). `<AdSlot slot="…">` `<BaseLayout>` içinde sessizce siliniyordu; prop `placement` yapıldı.

**Doğrulanamayanlar (owner/lansman öncesi kontrol):**
- **CMP script adresi:** AdSense hesabında "Privacy & messaging" sekmesinden alınacak snippet'in tam biçimi doğrulanamadı. `PUBLIC_CMP_SRC` tek script adresi bekler; snippet ek satır içi kod içeriyorsa `src/lib/ads/runtime.ts` genişletilmelidir.
- `data-ad-format="auto"` / `data-full-width-responsive="true"` (duyarlı birim öznitelikleri) bu çekimde doğrulanmadı; AdSense'te oluşturulan birimin kodundaki değerlerle karşılaştırın.
- AdSense script'i `<head>` yerine çalışma zamanında dinamik eklenir. İşlevsel olarak eşdeğerdir ama Google'ın "kodu `<head>` içine yapıştırın" tarifiyle birebir aynı değildir; site doğrulama/onay sürecinde sorun çıkarsa kod sayfaya doğrudan konur.
- Ad Manager/GPT kullanılmıyor; yalnızca AdSense.

**Kolaylıklar**
- **localStorage** (`src/lib/tools/prefs.ts`): yalnızca son seçilen para birimi, kur türü ve son 5 bakılan tarih/sayfa. Tutar, tarih girdisi ya da sonuç saklanmaz; okunan her değer doğrulanır (yalnızca `/tarih/…` ve `/{para}/{yıl}/{ay}/` adresleri kabul edilir); depolama engelliyse sessizce atlanır ve araçlar aynı çalışır (smoke ve birim testleri).
- **Paylaş:** Web Share API, yoksa canonical adresi panoya kopyalar (`?istenen=` paylaşılmaz).
- **Baskı CSS'i:** başlık, kurlar, hesap sonucu, kaynak kutusu ve sayfa adresi kalır; menü, footer, formlar, reklam ve paylaş gizlenir; koyu tema tarayıcılarda da beyaz zemin.
- **Ölçümler:** reklam açık simülasyonunda (test kipi, sabit 280 px rezerve) gün/ay/yıl/hub/rehber sayfalarında **CLS 0,000**, Lighthouse 100/100/100/100; mobilde ikincil slot gizli. Bu, gerçek reklam yüklenmesini değil rezerve alan davranışını ölçer; canlı CLS lansman sonrası alan verisiyle izlenmelidir.

## Owner kararları (Faz 0 sonrası, 2026-09-28)

Faz 0'daki açık soruların hepsi cevaplandı:
1. Gün sayfaları 2000-01-01'den, ay/yıl sayfaları 1950'den. Sabit kurlu aylar `noindex,follow` (D-014: USD 349, GBP 337, EUR 1).
2. Tarih konvansiyonu **B** (D-012).
3. 2005: ham kaynak arşiv serisi + tarih bazlı dönüşüm + her güncellemede `.YTL` çapraz kontrolü (D-005, D-014).
4. D-007 riski kabul edildi; SPEC §4.2 kararı değişmedi.
5. D-008 silme listesi ve D-009 klasör yapısı onaylandı.
6. `phase0-probe.yml` silindi; keşif `npm run data:discover` oldu.
