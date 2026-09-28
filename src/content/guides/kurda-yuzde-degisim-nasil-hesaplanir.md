---
title: "Kurda Yüzde Değişim Nasıl Hesaplanır?"
description: "Kurdaki yüzde değişim, farkın başlangıç kuruna oranıdır. Formül, 2020 dolar örneği ve neden yükselişle düşüşün yüzdelerinin farklı çıktığı açıklanır."
order: 9
updated: "2026-09-28"
sources:
  - label: "TCMB Elektronik Veri Dağıtım Sistemi (EVDS)"
    url: "https://evds3.tcmb.gov.tr/"
  - label: "Türkiye Cumhuriyet Merkez Bankası (TCMB)"
    url: "https://www.tcmb.gov.tr/"
related:
  - label: "Kur değişimi hesaplama"
    href: "/hesaplama/kur-degisimi/"
  - label: "2020 dolar kuru arşivi"
    href: "/dolar/2020/"
  - label: "Metodoloji: formüller"
    href: "/metodoloji/#formuller"
---

Yüzde değişim, iki kur arasındaki farkın başlangıç kuruna oranıdır:

**Yüzde değişim = ((yeni kur − eski kur) ÷ eski kur) × 100**

Sonuç pozitifse kur yükselmiş, negatifse düşmüştür. Döviz Arşiv'de yükseliş ▲, düşüş ▼ ile gösterilir; renk tek başına anlam taşımaz.

## Örnek: 2020'de ABD doları

USD döviz satış kuru, 2020'nin ilk belirlenme gününde (2 Ocak) 5,9585 TL, son belirlenme gününde (31 Aralık) 7,4327 TL'dir.

- Fark: 7,4327 − 5,9585 = 1,4742 TL
- Yüzde değişim: 1,4742 ÷ 5,9585 × 100 = **%24,74**

Bu değer [2020 dolar kuru](/dolar/2020/) sayfasındaki ilk → son değişimle ve [kur değişimi hesaplama](/hesaplama/kur-degisimi/) aracının sonucuyla aynıdır. Aynı tanım her yerde kullanılır.

## Yükseliş ve düşüşün yüzdeleri neden simetrik değildir

Yüzde, her zaman **başlangıç değerine** göre hesaplanır. Bu yüzden aynı farkın ters yönü farklı yüzde verir.

Yukarıdaki örnekte dolar %24,74 yükselmişti. Kur 7,4327'den 5,9585'e geri dönseydi bu, 1,4742 ÷ 7,4327 × 100 = **%19,83** düşüş olurdu. Aynı şekilde, bir liranın dolar karşılığına bakarsanız (1 ÷ kur) 0,1678 dolardan 0,1345 dolara inmiştir; bu da yaklaşık %19,83 azalmadır. "Dolar %24,74 arttı" ile "TL'nin dolar karşılığı %19,83 azaldı" aynı olayın iki ifadesidir.

## Yüzde ile yüzde puan

Yüzdelerin farkı "yüzde puan"dır; yüzde değişim değildir. %10'dan %15'e çıkmak 5 yüzde puanlık, ama %50'lik bir artıştır. Kurlarda çoğunlukla yüzde değişim kastedilir.

## Bu sitede nasıl hesaplanır

- Gözlem olmayan günler (hafta sonu, tatil) hesaba katılmaz; ortalama ve değişimler yalnızca TCMB'nin kur belirlediği günlerle yapılır. Ayrıntı için [metodolojiye](/metodoloji/#formuller) bakın.
- Hesap tam ondalık aritmetiğiyle yapılır, yuvarlama yalnızca gösterimde olur. Yüzdeler iki ondalık basamakla yazılır.
- Bu değerler Döviz Arşiv hesaplamasıdır; TCMB tarafından yayımlanmamıştır. Değişimin nedeni hakkında yorum yapılmaz ve hiçbiri yatırım tavsiyesi değildir.
