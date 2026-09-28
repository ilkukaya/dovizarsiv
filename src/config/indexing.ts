/**
 * Kademeli indeksleme (SPEC §8, docs/indexing-rollout.md).
 * Lansmanda hub, yıl, ay ve güven sayfalarının sitemap'leri gönderilir. Gün sitemap'leri birkaç hafta içinde,
 * en yeni yıldan başlayarak yıl yıl eklenir. Gün sayfaları baştan erişilebilir, linkli ve indekslenebilirdir;
 * yalnızca sitemap'e girişleri kademelidir. Yıl eklemek için bu listeye yıl yazılır (owner/Sonnet, takvime göre).
 */
export const DATE_SITEMAP_YEARS: readonly number[] = [];

/** Metodoloji/veri kaynakları gibi statik sayfaların son anlamlı içerik değişikliği (lastmod). */
export const STATIC_CONTENT_UPDATED = '2026-09-28';
