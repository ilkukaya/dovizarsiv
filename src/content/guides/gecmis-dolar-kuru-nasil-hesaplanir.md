---
title: "Geçmiş Dolar Kuru Nasıl Hesaplanır?"
description: "Geçmiş bir tarihte belirli tutardaki doların TL karşılığı nasıl hesaplanır? Kur seçimi, formül, hafta sonu ve 2005 öncesi için adım adım örnekler."
order: 8
updated: "2026-09-28"
sources:
  - label: "TCMB Elektronik Veri Dağıtım Sistemi (EVDS)"
    url: "https://evds3.tcmb.gov.tr/"
  - label: "Türkiye Cumhuriyet Merkez Bankası (TCMB)"
    url: "https://www.tcmb.gov.tr/"
related:
  - label: "Geçmiş döviz kuru hesaplama aracı"
    href: "/hesaplama/gecmis-doviz/"
  - label: "15 Ocak 2020 döviz kurları"
    href: "/tarih/2020-01-15/"
  - label: "Metodoloji: formüller ve yuvarlama"
    href: "/metodoloji/#formuller"
---

Geçmiş bir tarihte belirli tutardaki doların TL karşılığını hesaplamak için üç şey gerekir: hangi günün kuru, hangi kur türü ve doğru yönde işlem.

## Adım 1: Günü belirleyin

O günde TCMB'nin belirlediği kuru kullanın. Kur belirlenmeyen bir gün (hafta sonu, resmî tatil, arife) ise en yakın önceki belirlenme günü alınır. Nedenini [hafta sonu yazısında](/rehber/hafta-sonu-tcmb-kuru/) anlattık.

## Adım 2: Kur türünü seçin

- Doları TL'ye çeviriyorsanız **döviz alış** kurunu, TL'yi dolara çeviriyorsanız **döviz satış** kurunu kullanın. Gerekçesi [alış ve satış kuru yazısındadır](/rehber/doviz-alis-satis-kuru-farki/).
- Nakit işlem için efektif kurlar vardır: [efektif kur yazısı](/rehber/efektif-alis-satis-nedir/).

## Adım 3: Formül

- Döviz → TL: **tutar × kur**
- TL → döviz: **tutar ÷ kur**

## Örnekler

**100 USD kaç TL eder? (15 Ocak 2020)** Döviz alış kuru 5,8827 TL. 100 × 5,8827 = **588,27 TL**.

**1.000 TL kaç USD eder? (15 Ocak 2020)** Döviz satış kuru 5,8933 TL. 1.000 ÷ 5,8933 = **169,68 USD**.

**Hafta sonu: 100 USD, 12 Ocak 2020 (Pazar).** TCMB o gün kur belirlemedi; 10 Ocak 2020'de belirlenen döviz alış kuru 5,8713 TL kullanılır. 100 × 5,8713 = **587,13 TL**.

**2005 öncesi: 100 USD, 15 Haziran 1999.** Döviz alış kuru 411.728 eski TL, yani 0,411728 yeni TL'dir. 100 × 0,411728 = 41,1728 yeni TL = **41.172.800 eski TL**. Eski ve yeni TL farkı için [2005 para reformu yazısına](/rehber/2005-para-reformu-eski-tl/) bakın.

## Dikkat edilecekler

- Kuru olduğu gibi kullanın, ara sonuçları yuvarlamayın; yalnızca sonucu yuvarlayın.
- Bulduğunuz sonuç TCMB'nin gösterge kuruyla yapılmış bir hesaptır. Bir bankanın veya döviz bürosunun aynı gün uyguladığı kur farklı olabilir; gerçek işlemde ödenen ya da alınan tutar da farklı olur.
- Vergi, muhasebe veya sözleşme hesaplarında hangi günün kurunun kullanılacağını ilgili mevzuattan ve sözleşmeden kontrol edin.

Hesabı elle yapmak yerine [geçmiş döviz kuru hesaplama](/hesaplama/gecmis-doviz/) aracını kullanabilirsiniz. Araç kur türünü, kullanılan günü ve formülü sonuçla birlikte gösterir.
