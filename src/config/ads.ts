/**
 * Reklam yapılandırması (SPEC §10). Varsayılan: KAPALI. Kapalıyken çıktıda reklam script'i, boş kutu, yer tutucu ya da
 * reklam izi bulunmaz. Değerler ortam değişkenlerinden (.env.example) okunur; gerçek publisher ID koda yazılmaz.
 *
 * Kip (mode):
 *  - off:  PUBLIC_ADSENSE_ENABLED != "true"  → hiçbir şey basılmaz.
 *  - test: ENABLED=true + PUBLIC_ADSENSE_TEST_MODE=true → sabit yükseklikli "Reklam alanı (test modu)" kutuları (CLS ölçümü için);
 *          harici script YOKTUR. Production'da (main dalı / DOVIZARSIV_ENV=production) build'i düşürür: ziyaretçi test kutusu görmez.
 *  - live: ENABLED=true → AdSense + onay yönetimi. Geçerli publisher ID ve birincil slot zorunlu; production'da ayrıca onay yönetimi
 *          (CMP) script adresi zorunlu (docs/DECISIONS.md D-018).
 * Yapılandırma hatası sessizce geçilmez: build hata verir.
 */
export type AdsMode = 'off' | 'test' | 'live';

export interface AdsConfig {
  mode: AdsMode;
  clientId: string;
  slots: { primary: string; secondary: string; sidebar: string };
  /** Google sertifikalı onay yönetimi (Privacy & messaging) script adresi; AdSense hesabından kopyalanır. */
  cmpSrc: string;
  /** ads.txt satırı için "pub-…" (ca- öneki olmadan). */
  publisherId: string;
}

type Env = Record<string, string | undefined>;

const CLIENT_RE = /^ca-pub-\d{16}$/;
const SLOT_RE = /^\d{5,20}$/;

export function isProduction(env: Env): boolean {
  return env.DOVIZARSIV_ENV === 'production' || env.CF_PAGES_BRANCH === 'main';
}

export function readAdsConfig(env: Env): AdsConfig {
  const enabled = env.PUBLIC_ADSENSE_ENABLED === 'true';
  const testMode = env.PUBLIC_ADSENSE_TEST_MODE === 'true';
  const production = isProduction(env);
  const clientId = (env.PUBLIC_ADSENSE_CLIENT ?? '').trim();
  const slots = {
    primary: (env.PUBLIC_ADSENSE_SLOT_PRIMARY ?? '').trim(),
    secondary: (env.PUBLIC_ADSENSE_SLOT_SECONDARY ?? '').trim(),
    sidebar: (env.PUBLIC_ADSENSE_SLOT_SIDEBAR ?? '').trim(),
  };
  const cmpSrc = (env.PUBLIC_CMP_SRC ?? '').trim();

  const off: AdsConfig = { mode: 'off', clientId: '', slots: { primary: '', secondary: '', sidebar: '' }, cmpSrc: '', publisherId: '' };
  if (!enabled) return off;

  if (testMode) {
    if (production) throw new Error('Reklam TEST modu production build\'inde kullanılamaz (PUBLIC_ADSENSE_TEST_MODE).');
    return { ...off, mode: 'test' };
  }

  const errors: string[] = [];
  if (!CLIENT_RE.test(clientId)) errors.push('PUBLIC_ADSENSE_CLIENT "ca-pub-" + 16 rakam olmalı');
  if (!SLOT_RE.test(slots.primary)) errors.push('PUBLIC_ADSENSE_SLOT_PRIMARY (birincil reklam birimi kimliği) rakamlardan oluşmalı');
  for (const key of ['secondary', 'sidebar'] as const) if (slots[key] && !SLOT_RE.test(slots[key])) errors.push(`PUBLIC_ADSENSE_SLOT_${key.toUpperCase()} rakamlardan oluşmalı`);
  if (cmpSrc && !/^https:\/\/[^\s"'<>]+$/.test(cmpSrc)) errors.push('PUBLIC_CMP_SRC https adresi olmalı');
  if (production && !cmpSrc) errors.push('production\'da onay yönetimi (PUBLIC_CMP_SRC) yapılandırılmadan reklam açılamaz (AEA/UK/CH trafiği için Google sertifikalı CMP gerekir)');
  if (errors.length) throw new Error(`Reklam yapılandırması geçersiz: ${errors.join('; ')}`);

  return { mode: 'live', clientId, slots, cmpSrc, publisherId: clientId.replace(/^ca-/, '') };
}

function envSource(): Env {
  const viteEnv = ((import.meta as unknown as { env?: Env }).env ?? {}) as Env;
  const proc = typeof process !== 'undefined' ? (process.env as Env) : {};
  return { ...proc, ...viteEnv };
}

export const ADS: AdsConfig = readAdsConfig(envSource());

/** ads.txt satırı (Google AdSense yardım: "Ads.txt guide"); sertifika yetkilisi kimliği Google'ın yayımladığı sabittir. */
export function adsTxtLine(publisherId: string): string {
  return `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`;
}
