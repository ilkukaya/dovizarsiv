# Rehber ve yasal sayfalar: insan incelemesi listesi

Rehber yazıları (`src/content/guides/*.md`) ve yasal sayfalar **incelemeye hazır taslaktır**; yayımlanmadan önce bir insan okumalıdır.
Bu belge, her yazının hangi olguya dayandığını ve bilerek **yazılmayan** olguları listeler. Kural: doğrulanamayan olgu yazılmaz.
Geliştirme ortamı `tcmb.gov.tr` ve Resmî Gazete'ye erişemez; bu yüzden yazılardaki olgular yalnızca aşağıdaki iç kaynaklardan gelir.

## Dayanak kaynaklar (repo içi, Faz 0–1'de resmî kaynaktan doğrulanmış)

| Kısa ad | İçerik | Yer |
|---|---|---|
| EVDS notu | "Bir önceki iş günü saat 15:30'da belirlenen gösterge niteliğindeki TCMB Döviz Alış ve Döviz Satış Kurlarıdır. Belirlendiği günden bir sonraki gün Resmi Gazete'de yayımlanmaktadır." (EVDS "Döviz Kurları" veri grubu açıklaması; efektif için aynı ifade) | DECISIONS D-006 |
| TCMB bültenleri | 73 tarihte (hafta sonu, tatil, arife, bayram, yılbaşı dahil) EVDS ↔ TCMB günlük kur bülteni birebir eşleşmesi | DECISIONS D-012 |
| 2005 | Arşiv serileri 2005 öncesini eski TL, `.YTL` serileri 1.000.000'a bölünmüş verir; 31.12.2004 bülteni 1.336.300 = 1,3363 YTL | DECISIONS D-005, D-006 |
| Kapsam | USD/GBP döviz 1950, EUR döviz 31.12.1998, USD/GBP efektif 29.12.1989, EUR efektif 31.12.2001 (belirlenme günü) | DECISIONS D-004, D-014 |
| Veri | Örneklerdeki tüm kurlar `data/normalized`'dan; 15.01.2020 değerleri bültenle doğrulanmış | data/ |

## Yazı bazında olgular

| Yazı | Kritik olgular ve kaynağı |
|---|---|
| 1 doviz-kuru-nedir | Tanım (genel); 15.01.2020 USD alış 5,8827 (bülten); 1÷5,8827 ≈ 0,1700 (hesap) |
| 2 tcmb-doviz-kuru-nedir | EVDS notu (alıntı, birebir); 15.01.2020 kuru EVDS'de 16.01.2020 satırında (D-006 tablosu); kapsam yılları |
| 3 doviz-alis-satis-kuru-farki | Alış/satış tanımı (genel); 15.01.2020 USD 5,8827 / 5,8933; fark 0,0106 (%0,18); 100×5,8827 = 588,27; 1000÷5,8933 = 169,68; 1000÷5,8827 = 169,99 |
| 4 efektif-alis-satis-nedir | EVDS'nin iki ayrı veri grubu (D-004); 15.01.2020 USD efektif 5,8786 / 5,9021; kapsam tarihleri |
| 5 gosterge-niteliginde-kurlar | EVDS notu; "gösterge" yorumu (aşağıdaki not); belirlenme/geçerlilik tarihi farkı |
| 6 gecmis-doviz-kuru-nasil-bulunur | Sitenin kendi davranışı (tarih seçici, 2000 öncesi → ay sayfası, CSV); smoke testiyle doğrulanır |
| 7 hafta-sonu-tcmb-kuru | EVDS notundaki "iş günü"; 12.01.2020 → 10.01.2020 (smoke), 10.01.2020 USD alış 5,8713; arife/tatil bilgisi metodoloji + D-012 |
| 8 gecmis-dolar-kuru-nasil-hesaplanir | Formüller (`convert.ts`); 587,13; 15.06.1999 alış 411.728 eski TL = 0,411728 YTL → 41.172.800 eski TL |
| 9 kurda-yuzde-degisim-nasil-hesaplanir | Formül; 2020 USD satış 5,9585 → 7,4327 (%24,74, fark 1,4742), ters %19,83, 1÷kur değerleri: hepsi Python Decimal ile bağımsız doğrulandı |
| 10 2005-para-reformu-eski-tl | 1 YTL = 1.000.000 eski TL (D-005); 30.12.2004 1.342.100 = 1,3421; 31.12.2004 1.336.300 = 1,3363 |

## Bilerek YAZILMAYAN olgular (doğrulanamadı; isterseniz resmî kaynaktan doğrulayıp ekleyin)

- TCMB'nin gösterge kurları **nasıl hesapladığı** (hangi kurumların kotasyonlarından, hangi yöntemle).
- 2005 para reformunun **yasal dayanağı** (kanun numarası), eski banknotların değişim süresi ve "Yeni" ibaresinin kaldırılması.
- Hangi resmî işlemde (vergi, gümrük, muhasebe, icra) hangi günün kurunun kullanılacağı. Yazılar bunun mevzuata/sözleşmeye bağlı olduğunu söyler, kural vermez.
- Bankaların veya döviz bürolarının kur politikası, hafta sonu kur uygulamaları.
- Kurların **neden** değiştiği. Sitede hiçbir yerde sebep yorumu yoktur.

## İnsan incelemesinde özellikle bakılacaklar

1. **"Gösterge" yorumu (yazı 5):** "Gösterge, kurun bir referans bilgisi olarak yayımlandığını belirtir" cümlesi sözcüğün yorumudur; TCMB'nin resmî tanımıyla karşılaştırın.
2. **Efektif = banknot / döviz = hesaben (yazı 4):** genel piyasa tanımıdır; EVDS'nin kendi tanımı ile uyumlu olduğunu doğrulayın.
3. **Alış/satış tanımı (yazı 3):** "kuruluş sizden alırken / size satarken" yönü.
4. **KVKK (gizlilik):** 6698 sayılı Kanun'a atıf ve hakların özeti genel düzeydedir. Yayıncı veri sorumlusu olarak `site.ts`'e yazıldığında metnin, işletmenin gerçek durumuyla (barındırma, ölçüm, reklam) uyumu hukuki olarak gözden geçirilmelidir.
5. **Barındırma:** gizlilik sayfası "Cloudflare Pages" der. Farklı bir barındırma kullanılırsa güncelleyin.
6. **localStorage:** gizlilik ve çerez sayfaları "son seçilen para birimi, kur türü ve son bakılan tarihler" saklandığını söyler. Bu davranış Faz C'de uygulanır; uygulanmazsa metin düzeltilmelidir.
7. Reklam veya analitik açıldığında **gizlilik, çerez ve reklam politikası** sayfaları güncellenmeden yayına alınmamalıdır.

## Yayıncı bilgisi

`src/config/site.ts` içindeki `publisherName` ve `contactEmail` boş. Boşken hakkımızda/iletişim/gizlilik sayfalarında ilgili satırlar hiç basılmaz (yer tutucu yok); production build bu alanlar dolmadan zaten başarısız olur.
