# Arama niyeti → tek canonical sayfa (SPEC §6.2)

Her arama niyeti **tek bir** canonical sayfaya gider. Aynı niyete ikinci bir sayfa açılmaz (kanibalizasyon yasağı).
Yeni sayfa eklemeden önce bu tabloya bakın; niyet zaten bir sayfaya aitse o sayfayı geliştirin.

Durum: ✅ yayında (Opus) · ⏳ Sonnet görevi (docs/HANDOFF.md §D) · — üretilmez

## Veri sayfaları

| Niyet (örnek sorgular) | Canonical sayfa | Title kalıbı | Durum |
|---|---|---|---|
| "15 Ocak 2020 dolar kuru", "15 Ocak 2020 euro kuru", "15.01.2020 döviz kuru" | `/tarih/2020-01-15/` (tüm para birimleri tek sayfada) | "15 Ocak 2020 Döviz Kurları \| Döviz Arşiv" | ✅ (2000 → bugün, yalnızca TCMB'nin kur belirlediği günler) |
| "12 Ocak 2020 dolar kuru" (hafta sonu/tatil) | Tarih seçici → önceki belirlenme günü `?istenen=` (canonical parametresiz); ayrıca ay sayfasındaki "TCMB kur belirlemedi" satırı | — | ✅ |
| "15 Ocak 1985 dolar kuru" (2000 öncesi gün) | `/dolar/1985/01/` (ay tablosunda o gün satırı) | — | ✅ |
| "Ocak 2020 dolar kuru", "Ocak 2020 dolar ortalaması" | `/dolar/2020/01/` | "Ocak 2020 Dolar Kuru \| Döviz Arşiv" | ✅ (sabit kurlu ve tek gözlemli aylar noindex) |
| "2020 dolar kuru", "2020 dolar ortalaması", "2020 en yüksek dolar" | `/dolar/2020/` | "2020 Dolar Kuru Arşivi \| Döviz Arşiv" | ✅ (sabit kurlu yıllar noindex) |
| "dolar kuru arşivi", "geçmiş dolar kuru", "dolar kuru tarihçesi" | `/dolar/` | "Dolar Kuru Arşivi \| Döviz Arşiv" | ✅ |
| Aynıları euro / sterlin için | `/euro/…`, `/sterlin/…` | aynı kalıp | ✅ |
| "geçmiş döviz kurları", "TCMB kur arşivi", "tarihe göre döviz kuru" | `/` | "Döviz Arşiv — …" | ✅ |
| "2020 döviz kurları takvimi", "hangi günler kur yayımlandı" | `/tarih-arsivi/2020/` | "2020 Tarih Arşivi \| Döviz Arşiv" | ✅ |
| "dolar kuru csv", "dolar kuru excel indir" | `/dolar/` (CSV linki `/indir/dolar-kuru-arsivi.csv`; CSV ayrı sayfa değildir) | — | ✅ |

## Araçlar (Sonnet)

| Niyet | Canonical sayfa | Title | Durum |
|---|---|---|---|
| "geçmiş döviz kuru hesaplama", "2015'te 100 dolar kaç TL" | `/hesaplama/gecmis-doviz/` | "Geçmiş Döviz Kuru Hesaplama \| Döviz Arşiv" | ✅ |
| "iki tarih arası kur değişimi", "dolar ne kadar arttı" | `/hesaplama/kur-degisimi/` | "Kur Değişimi Hesaplama \| Döviz Arşiv" | ✅ |
| "yıllara göre dolar euro karşılaştırma" | `/karsilastir/` | "Yıllara Göre Kur Karşılaştırma \| Döviz Arşiv" | ✅ (etkileşim durumu URL üretmez) |
| Belirli gün için özel tutar çevirme | Gün sayfasındaki mini hesaplayıcı (ayrı sayfa değil) | — | ✅ |

## Rehber ve güven (Sonnet, SPEC §6.10–6.11)

| Niyet | Canonical sayfa | Durum |
|---|---|---|
| "TCMB kur nasıl belirlenir", "tarih konvansiyonu", "2005 dönüşümü nasıl hesaplanır" | `/metodoloji/` | ✅ |
| "TCMB EVDS kur serileri", "veri kaynağı" | `/veri-kaynaklari/` | ✅ |
| Rehber konuları 1–10 (SPEC §6.10) | `/rehber/<slug>/` (her konu tek yazı) | ⏳ |
| "2005 para reformu eski TL" | `/rehber/2005-para-reformu-eski-tl/` (kavram) ↔ `/metodoloji/#para-reformu-2005` (hesap yöntemi) | ⏳ / ✅ |
| "hafta sonu dolar kuru neden yok" | `/rehber/hafta-sonu-tcmb-kuru/` | ⏳ |

Rehber ile metodoloji aynı soruyu cevaplarsa rehber **kavramı**, metodoloji **Döviz Arşiv'in uyguladığı yöntemi** anlatır ve
birbirine linkler. İçerik kopyalanmaz.

## Üretilmeyen sayfalar

| Yapı | Neden |
|---|---|
| `/dolar/2020/01/15/` (para birimi başına gün sayfası) | `/tarih/2020-01-15/` ile aynı niyet |
| `/15-ocak-2020-dolar-kuru/` vb. alternatif slug'lar | Aynı niyet |
| Hafta sonu / tatil günü sayfaları (`/tarih/2020-01-11/`) | TCMB o gün kur belirlemedi: veri yok, sayfa yok (404) |
| 2000 öncesi gün sayfaları | 20.000 dosya limiti (D-002, owner kararı #1); ay tabloları bu niyeti karşılar |
| Query string'li sayfalar (`?istenen=`, araç parametreleri) | Canonical her zaman parametresiz |
| "Bugün dolar kaç TL", "canlı kur" | Site canlı kur sunmaz (SPEC §1); ana sayfa "son yayımlanan TCMB kurları"nı gösterir |

## Tarih konvansiyonu ve arama niyeti

"15 Ocak 2020 dolar kuru" arayan kullanıcı genellikle **TCMB'nin o gün 15.30'da belirlediği** kuru (resmî gazetedeki bülten)
ya da **o gün geçerli olan** kuru ister. Gün sayfası ikisini de gösterir (owner kararı #2, D-012):
- Ana değer: o gün belirlenen kur.
- İkinci satır: "Bu tarihte geçerli olan kur (bir önceki iş günü belirlenen): X".
