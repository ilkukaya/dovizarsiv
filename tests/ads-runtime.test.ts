import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { ADS_CSP, applyCsp } from '../src/lib/ads/csp.ts';
import { runtimeSource } from '../src/lib/ads/runtime.ts';

interface FakeEl {
  src?: string;
  attrs: Record<string, string>;
  async?: boolean;
  offsetParent: object | null;
  setAttribute(k: string, v: string): void;
}

function run(cfg: { clientId: string; cmpSrc: string }, units: Array<{ visible: boolean }>) {
  const order: string[] = [];
  const appended: FakeEl[] = [];
  const dataLayer: unknown[] = [];
  const mk = (visible = true): FakeEl => ({ attrs: {}, offsetParent: visible ? {} : null, setAttribute(k, v) { this.attrs[k] = v; } });
  const window: Record<string, unknown> = { dataLayer };
  const document = {
    createElement: () => mk(),
    head: { appendChild: (el: FakeEl) => (order.push(`script:${el.src}`), appended.push(el)) },
    querySelectorAll: () => units.map((u) => mk(u.visible)),
  };
  const originalPush = dataLayer.push.bind(dataLayer);
  dataLayer.push = (...a: unknown[]) => (order.push(`dl:${JSON.stringify(Array.from(a[0] as ArrayLike<unknown>))}`), originalPush(...a));
  vm.runInNewContext(runtimeSource(cfg), { window, document, encodeURIComponent });
  return { order, appended, window, dataLayer };
}

describe('reklam çalışma zamanı', () => {
  const cfg = { clientId: 'ca-pub-1234567890123456', cmpSrc: 'https://cmp.example/fc.js' };

  it('sıra: varsayılan onay "denied" → CMP → AdSense; onay AdSense\'ten ÖNCE', () => {
    const { order } = run(cfg, [{ visible: true }]);
    expect(order[0]).toContain('"consent","default"');
    expect(order[0]).toContain('"ad_storage":"denied"');
    for (const k of ['ad_user_data', 'ad_personalization', 'analytics_storage']) expect(order[0]).toContain(`"${k}":"denied"`);
    expect(order[0]).toContain('"wait_for_update":500');
    expect(order[1]).toBe('script:https://cmp.example/fc.js');
    expect(order[2]).toBe('script:https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456');
  });
  it('CMP yapılandırılmadıysa yalnızca AdSense yüklenir; gizli birimler başlatılmaz', () => {
    const { appended, window } = run({ ...cfg, cmpSrc: '' }, [{ visible: true }, { visible: false }, { visible: true }]);
    expect(appended).toHaveLength(1);
    expect(appended[0]!.attrs.crossorigin).toBe('anonymous');
    expect((window.adsbygoogle as unknown[]).length).toBe(2);
  });
  it('iki kez yüklenirse ikinci çalışma etkisizdir (aynı sayfada birden çok reklam etiketi)', () => {
    const ctx = { window: {} as Record<string, unknown>, document: { createElement: () => ({ setAttribute() {} }), head: { appendChild() {} }, querySelectorAll: () => [] }, encodeURIComponent };
    vm.runInNewContext(runtimeSource(cfg), ctx);
    const layerLen = (ctx.window.dataLayer as unknown[]).length;
    vm.runInNewContext(runtimeSource(cfg), ctx);
    expect((ctx.window.dataLayer as unknown[]).length).toBe(layerLen);
  });
  it('özel CMP için güncelleme noktası gtag consent update çağırır', () => {
    const { window, dataLayer } = run(cfg, []);
    (window.dovizarsivConsent as { update(s: object): void }).update({ ad_storage: 'granted' });
    expect(JSON.stringify(Array.from(dataLayer.at(-1) as ArrayLike<unknown>))).toBe('["consent","update",{"ad_storage":"granted"}]');
  });
  it('yapılandırma değeri script bağlamını kapatamaz', () => {
    const src = runtimeSource({ clientId: '</script><script>alert(1)', cmpSrc: '' });
    expect(src).not.toContain('</script>');
  });
});

describe('reklam CSP', () => {
  const headers = readFileSync('public/_headers', 'utf8');
  it('_headers içinde tam bir CSP satırı var ve sıkı hâli reklam kapalıyken script-src \'self\'', () => {
    expect(headers).toMatch(/Content-Security-Policy: default-src 'self'; script-src 'self';/);
  });
  it('applyCsp yalnızca CSP satırını değiştirir', () => {
    const out = applyCsp(headers, ADS_CSP);
    expect(out).toContain(`Content-Security-Policy: ${ADS_CSP}`);
    expect(out.split('\n').length).toBe(headers.split('\n').length);
    expect(out).toContain('X-Content-Type-Options: nosniff');
    expect(ADS_CSP).toContain("object-src 'none'");
    expect(ADS_CSP).toContain("frame-ancestors 'self'");
  });
  it('CSP satırı yoksa ya da birden çoksa hata verir', () => {
    expect(() => applyCsp('/*\n  X-Foo: bar\n', ADS_CSP)).toThrow();
    expect(() => applyCsp('  Content-Security-Policy: a\n  Content-Security-Policy: b\n', ADS_CSP)).toThrow();
  });
});
