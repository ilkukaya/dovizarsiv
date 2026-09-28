---
title: "Hafta Sonunda TCMB Kuru Neden Yayımlanmaz?"
description: "TCMB gösterge kurlarını iş günlerinde belirler. Hafta sonu, resmî tatil ve arife günleri için kur yoktur; arşivde bu günlerde hangi kurun kullanılacağı anlatılır."
order: 7
updated: "2026-09-28"
sources:
  - label: "TCMB EVDS: Döviz Kurları veri grubu (açıklama notu)"
    url: "https://evds3.tcmb.gov.tr/"
  - label: "Türkiye Cumhuriyet Merkez Bankası (TCMB)"
    url: "https://www.tcmb.gov.tr/"
related:
  - label: "Ocak 2020 dolar kuru (hafta sonu satırları ile)"
    href: "/dolar/2020/01/"
  - label: "Metodoloji: hafta sonu, resmî tatil ve arife"
    href: "/metodoloji/#hafta-sonu-tatil"
  - label: "Tarih arşivi"
    href: "/tarih-arsivi/"
---

TCMB gösterge kurlarını **iş günlerinde** belirler. EVDS'deki açıklama, kurların "bir önceki iş günü saat 15:30'da belirlenen" kurlar olduğunu söyler. Hafta sonları iş günü olmadığı için o günlerde kur belirlenmez. Aynı durum resmî tatiller ve yarım iş günü olan arifeler için de geçerlidir.

## Arşivde bu günler

Bu günlere ait bir kur olmadığı için Döviz Arşiv'de:

- Ay sayfalarında ilgili satır "TCMB kur belirlemedi (hafta sonu, resmî tatil ya da arife)" olarak görünür. Örnek için [Ocak 2020 dolar kuru](/dolar/2020/01/) sayfasına bakın.
- Kur belirlenmeyen günler için gün sayfası üretilmez.
- Tarih seçicide böyle bir gün seçerseniz en yakın **önceki** belirlenme günü açılır.

Örnek: 12 Ocak 2020 Pazar günü için TCMB kur belirlemedi. Tarih seçici sizi 10 Ocak 2020 Cuma gününün sayfasına götürür ve seçtiğiniz tarihi ayrıca belirtir. O gün belirlenen USD döviz alış kuru 5,8713 TL'dir.

## Hesaplarda nasıl davranılır

Hesaplayıcılarda kur belirlenmeyen bir gün seçildiğinde de en yakın önceki belirlenme günü kullanılır ve sonuçta hangi günün kullanıldığı yazılır. Aradaki günler için kur uydurulmaz: hafta sonları interpolasyonla doldurulmaz ve hiçbir ortalamada sıfır sayılmaz.

Örneğin 12 Ocak 2020 için 100 USD'nin TL karşılığı, 10 Ocak 2020 kuruyla hesaplanır: 100 × 5,8713 = 587,13 TL.

## Bankalar ve döviz büroları

TCMB'nin kur belirlememesi, başka kuruluşların bu günlerde kur uygulamayacağı anlamına gelmez. Bir bankanın veya döviz bürosunun hafta sonu ne uyguladığı bu sitede yer almaz; Döviz Arşiv yalnızca TCMB'nin belirlediği kurları gösterir.
