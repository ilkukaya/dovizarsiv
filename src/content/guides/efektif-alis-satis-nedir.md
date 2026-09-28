---
title: "Efektif Alış ve Efektif Satış Kuru Nedir?"
description: "Efektif kurlar nakit (banknot) döviz işlemleri, döviz kurları ise hesaben (kaydi) işlemler içindir. Dört TCMB kurunun farkı bir örnekle gösterilir."
order: 4
updated: "2026-09-28"
sources:
  - label: "TCMB Elektronik Veri Dağıtım Sistemi (EVDS): Döviz Kurları ve Efektif Kurlar veri grupları"
    url: "https://evds3.tcmb.gov.tr/"
  - label: "Türkiye Cumhuriyet Merkez Bankası (TCMB)"
    url: "https://www.tcmb.gov.tr/"
related:
  - label: "15 Ocak 2020 döviz kurları"
    href: "/tarih/2020-01-15/"
  - label: "Veri kaynakları: kullanılan seriler"
    href: "/veri-kaynaklari/"
  - label: "Geçmiş döviz kuru hesaplama"
    href: "/hesaplama/gecmis-doviz/"
---

TCMB, her para birimi için dört kur yayımlar. **Döviz** alış ve satış kurları hesaben (kaydi) döviz içindir; **efektif** alış ve satış kurları ise nakit, yani banknot olarak döviz alım satımı içindir. EVDS bu kurları ayrı veri gruplarında ("Döviz Kurları" ve "Efektif Kurlar") ve ayrı serilerde tutar.

## Örnek: 15 Ocak 2020, ABD doları

Dört kurun tamamı [15 Ocak 2020 sayfasında](/tarih/2020-01-15/) yer alır. ABD doları için:

| Kur | Değer (TL) |
|---|---|
| Efektif alış | 5,8786 |
| Döviz alış | 5,8827 |
| Döviz satış | 5,8933 |
| Efektif satış | 5,9021 |

Bu örnekte sıra efektif alış < döviz alış < döviz satış < efektif satış şeklindedir. Efektif alış ile efektif satış arasındaki fark 0,0235 TL, döviz alış ile satış arasındaki fark 0,0106 TL'dir.

## Ne zaman hangisi

Hangi kurun uygulanacağı işlemin türüne ve işlemi yapan kuruma bağlıdır. Döviz Arşiv'in [geçmiş döviz kuru hesaplama](/hesaplama/gecmis-doviz/) aracı varsayılan olarak döviz kurlarını kullanır; efektif kur istiyorsanız kur türü seçiminden efektif alış ya da efektif satışı seçebilirsiniz. Dört kur hiçbir hesaplamada birleştirilmez veya birbirine dönüştürülmez.

## Kapsam farkı

Efektif kur kayıtları döviz kurlarından daha kısadır. Kurun belirlendiği güne göre:

- ABD doları ve İngiliz sterlini: döviz kurları 1950'den, efektif kurlar 29 Aralık 1989'dan başlar.
- Euro: döviz kurları 31 Aralık 1998'den, efektif kurlar 31 Aralık 2001'den başlar.

Bir tarihte efektif kur yoksa Döviz Arşiv bu değeri yazmaz ve hesaplayıcı bunu açıkça belirtir; başka bir kur türünü sessizce yerine koymaz.

## Bankalardaki kurla farkı

Bunlar TCMB'nin gösterge kurlarıdır. Banka veya döviz bürosu şubelerinde nakit işlemler için uygulanan kurlar farklı olabilir.
