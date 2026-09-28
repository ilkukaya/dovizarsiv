import { describe, expect, it } from 'vitest';
import { adsTxtLine, readAdsConfig } from '../src/config/ads.ts';

const LIVE = { PUBLIC_ADSENSE_ENABLED: 'true', PUBLIC_ADSENSE_CLIENT: 'ca-pub-1234567890123456', PUBLIC_ADSENSE_SLOT_PRIMARY: '1234567890' };

describe('reklam yapılandırması', () => {
  it('varsayılan kapalı: hiçbir alan dolu değil', () => {
    expect(readAdsConfig({})).toMatchObject({ mode: 'off', clientId: '', cmpSrc: '', publisherId: '' });
    expect(readAdsConfig({ PUBLIC_ADSENSE_ENABLED: 'false', PUBLIC_ADSENSE_CLIENT: 'ca-pub-1234567890123456' }).mode).toBe('off');
    // Kapalıyken sızıntı olmaz: istemci kimliği bile taşınmaz.
    expect(readAdsConfig({ PUBLIC_ADSENSE_ENABLED: 'false', PUBLIC_ADSENSE_CLIENT: 'ca-pub-1234567890123456' }).clientId).toBe('');
  });
  it('yalnızca tam "true" açar', () => {
    for (const v of ['1', 'TRUE', 'yes', '']) expect(readAdsConfig({ ...LIVE, PUBLIC_ADSENSE_ENABLED: v }).mode).toBe('off');
  });
  it('canlı kip: geçerli kimlik ve birincil slot ister', () => {
    expect(readAdsConfig(LIVE)).toMatchObject({ mode: 'live', publisherId: 'pub-1234567890123456' });
    expect(() => readAdsConfig({ ...LIVE, PUBLIC_ADSENSE_CLIENT: 'sahte' })).toThrow(/ca-pub/);
    expect(() => readAdsConfig({ ...LIVE, PUBLIC_ADSENSE_CLIENT: '' })).toThrow();
    expect(() => readAdsConfig({ ...LIVE, PUBLIC_ADSENSE_SLOT_PRIMARY: '' })).toThrow(/PRIMARY/);
    expect(() => readAdsConfig({ ...LIVE, PUBLIC_ADSENSE_SLOT_SECONDARY: 'abc' })).toThrow(/SECONDARY/);
  });
  it('production\'da CMP olmadan canlı reklam açılmaz; geliştirmede açılır', () => {
    expect(() => readAdsConfig({ ...LIVE, CF_PAGES_BRANCH: 'main' })).toThrow(/CMP/);
    expect(() => readAdsConfig({ ...LIVE, DOVIZARSIV_ENV: 'production' })).toThrow(/CMP/);
    expect(readAdsConfig({ ...LIVE, CF_PAGES_BRANCH: 'main', PUBLIC_CMP_SRC: 'https://cmp.example/script.js' }).mode).toBe('live');
    expect(readAdsConfig({ ...LIVE, CF_PAGES_BRANCH: 'preview' }).mode).toBe('live');
    expect(() => readAdsConfig({ ...LIVE, PUBLIC_CMP_SRC: 'http://cmp.example/x.js' })).toThrow(/https/);
  });
  it('test kipi: harici kimlik gerekmez ama production\'da yasak', () => {
    expect(readAdsConfig({ PUBLIC_ADSENSE_ENABLED: 'true', PUBLIC_ADSENSE_TEST_MODE: 'true' }).mode).toBe('test');
    expect(() => readAdsConfig({ PUBLIC_ADSENSE_ENABLED: 'true', PUBLIC_ADSENSE_TEST_MODE: 'true', CF_PAGES_BRANCH: 'main' })).toThrow(/TEST/);
    expect(readAdsConfig({ PUBLIC_ADSENSE_TEST_MODE: 'true' }).mode).toBe('off');
  });
  it('ads.txt satırı Google\'ın yayımladığı biçimdedir', () => {
    expect(adsTxtLine('pub-0000000000000000')).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0');
  });
});
