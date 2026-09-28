# dovizarsiv.net — ÜRÜN VE TEKNİK ŞARTNAME (SPEC)

## 1. Ürün

- **Marka:** Döviz Arşiv — "Geçmiş döviz kurları ve kur hesaplama araçları"
- **Domain:** https://dovizarsiv.net
- **Dil ve pazar:** Türkçe, Türkiye.
- **Ürün:** TCMB döviz kurlarının geçmiş arşivi ve hesaplama araçları.
- **Ne DEĞİL:** canlı kur sitesi, kripto, trading platformu, haber sitesi, yatırım tavsiyesi sitesi, ince programatik SEO sitesi.
- **Değer önerisi:** Ham veri tek başına değer değildir. Değer şunlardan gelir: düzenli arşiv gezintisi, hesaplamalar, karşılaştırmalar, istatistikler, grafikler, net Türkçe açıklamalar, çok hızlı sayfalar, mükemmel mobil deneyim ve kaynak şeffaflığı.
- **Karşılanacak arama niyetleri (örnekler):**
  - "15 Ocak 2020 dolar kuru"
  - "Ocak 2020 dolar kuru"
  - "2020 dolar kuru ortalaması / en yüksek / en düşük"
  - "geçmiş dolar kuru", "dolar kuru arşivi", "TCMB euro kuru arşivi"
  - "geçmiş döviz kuru hesaplama", "o tarihte 1.000 TL kaç dolardı"
  - "iki tarih arası dolar yüzde kaç değişti"
  - "döviz alış satış farkı", "efektif kur nedir", "hafta sonu TCMB kuru neden yok"

### 1.1 Temel ilkeler (her kararda önce bunlar gelir)
1. **Doğruluk.** Finansal istatistik "muhtemelen doğru" olamaz. Uydurma veri, kaynak, kişi veya tarihsel yorum yasak.
2. **Az ama güçlü sayfa.** Scaled content abuse riskine karşı her indekslenebilir sayfa, başka hiçbir sayfada olmayan, veriden hesaplanmış gerçek bilgi sunar. Test sorusu: "Google olmasaydı bu sayfa bir insana yine faydalı olur muydu?" Cevap hayırsa sayfa indekslenmez.
3. **Hız.** Arşiv sayfalarında neredeyse sıfır istemci JS. Grafikler build sırasında SVG olarak üretilir.
4. **Şeffaflık.** Kaynak, veri tarihi, hesaplama yöntemi ve sınırlılıklar her veri sayfasında görünür.
5. **"AI yapımı" hissi yok.** Jenerik gradient hero, rastgele blob'lar, sahte testimonial, stok finans görselleri, boş "akıllı içgörü" metinleri, robotik dolgu yazılar kullanılmaz.
6. **Tahmin yok.** "Dolar yükselecek", "almak mantıklı", "2027 tahmini" gibi içerik asla üretilmez.
7. **Çatışma kuralı.** Daha çok sayfa yerine daha iyi sayfa. Daha çok reklam yerine daha iyi deneyim. Çarpıcı iddia yerine doğruluk. SEO metni yerine faydalı bilgi.

## 2. İş modeli ve bütçe

- Ziyaretçi için tamamen ücretsiz. Üyelik, abonelik, paywall, premium, ücretli indirme, ücretli API yok.
- Gelir: yalnızca display reklam (Google AdSense).
- Aylık altyapı maliyeti: 0 TL. Ücretli API, veritabanı, CMS, arama (Algolia vb.), analitik, izleme yok. Supabase/Firebase/Redis/sunucu veritabanı yok. Gereksiz serverless fonksiyon yok.
- Stack:
  - Astro (en güncel kararlı sürüm, statik çıktı)
  - TypeScript strict
  - Vanilla CSS
  - Minimum vanilla TS island'lar
  - React/Vue/Svelte yalnızca kaçınılmazsa (varsayılan: yok)

## 3. Hosting ve güncelleme

### 3.1 Ana host: Cloudflare Pages (ücretsiz plan)
Gerekçe: Netlify'ın kredi tabanlı ücretsiz planında production deploy, bant genişliği ve web istekleri, team genelinde tek bir ortak aylık kredi havuzundan düşer. Trafik alan reklam gelirli bir site bu havuzu tüketip team'deki tüm projeleri durdurabilir.

### 3.2 Doğrulanacaklar (Faz 0)
- Cloudflare Pages ücretsiz planı: aylık build limiti, deploy başına maksimum dosya sayısı, bant genişliği/istek ölçümü.
- Üretilecek toplam dosya sayısı limite sığmalı. Sığmıyorsa raporla.

### 3.3 Güncelleme akışı
- GitHub Actions, TCMB iş günlerinde veri EVDS'de yayımlandıktan sonra (saatini doğrula) çalışır: `data:update` → `data:validate` → `test`.
- Yalnızca veri değiştiyse commit atar. Commit, Pages build'ini tetikler.
- Limitler günlük build'e izin vermezse haftalığa düş ve raporla.
- `dist/` tamamen statik ve taşınabilir kalır. Çekirdek mantıkta hosta özgü runtime özelliği kullanılmaz.
- Yönlendirme ve başlıklar `_redirects` / `_headers` dosyalarıyla yapılır.
- www → apex yönlendirmesi owner'ın Cloudflare panelinden yapacağı iştir; README'de talimat olarak yer alır.

## 4. Veri

### 4.1 Kaynak
- Tek kaynak: **TCMB Elektronik Veri Dağıtım Sistemi (EVDS).**
- Seriler: USD, EUR, GBP için Döviz Alış, Döviz Satış; mevcutsa Efektif Alış ve Efektif Satış.
- Seri kodları asla tahmin edilmez ve internetteki eski örneklerden kopyalanmaz. Faz 0'da resmi metadata'dan doğrulanır ve `src/config/evds-series.ts` dosyasına yazılır.

### 4.2 Kullanım uyumu (izin kapısı YOK)
EVDS Kullanım Şartları, verilerin kaynak gösterilerek üçüncü kişilerce kullanılabileceğini ve yayımlanabileceğini söyler. Ticari amaçla başka bir üründe kullanıldığında da bunun ürünün kullanıcılarına ek ücret olarak yansıtılmaması gerektiğini belirtir. Owner ayrıca yazılı izin istemeyecektir. İzin kapısı, `EVDS_COMMERCIAL_USE_STATUS` benzeri bir bayrak ya da reklamı izne bağlayan bir mekanizma KURULMAZ.

Bunun yerine şu kurallar zorunludur:
- EVDS verisi içeren her sayfada, araç sonucunda, grafikte ve indirilebilir dosyada görünür kaynak gösterimi: "Kaynak: Türkiye Cumhuriyet Merkez Bankası (TCMB), Elektronik Veri Dağıtım Sistemi (EVDS)."
- Site tamamen ücretsiz kalır. Veriye bağlı herhangi bir ücretli özellik yapılandırılırsa production build başarısız olur.
- TCMB onayı ima eden ifade yasak: "TCMB onaylı", "TCMB tarafından doğrulanmış", "resmî TCMB sitesi", "TCMB partneri". TCMB logosu kullanılmaz, TCMB sitesinin tasarımı kopyalanmaz.
- Kısa ve sakin bir "yatırım tavsiyesi değildir" notu bulunur.
- İleride Türkçe dışında bir sürüm eklenirse, çevirilerin resmi TCMB çevirisi olmadığı belirtilir.
- `docs/data-usage/` klasöründe EVDS kullanım şartlarının ve TCMB genel internet sitesi kullanım şartlarının tarihli metin kopyası ile kısa bir yorum notu tutulur. README, bunların 6 ayda bir ve iş modeli değişmeden önce yeniden kontrol edilmesini hatırlatır.
- Provider soyutlaması korunur. Şartlar değişirse ya da itiraz gelirse, site tasarım değişmeden alternatif bir kaynağa (ör. ECB referans kurları) geçebilmelidir. Alternatif kaynak kendi adıyla etiketlenir, asla TCMB olarak sunulmaz.

### 4.3 Provider soyutlaması
- Klasör: `src/lib/providers/` (`provider.ts`, `evds.ts`, `types.ts`).
- Merkezi seri kaydı: `src/config/evds-series.ts`.
- EVDS URL'leri ve seri kodları kod tabanına dağıtılmaz. EVDS değişirse yalnızca provider ve registry değişir.
- Sayfalar ve hesaplamalar ham EVDS alan adlarına bağımlı olmaz.

### 4.4 API anahtarı güvenliği
- `EVDS_API_KEY` yalnızca yerel `.env` dosyasında ve GitHub Secrets'ta durur.
- `PUBLIC_` önekiyle tanımlanmaz, `public/` klasörüne, HTML'e, istemci paketine, loglara ya da repoya girmez.
- Ziyaretçiler EVDS'ye hiçbir zaman istek atmaz. Sayfa görüntülenirken EVDS çağrısı YOK.
- Build, anahtar içeren bir çıktı tespit ederse başarısız olur.

### 4.5 Veri hattı
- Akış: EVDS → update script → doğrulama → normalizasyon → yerel veri → istatistik üretimi → Astro build → CDN.
- Build, EVDS'ye istek atmaz. Yalnızca yerel dosyaları okur.
- Komutlar:
  - `npm run data:discover`: seri kodları, etiketler, birimler, frekans, ilk/son gözlem, gözlem sayısı; config ile metadata uyuşmazsa hata verir.
  - `npm run data:update`: yalnızca eksik/yeni gözlemleri çeker; `-- --full` ile bilinçli tam yenileme yapar.
  - `npm run data:validate`: kapsam, eksik günler, duplikeler, geçersiz gözlemler, en son tarih.
  - `npm run data:stats`: türetilmiş istatistikleri üretir.
- `data:update` akışı: mevcut kapsamı oku → en son başarılı gözlemi bul → eksik aralığı iste → doğrula → normalize et → birleştir → revizyonları tespit et → etkilenen toplamları yeniden hesapla → dosyaları atomik yaz → değişiklik özeti bas.
- EVDS'ye kibar istek at: düşük eşzamanlılık, üstel geri çekilmeyle yeniden deneme.

### 4.6 Normalize model ve depolama
Gözlem tipi (kavramsal):

```
date, currency,
forexBuying?, forexSelling?, cashBuying?, cashSelling?   // decimal string + sayısal karşılık
rawValues (kaynaktaki metin, birebir), unit,
source: "TCMB_EVDS", sourceSeries {…}, fetchedAt, rawChecksum,
normalization? { reason: "2005_redenomination", factor }
```

Kurallar:
- Hassasiyet: kaynaktaki hassasiyet korunur. Hesaplamalarda decimal yaklaşımı kullanılır. Yuvarlama yalnızca gösterimde yapılır ve kuralı dokümante edilir. Kaynaktan fazla hassasiyet uydurulmaz.
- Depolama:
  - `data/normalized/YYYY.json` (yıllara bölünmüş; geçmiş yıllar sabit kalır, yalnızca içinde bulunulan yıl yeniden yazılır)
  - `data/aggregate/` (aylık ve yıllık toplamlar)
  - `data/metadata/coverage.json`, `series.json`, `revisions.json`
- Tarayıcıya büyük veri gönderilmez. Araçlar yalnızca gereken yılın küçük JSON parçasını lazy load eder.
- Revizyon: daha önce saklanmış bir gözlem kaynakta değişmişse, eski değer, yeni değer ve tespit tarihi kaydedilir ve raporlanır. Sessizce üzerine yazılmaz.
- Hata güvenliği: EVDS erişilemezse mevcut veri silinmez, boş veya sıfır yazılmaz. Güvenli şekilde durulur ve teşhis bilgisi basılır.
- Doğrulama: geçersiz tarih, sayısal olmayan değer, negatif değer, beklenmeyen sıfır, duplike tarih/para birimi, bilinmeyen alan, beklenmeyen birim ve şema değişikliği reddedilir ya da bayraklanır. Şüpheli veri otomatik "tamir edilmez".

### 4.7 Faz 0'da gerçek veriyle cevaplanacak kritik sorular
- **2005 para reformu:** 1 Ocak 2005'te 1 YTL = 1.000.000 TL oldu. EVDS serilerinde 2005 öncesi değerler eski TL cinsinden mi, yoksa yeniden ölçeklenmiş mi?
  - Eski TL ise: ham değer aynen saklanır, normalize değer büyüklüğe göre değil TARİHE göre dönüştürülür.
  - 2005 öncesi her sayfada kısa not yer alır: "Değerler 2005 para reformuna göre yeni TL'ye Döviz Arşiv tarafından çevrilmiştir. Orijinal değer: …" + metodoloji linki.
  - Test: 2004-12-31 → 2005-01-03 geçişinde normalize seri süreklidir.
- **Tarih konvansiyonu:** Bir EVDS gözleminin tarihi hangi TCMB bülten tarihine karşılık geliyor? Bulguyu `/metodoloji/` sayfasında açıkla. Muhasebe, vergi, gümrük veya sözleşmede hangi günün kurunun kullanılması gerektiğine dair hukuki/vergisel iddia KURMA; kullanıcıya ilgili kuralları kontrol etmesini söyle.
- **Kapsam:** Başlangıç yılı sabit kodlanmaz. Her serinin gerçek kapsamı veriden belirlenir ve "Arşiv kapsamı: YYYY–YYYY" olarak gösterilir.
- **Seri değişiklikleri:** EVDS'de arşiv/eski seriler varsa, tanım, birim ve metodoloji kontrol edilmeden birleştirilmez. Sahte kesintisiz tarihçe üretilmez.
- **Efektif kurlar:** Döviz alış/satıştan ayrı tutulur, alanlar birleştirilmez. Kapsamları farklıysa ayrı gösterilir.

### 4.8 Kapsam
- Lansman para birimleri: USD, EUR, GBP.
- CHF, JPY ve diğerleri yalnızca veri doğrulanıp talep ve sayfa kalitesi desteklerse, sonradan ve owner onayıyla eklenir.
- Altın, kripto ve enflasyon ilk sürümde YOK.

## 5. Terminoloji ve hesaplama mantığı

- Etiketler: "Döviz Alış", "Döviz Satış", "Efektif Alış", "Efektif Satış". Her birinin kısa bir açıklaması bulunur.
- TCMB kurlarının gösterge niteliğinde olduğu ve banka/döviz bürosu işlem fiyatlarından farklı olabileceği belirtilir. "Canlı", "gerçek işlem fiyatı", "piyasadaki en iyi fiyat" gibi ifadeler kullanılmaz.
- Hesaplayıcı varsayılanları:
  - TL → döviz dönüşümünde Döviz Satış.
  - Döviz → TL dönüşümünde Döviz Alış.
  - Kullanıcı kur türünü değiştirebilir. Kullanılan kur her zaman görünür.
- İstatistik tanımları:
  - Aylık/yıllık ortalama, mevcut TCMB gözlemlerinin aritmetik ortalamasıdır.
  - Hafta sonları interpolasyonla doldurulmaz. Gözlem olmayan günler sıfır sayılmaz.
- Yüzde değişim: `((yeni − eski) / eski) × 100`. Eksik önceki gözlem, sıfır payda ve geçersiz tarih güvenle ele alınır.
- Döviz Arşiv'in hesapladığı her değer (ortalama, değişim, yüzde, normalize değer) "Döviz Arşiv hesaplaması" olarak etiketlenir. TCMB yayımlamış gibi sunulmaz.
- İstenen takvim tarihi ile gerçek gözlem tarihi her zaman ayrı gösterilir.

## 6. Bilgi mimarisi ve sayfalar

### 6.1 URL kuralları
- Trailing slash her zaman (`/dolar/2020/`), küçük harf, ISO sayısal tarih ve ay.
- Her indekslenebilir sayfanın kendini gösteren canonical'ı olur. Tek host: `https://dovizarsiv.net`.
- Query string ile oluşan indekslenebilir sayfa yoktur. Formlar canonical URL'ye yönlendirir.

### 6.2 Arama niyeti → tek canonical sayfa (kanibalizasyon yasağı)

| Niyet | Canonical sayfa |
|---|---|
| "15 Ocak 2020 dolar / euro / sterlin kuru" | `/tarih/2020-01-15/` (tek sayfa, tüm para birimleri) |
| "Ocak 2020 dolar kuru" | `/dolar/2020/01/` |
| "2020 dolar kuru", "2020 dolar ortalaması" | `/dolar/2020/` |
| "dolar kuru arşivi", "geçmiş dolar kuru" | `/dolar/` |
| "geçmiş döviz kuru hesaplama" | `/hesaplama/gecmis-doviz/` |
| "iki tarih arası kur değişimi" | `/hesaplama/kur-degisimi/` |

Para birimi başına ayrı gün sayfası (`/dolar/2020/01/15/`) ve alternatif slug'lar (`/15-ocak-2020-dolar-kuru/`) ÜRETİLMEZ. Niyet eşlemesi `docs/seo-intent-map.md` dosyasında tutulur.

### 6.3 Ana sayfa `/`
- İlk mobil ekran: marka, H1 "Geçmiş Döviz Kurlarına Hızlıca Ulaşın", tek cümlelik açıklama, büyük tarih seçici ve "Kuru Göster" butonu. Dekoratif hero görseli yok.
- Altında sırasıyla:
  - Dolar, Euro ve Sterlin arşivi kısayolları.
  - "Son yayımlanan TCMB döviz kurları": üç para birimi için alış/satış ve veri tarihi. "Canlı" kelimesi kullanılmaz.
  - "Bugün tarihte": 1, 5, 10 ve 20 yıl önce bu tarih (ya da en yakın önceki gözlem).
  - Yıl kısayolları, araç tanıtımı, rehberler, kaynak/güven bloğu.

### 6.4 Para birimi hub'ı `/dolar/`, `/euro/`, `/sterlin/`
- H1: "Dolar Kuru Arşivi".
- İçerik:
  - Son kayıtlı alış/satış değerleri ve arşiv kapsamı.
  - Tarih seçici.
  - Onlu yıllara gruplanmış yıl navigasyonu.
  - Uzun vadeli SVG grafik.
  - Yıllık özet tablosu ve son 30 gözlem.
  - Tüm zamanların en yüksek değerleri ve en sert günlük hareketler (Döviz Arşiv hesaplaması olarak etiketli).
  - Hesaplayıcı kısayolu, metodoloji linki, kaynak kutusu.
  - CSV indirme: kaynak gösterimi dosyanın içinde de bulunur.
- Sitenin en güçlü sayfalarından biri olmalı.

### 6.5 Yıl sayfası `/dolar/2020/`
- H1: "2020 Dolar Kuru Arşivi".
- Açılış özeti: alış ve satış için ayrı ayrı ilk ve son gözlem, ortalama, en düşük ve en yüksek (tarihleriyle), ilk→son yüzde değişim, gözlem sayısı.
- 12 aylık tablo: Ay, Ortalama Alış, Ortalama Satış, En Düşük, En Yüksek, Ay Sonu Satış, Aylık Değişim. Her satır ay sayfasına linklidir.
- Yıl grafiği, en sert 5 yükseliş ve 5 düşüş günü, önceki/sonraki yıl linkleri.

### 6.6 Ay sayfası `/dolar/2020/01/`
- H1: "Ocak 2020 Dolar Kuru".
- Ay özeti: ilk, son, ortalama, en düşük, en yüksek, değişim, yayımlanan gözlem sayısı.
- Günlük tablo: tarih, alış, satış, günlük değişim. Her gözlem gün sayfasına linklidir.
- Gözlem olmayan günler tabloda "TCMB kuru yayımlanmadı (hafta sonu/tatil)" olarak görünür. Hafta sonu aramalarının cevabı burasıdır.
- SVG grafik, önceki/sonraki ay, üst yıl sayfası.

### 6.7 Gün sayfası `/tarih/2020-01-15/`
- Yalnızca TCMB gözlemi olan günler için üretilir. Geçersiz tarihler (`/tarih/2020-02-31/`) gerçek 404 döner.
- Gözlem olmayan günler: sayfa yok. Tarih seçici kullanıcıyı en yakın önceki gözlem sayfasına `?istenen=YYYY-MM-DD` parametresiyle yönlendirir. Sayfanın canonical'ı parametresiz URL'dir. Küçük bir script, "Seçtiğiniz tarihte yeni TCMB kuru yayımlanmadı; önceki yayımlanan kur: …" bandını gösterir.
- Title: "15 Ocak 2020 Döviz Kurları | Döviz Arşiv". H1 aynı.
- İçerik:
  - Açılış bloğu: 2–4 cümle, tamamen o günün verisinden.
  - Ana tablo: para birimi, döviz alış, döviz satış, önceki gözleme göre değişim. Ayrı bölümde, varsa efektif kurlar.
  - Her para birimi için H2 bölümü ("15 Ocak 2020 Dolar Kuru" vb.): alış/satış, önceki gözlem tarihi ve değeri, değişim, ay ortalamasına ve ayın en düşük/en yüksek değerine göre konum, yıl başından beri değişim. Tamamen veriden üretilir.
  - Hazır hesaplar (statik HTML): 100 / 1.000 / 10.000 TL kaç USD/EUR/GBP eder; 1 / 100 / 1.000 döviz kaç TL eder. Kullanılan kur türü belirtilir.
  - Özel tutar için küçük hesaplayıcı island'ı.
  - Navigasyon: önceki/sonraki gerçek gözlem (takvim günü değil), "Yakın Tarihler" (önceki 5 / sonraki 5 gözlem), "Aynı günün diğer yılları" (yalnızca geçerli linkler), ay ve yıl sayfaları, para birimi hub'ları, araçlar.
- Otomatik ekonomik sebep yorumu ("siyasi gelişmeler nedeniyle yükseldi" vb.) ASLA üretilmez.

### 6.8 Tarih arşivi `/tarih-arsivi/`
- Yıl → ay → gözlem günleri hiyerarşisi.
- Tek sayfaya binlerce link dökülmez. Yıl başına alt sayfa ya da ay takvimi grid'i kullanılır.

### 6.9 Araçlar (Astro island'ları, küçük lazy-loaded JSON parçalarıyla)
- **`/hesaplama/gecmis-doviz/`:** tarih, tutar, kaynak para birimi, hedef para birimi, kur türü. Sonuçta seçilen tarih, gerçek gözlem tarihi, kur türü, kullanılan kur, formül, sonuç ve kaynak gösterilir. Uyarı: "Bu hesaplama TCMB gösterge niteliğindeki kurlarla bilgi amaçlıdır; banka, döviz bürosu veya kart işlemlerindeki kur farklı olabilir."
- **`/hesaplama/kur-degisimi/`:** para birimi, kur türü, başlangıç ve bitiş tarihi. Sonuçta başlangıç ve bitiş gözlemleri, mutlak ve yüzde fark, takvim günü sayısı, basit grafik. "Yatırım getirisi" değil "kur değişimi" dili kullanılır.
- **`/karsilastir/`:** seçilen yıllar ve para birimleri için ortalama, en düşük, en yüksek ve yıl sonu değerleri. Etkileşim durumu indekslenebilir URL üretmez (crawl trap yok).

### 6.10 Rehber `/rehber/`
- 10 kaliteli yazı, insan incelemesine hazır taslak olarak. Konular:
  1. Döviz kuru nedir?
  2. TCMB döviz kuru nedir?
  3. Döviz alış ve satış kuru arasındaki fark nedir?
  4. Efektif alış ve efektif satış nedir?
  5. TCMB gösterge niteliğindeki kurlar ne anlama gelir?
  6. Geçmiş döviz kuru nasıl bulunur?
  7. Hafta sonunda TCMB kuru neden yayımlanmaz?
  8. Geçmiş dolar kuru nasıl hesaplanır?
  9. Kurda yüzde değişim nasıl hesaplanır?
  10. 2005 para reformu ve eski TL.
- Her yazı ilgili arşiv ve araç sayfalarına doğal linkler verir.
- Yüzlerce yazı üretilmez. Doğrulanamayan olgu yazılmaz. İddialar resmi kaynaklara linklenir.

### 6.11 Güven ve yasal sayfalar
- `/metodoloji/`: veri kaynağı, seri seçimi, alış/satış/efektif, tarih konvansiyonu, hafta sonu/tatil, ortalama ve yüzde formülleri, yuvarlama, 2005 dönüşümü, revizyonlar, hesaplayıcı mantığı, sınırlılıklar.
- `/veri-kaynaklari/`: TCMB EVDS, aktif seriler, kapsam, kullanım şartlarına link, "Döviz Arşiv verileri yeniden düzenler ve istatistik hesaplar; hesaplanan değerleri TCMB yayımlamamıştır" açıklaması, "şartlar kaynak kuruluşça değiştirilebilir" notu.
- `/hakkimizda/`: bağımsız bir bilgi platformu olduğu; TCMB, banka veya yatırım kuruluşu olmadığı.
- `/iletisim/`, `/gizlilik/` (KVKK), `/cerez-politikasi/`, `/kullanim-kosullari/`, `/reklam-politikasi/`. Anlamsız hazır şablon metin kullanılmaz; site gerçekte ne yapıyorsa o anlatılır.
- Yayıncı adı ve iletişim e-postası `src/config/site.ts` dosyasından gelir. İsim, uzman, editör kurulu, ödül veya basın logosu UYDURULMAZ. Production build'de bu alanlar boşsa build başarısız olur. Ziyaretçiye görünür yer tutucu çıkmaz.

### 6.12 404
Tarih seçici ve Dolar/Euro/Sterlin arşivi ile ana sayfa linkleri. Reklam yok.

## 7. İçerik kuralları

### 7.1 Programatik metin
- Cümleler veri durumuna göre dallanır: yükseliş/düşüş/yatay, rekor/sıradan, seri başlangıcı/devamı, ay içi konum.
- Farklılık eş anlamlı kelimeyle değil, farklı veri gerçekleriyle sağlanır. Anlamlı veri içermeyen cümle basılmaz.
- İyi örnek: "15 Ocak 2020'de TCMB USD döviz satış kuru X TL'dir. Bir önceki gözlem olan 14 Ocak 2020'de Y TL idi; değişim %Z. Bu değer Ocak 2020 ortalamasının %W üzerindedir."
- Kötü örnek (asla üretme): "15 Ocak 2020 dolar kuru hakkında en güncel bilgilere sitemizden ulaşabilirsiniz."
- Genel açıklama paragrafları sayfalara kopyalanmaz. Kısa bir satır ve rehber linki yeterlidir.

### 7.2 Diğer kurallar
- Sahte tazelik yok. Tarihsel sayfalarda "bugün güncellendi" yazmaz. "Veri tarihi" ve "kaynak gözlem tarihi" ifadeleri kullanılır.
- Kaynak kutusu her veri sayfasında: veri kaynağı, veri türü, hesaplama notu, metodoloji linki.
- Hareket gösterimi: ▲ %1,24 / ▼ %0,73. Renk tek başına anlam taşımaz.
- Biçimler:
  - Sayılar: `Intl.NumberFormat('tr-TR')`.
  - Görünen tarih: "15 Ocak 2020, Çarşamba".
  - Makine tarihi: `<time datetime="2020-01-15">`.
  - Belirsiz formatlar (01/02/2020) kullanılmaz.
- Title kalıpları:
  - "15 Ocak 2020 Döviz Kurları | Döviz Arşiv"
  - "Ocak 2020 Dolar Kuru | Döviz Arşiv"
  - "2020 Dolar Kuru Arşivi | Döviz Arşiv"
  - "Dolar Kuru Arşivi | Döviz Arşiv"
  - "Geçmiş Döviz Kuru Hesaplama | Döviz Arşiv"
- Description görünür içerikten üretilir. "En doğru", "1 numara", "kesin", "SEO garantili" gibi iddialar kullanılmaz.

## 8. Teknik SEO

- Merkezi SEO layout'u: title, description, canonical, robots, OG. Sayfalar metadata'yı elle tekrar yazmaz.
- `isIndexablePage(pageData)` fonksiyonu şunları kontrol eder: geçerli gözlem var mı, anlamlı istatistik var mı, canonical mı, duplike değil mi, kaynak gösterimi var mı, gerçek bir niyeti karşılıyor mu. Geçemeyen sayfa `noindex,follow` alır ve sitemap'e girmez.
- Sitemap index, türe göre bölünür: pages, guides, currencies, years, months, dates-YYYY. Yalnızca canonical, indekslenebilir, 200 dönen URL'ler girer.
- `lastmod` yalnızca kaynak revizyonu ya da anlamlı içerik/metodoloji değişikliğinde değişir. Build tarihi değildir.
- **Kademeli indeksleme:** lansmanda hub, yıl, ay, araç, rehber ve güven sayfalarının sitemap'leri gönderilir. Gün sitemap'leri birkaç hafta içinde, en yeni yıldan başlayarak yıl yıl eklenir. Gün sayfaları baştan erişilebilir ve linklidir; yalnızca sitemap'e girişleri kademelidir. Takvim `docs/indexing-rollout.md` dosyasında tutulur.
- `robots.txt` sade olur ve sitemap index'i gösterir. noindex sayfalar robots.txt'de engellenmez.
- Structured data (görünür içerikle birebir uyumlu, tipli yardımcılarla üretilir):
  - WebSite ve Organization (site.ts'den).
  - Tüm sayfalarda BreadcrumbList.
  - Rehberlerde Article.
  - Hub ve yıl sayfalarında Dataset (Google Dataset Search yönergelerine uygun; creator/source, license notu, temporalCoverage, CSV distribution).
  - FAQPage, Review, AggregateRating, Product, NewsArticle kullanılmaz.
- Görünür breadcrumb. Tüm gezinme HTML anchor ile yapılır (JS-only navigasyon yok). Hiçbir sayfa yetim kalmaz.
- İç link zinciri: arama → gün sayfası → ay → yıl → hub → araçlar. Yapay sayfalama yapılmaz.
- Kritik içerik (H1, değerler, tablolar, kaynak, istatistikler, breadcrumb, linkler) build HTML'inde bulunur.
- OG görseli: sayfa türü başına statik görsel. favicon, SVG ikon, apple-touch-icon, webmanifest.
- `_headers`: X-Content-Type-Options, Referrer-Policy, Permissions-Policy. CSP, AdSense açıldığında bozulmayacak şekilde yapılandırılabilir tutulur. Gerekli alan adları dokümante edilir.
- Hashlenmiş asset'ler immutable cache alır. Tarihsel HTML güçlü cache alır.

## 9. Tasarım, performans, erişilebilirlik

- **Görsel dil:** güven, sadelik, veri odaklılık. Kripto borsası, trading terminali, haber portalı, kumarhane ya da jenerik AI landing page görüntüsü olmaz.
- **Renkler:** açık tema önce; kırık beyaz zemin, lacivert/arduvaz metin, yumuşak gri çizgiler, bağlantılarda sakin mavi. Yeşil/kırmızı yalnızca sayısal hareket için. Koyu tema `prefers-color-scheme` ile desteklenir.
- **Tipografi:** sistem font yığını; tablolarda `font-variant-numeric: tabular-nums`; sayısal sütunlar sağa hizalı.
- **Tasarım token'ları:** boşluk, font boyutu, çizgi, köşe yarıçapı, konteyner ve içerik genişliği, focus stilleri değişken olarak tanımlanır. Rastgele değerler kullanılmaz.
- **Logo:** ağırlıklı tipografik. Kripto çağrışımı yok.
- **Header:** masaüstünde Dolar, Euro, Sterlin, Tarih Arşivi, Hesaplama, Rehber. Mobilde sade, erişilebilir menü. Mega menü yok.
- **Footer:** Arşiv, Araçlar, Bilgi ve Döviz Arşiv grupları; kısa kaynak gösterimi ve feragat notu.
- **Mobil öncelikli:** 360, 375, 390, 412, 768, 1024 ve 1440 px genişliklerde sayfa gövdesi yatay taşmaz. Tablolar kendi kapsayıcısında kayar ve ilk sütun sabit kalır. Semantik tablo yapısı korunur (caption, thead, th scope).
- **Performans hedefleri** (mobil, reklam slotları dahil): LCP < 2,0 sn, INP < 200 ms, CLS < 0,05.
- **JS kısıtları:** JS yalnızca tarih seçici, hesaplayıcılar, mobil menü ve küçük kolaylıklarda kullanılır. Statik içerik hydrate edilmez.
- **Grafikler:** build'de SVG. Her grafiğin başlığı ve metin özeti olur; verisi tablo olarak da bulunur.
- **Asset kısıtları:** hero fotoğrafı, stok görsel, video, autoplay ve büyük ikon kütüphanesi yok.
- **Erişilebilirlik (WCAG 2.2 AA hedefi):** klavyeyle gezinme, görünür focus, etiketli form alanları, yeterli kontrast, hesaplama sonucunun ekran okuyucuya duyurulması (`aria-live`), yeterli dokunma alanı, `prefers-reduced-motion` desteği.
- **Kolaylıklar:**
  - Paylaş: Web Share API, yoksa URL kopyalama.
  - Baskı CSS'i: tarih, kurlar, hesap ve kaynak kalır; navigasyon ve reklamlar gizlenir.
  - localStorage (try/catch ile): son seçilen para birimi ve son bakılan tarihler.

## 10. Reklam, onay yönetimi, ölçüm

- AdSlot bileşeni. `PUBLIC_ADSENSE_ENABLED=false` iken AdSense script'i hiç yüklenmez ve ziyaretçiye sahte reklam kutusu gösterilmez.
- Reklamlar açıldığında:
  - Sabit yükseklik rezerve edilir (CLS olmaz).
  - Masaüstü konumları: birincil veri bölümünden sonra, grafik/istatistik bölümünden sonra, geniş ekranda sağ kolon, alt içerik.
  - Mobilde daha az slot.
  - Tarih seçici, hesapla butonu, önceki/sonraki gezinme ve tablo kontrollerinin yakınına reklam konmaz.
  - Reklam navigasyon ya da içerik butonu gibi görünmez.
  - 404, boş durumlar ve yönlendirme ekranlarında reklam yok.
  - İçerik her zaman reklamdan baskındır.
- `ads.txt`: sahte publisher ID yazılmaz. README'de kurulum talimatı bulunur.
- **Onay yönetimi:** AB/AEA/İngiltere/İsviçre trafiği için Google sertifikalı CMP (Google'ın ücretsiz Privacy & messaging çözümü) ve Consent Mode v2 entegrasyon noktaları. Türkiye için KVKK uyumlu çerez bilgilendirmesi. Ev yapımı sahte "uyumlu" banner yapılmaz.
- **Ölçüm:** Search Console (DNS doğrulama, README'de adım adım). Analitik varsayılan olarak kapalıdır (`PUBLIC_ANALYTICS_ENABLED=false`); Cloudflare Web Analytics ve GA4 + consent seçenekleri artı/eksileriyle dokümante edilir. Meta Pixel, Hotjar ve Clarity eklenmez.
- **Manipülatif UX yasak:** zorla yenileme, slayt sayfalama, sahte indirme butonu, veriden önce interstitial, geri sayım, push bildirimi spam'i.
- Site metinlerinde "AdSense onaylı", "Google doğrulanmış" gibi ifadeler kullanılmaz.

## 11. Kalite kapıları

### 11.1 `npm run seo:validate` (build sonrası)
Kontroller:
- Eksik veya duplike title/description.
- Eksik veya duplike canonical.
- Birden fazla H1.
- Sitemap'teki noindex URL; sitemap'te olmayan indekslenebilir URL.
- Kaynak gösterimi olmayan veri sayfası.
- Hatalı structured data.
Ciddi hatada build başarısız olur.

### 11.2 `npm run links:check`
Tüm iç linkler ve yetim sayfa kontrolü; özellikle önceki/sonraki gözlem, ay, yıl ve ilgili tarih linkleri.

### 11.3 `npm run test` (birim testleri)
- EVDS normalizasyonu, decimal ayrıştırma.
- 2005 dönüşümü ve sürekliliği.
- Alış/satış/efektif alanlarının ayrı tutulması.
- Gözlemsiz gün mantığı, önceki/sonraki gerçek gözlem.
- Aylık/yıllık ortalama, en düşük, en yüksek, yüzde değişim.
- Hesaplayıcı mantığı.
- Programatik metin motorunun dalları.
- `isIndexablePage`, canonical yardımcıları.
- tr-TR sayı ve tarih biçimleyicileri.
Test fixture'ları küçük mock EVDS yanıtları kullanabilir. Production'da mock veri asla kullanılmaz; veri yoksa "veri yok" denir.

### 11.4 E2E smoke testleri
Ana sayfa, tarih arama ve gözlemsiz gün yönlendirmesi, geçerli gün sayfası, geçersiz tarihte 404, hub/yıl/ay sayfaları, hesaplayıcı doğruluğu, mobil menü, yasal sayfalar.

### 11.5 Manuel kontrol sayfaları (mobil + masaüstü)
`/`, `/dolar/`, `/dolar/2020/`, `/dolar/2020/01/`, `/euro/`, `/sterlin/`, `/tarih/2020-01-15/`, 2005 öncesi bir gün sayfası, `/tarih-arsivi/`, `/hesaplama/gecmis-doviz/`, `/hesaplama/kur-degisimi/`, `/karsilastir/`, `/rehber/`, `/metodoloji/`, `/veri-kaynaklari/`, yasal sayfalar, 404.

### 11.6 Veri doğrulaması
- Lansmandan önce farklı yıllardan en az 10 rastgele tarih için USD/EUR/GBP alış ve satış değerleri EVDS ile birebir karşılaştırılır.
- Birkaç aylık/yıllık ortalama, en düşük/en yüksek ve yüzde değişim bağımsız olarak yeniden hesaplanır.
- Eşleşme olmadan lansman yapılmaz.

### 11.7 Build'i başarısız kılan durumlar
- Veriye bağlı ücretli bir özellik yapılandırılmış olması.
- İndekslenebilir veri sayfasında kaynak gösteriminin eksik olması.
- Geçersiz canonical ya da duplike route.
- Kritik kırık iç link.
- Etkin bir para birimi için verinin eksik olması.
- Geçersiz kur değeri.
- Production'da mock veri.
- Çıktıda API anahtarı bulunması.
- `site.ts` içindeki yayıncı adı veya iletişim bilgisinin boş olması.

## 12. Repo yapısı ve ortam

Önerilen klasör yapısı (Faz 0'da kesinleşir):

```
src/components  src/layouts  src/pages  src/styles  src/content
src/lib/{providers,calculations,seo,data,formatting,text}
src/config/{site.ts,evds-series.ts}
data/{normalized,aggregate,metadata}
scripts/{data,seo,validation}
docs/{SPEC.md,DECISIONS.md,HANDOFF.md,seo-intent-map.md,indexing-rollout.md,data-usage/}
tests/  public/
```

`.env.example`:

```
SITE_URL=https://dovizarsiv.net
EVDS_API_KEY=
PUBLIC_ADSENSE_ENABLED=false
PUBLIC_ADSENSE_CLIENT=
PUBLIC_ADSENSE_SLOT_PRIMARY=
PUBLIC_ADSENSE_SLOT_SECONDARY=
PUBLIC_ADSENSE_SLOT_SIDEBAR=
PUBLIC_ANALYTICS_ENABLED=false
```

Gerçek sırlar asla commit edilmez.

README şunları kapsar: amaç, mimari, kurulum, EVDS anahtarı, seri keşfi, veri güncelleme ve doğrulama, geliştirme, build, Cloudflare Pages deploy'u ve www yönlendirmesi, veri kullanım uyumu ve 6 aylık kontrol, AdSense/CMP/ads.txt aktivasyonu, Search Console, kademeli indeksleme, para birimi ve rehber ekleme, sorun giderme.

## 13. Lansman sonrası (owner onayıyla)
- Search Console verisine göre genişleme: hangi sayfa türlerinin indekslendiği ve gösterim aldığı raporlanır; zayıf türler iyileştirilir ya da noindex'e alınır.
- Ek para birimleri, ek araçlar, iyi araştırılmış rehberler.
- Enflasyon ve altın bağlamı yalnızca ayrı veri/lisans değerlendirmesinden sonra.
- Reklam aktivasyonu:
  1. AdSense başvurusu ve gerçek publisher ID.
  2. ads.txt.
  3. CMP kurulumu.
  4. Az sayıda slotla başlama.
  5. Core Web Vitals ölçümü.
  6. Deneyim bozulmadıkça reklam sayısını artırmama.
