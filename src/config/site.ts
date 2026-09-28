/**
 * Site kimliği (SPEC §6.11). Yayıncı adı ve iletişim e-postası UYDURULMAZ; owner doldurur.
 * Production build'de (Cloudflare Pages production dalı ya da DOVIZARSIV_ENV=production) boşsa build başarısız olur
 * (scripts/validation/build-guard.ts). Ziyaretçiye yer tutucu gösterilmez: boş alanlar sayfada hiç basılmaz.
 */
export const SITE = {
  name: 'Döviz Arşiv',
  tagline: 'Geçmiş döviz kurları ve kur hesaplama araçları',
  url: 'https://dovizarsiv.net',
  locale: 'tr-TR',
  language: 'tr',
  /** Yayıncı (gerçek kişi ya da kurum adı). Owner doldurur. */
  publisherName: '',
  /** İletişim e-postası. Owner doldurur. */
  contactEmail: '',
} as const;

/** Veri kaynağı gösterimi (SPEC §4.2). Metin birebir kullanılır. */
export const SOURCE_ATTRIBUTION =
  'Kaynak: Türkiye Cumhuriyet Merkez Bankası (TCMB), Elektronik Veri Dağıtım Sistemi (EVDS).';

export const EVDS_URL = 'https://evds3.tcmb.gov.tr/';
export const EVDS_TERMS_NOTE = 'EVDS Kullanım Şartları';

/**
 * Henüz yapılmamış bölümler (Sonnet görevleri, HANDOFF.md). `false` iken bu sayfalara link basılmaz;
 * böylece kırık link ve boş yer tutucu oluşmaz. Sayfa eklenince ilgili bayrak `true` yapılır.
 */
export const FEATURES = {
  tools: false, // /hesaplama/gecmis-doviz/, /hesaplama/kur-degisimi/, /karsilastir/
  guides: false, // /rehber/
  legalPages: false, // /hakkimizda/, /iletisim/, /gizlilik/, /cerez-politikasi/, /kullanim-kosullari/, /reklam-politikasi/
} as const;
