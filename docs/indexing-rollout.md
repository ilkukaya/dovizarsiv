# Kademeli indeksleme takvimi (SPEC §8)

Gün sayfaları (`/tarih/YYYY-MM-DD/`, 2000–bugün, ≈6.700 sayfa) **baştan** erişilebilir, linkli ve `index,follow`'dur.
Kademeli olan yalnızca **gün sitemap'lerinin sitemap index'e girişidir**. Böylece Google önce az sayıdaki güçlü sayfayı
(hub, yıl, ay, güven, araç, rehber) işler, gün sayfalarını ise yıl yıl, en yeniden eskiye doğru keşfeder.

## Nasıl çalışır

- Tek ayar: `src/config/indexing.ts` → `DATE_SITEMAP_YEARS`. Başlangıç değeri: `[]`.
- Her build, **tüm** `sitemap-dates-YYYY.xml` dosyalarını üretir. `sitemap-index.xml` ise yalnızca listede olan yılları gösterir.
  Böylece bir yılı eklemek tek satırlık bir değişikliktir ve eski dosyalar hiç kırılmaz.
- `npm run seo:validate`, indekslenebilir her URL'nin en az bir sitemap dosyasında bulunmasını ister. Sitemap index'ten
  ulaşılamayan sayfalar ise yalnızca gün sayfaları olabilir ("kademeli indeksleme bekleyen gün sayfası" sayacı).
- Gün sayfaları sitemap'e girmeden de ana sayfa, tarih arşivi, ay tabloları ve "Yakın tarihler" linkleriyle taranabilir.

## Takvim (L = lansman günü, Search Console'a sitemap index gönderildiği gün)

| Adım | Zaman | `DATE_SITEMAP_YEARS`'a eklenecek yıllar | Toplam gün sitemap'i |
|---|---|---|---|
| 0 | L | — (pages, currencies, years, months; Sonnet sayfalarıyla birlikte guides) | 0 |
| 1 | L + 7 gün | 2026, 2025 | 2 |
| 2 | L + 14 gün | 2024, 2023, 2022 | 5 |
| 3 | L + 21 gün | 2021, 2020, 2019, 2018 | 9 |
| 4 | L + 28 gün | 2017 … 2012 | 15 |
| 5 | L + 35 gün | 2011 … 2006 | 21 |
| 6 | L + 42 gün | 2005 … 2000 | 27 (tamamı) |

**Bir sonraki adıma geçme koşulu (owner, Search Console):**
- Önceki adımda gönderilen sitemap'ler "Başarılı" durumda ve keşfedilen URL sayısı dosyadaki URL sayısıyla uyumlu.
- "Tarandı – şu anda dizine eklenmemiş" oranında belirgin bir sıçrama yok. Sıçrama varsa bir hafta beklenir; kalıcıysa
  gün sayfası şablonu gözden geçirilir (SPEC §13).
- Koşul sağlanmazsa takvim bir hafta kayar. Takvim hızlandırılmaz.

## Uygulama

1. `src/config/indexing.ts` dosyasında yılları ekleyin, ör. `export const DATE_SITEMAP_YEARS: readonly number[] = [2026, 2025];`
2. `npm run build` (seo:validate sitemap index'i ve dosyaları kontrol eder), commit, push → Cloudflare Pages deploy.
3. Search Console'da sitemap index'i yeniden gönderin (URL değişmez: `https://dovizarsiv.net/sitemap-index.xml`).
4. Aşağıdaki günlüğe tarih ve gözlemi yazın.

## Günlük

| Tarih | Adım | Eklenen yıllar | Not |
|---|---|---|---|
| — | 0 | — | Lansman bekleniyor |
