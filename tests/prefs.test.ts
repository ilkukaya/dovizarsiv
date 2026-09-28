import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPrefs, MAX_RECENT, pushRecent, rememberDate, sanitize, savePrefs } from '../src/lib/tools/prefs.ts';

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

describe('tercihler (localStorage)', () => {
  beforeEach(() => vi.stubGlobal('localStorage', fakeStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('kaydeder ve geri okur', () => {
    savePrefs({ currency: 'EUR', rateField: 'cashSelling' });
    expect(loadPrefs()).toEqual({ currency: 'EUR', rateField: 'cashSelling' });
  });
  it('bozuk ve tanımsız değerleri yok sayar', () => {
    expect(sanitize({ currency: 'XXX', rateField: 'x', recent: [{ date: 'bad', href: '/x/' }, { date: '2020-01-15', href: 'http://evil.example/' }] })).toEqual({ recent: [] });
    localStorage.setItem('dovizarsiv:tercihler:v1', '{bozuk');
    expect(loadPrefs()).toEqual({});
  });
  it('yalnızca site içi gün/ay adreslerini kabul eder', () => {
    expect(sanitize({ recent: [{ date: '2020-01-15', href: '/tarih/2020-01-15/' }, { date: '1985-06-15', href: '/dolar/1985/06/' }] }).recent).toHaveLength(2);
    expect(sanitize({ recent: [{ date: '2020-01-15', href: '//evil.example/tarih/2020-01-15/' }] }).recent).toEqual([]);
    expect(sanitize({ recent: [{ date: '2020-01-15', href: 'javascript:alert(1)' }] }).recent).toEqual([]);
  });
  it('son bakılanlar: en yeni başta, tekrar yok, en fazla 5', () => {
    let recent = [] as ReturnType<typeof pushRecent>;
    for (let d = 10; d <= 17; d++) recent = pushRecent(recent, { date: `2020-01-${d}`, href: `/tarih/2020-01-${d}/` });
    expect(recent).toHaveLength(MAX_RECENT);
    expect(recent[0]!.date).toBe('2020-01-17');
    recent = pushRecent(recent, { date: '2020-01-15', href: '/tarih/2020-01-15/' });
    expect(recent[0]!.date).toBe('2020-01-15');
    expect(recent.filter((r) => r.date === '2020-01-15')).toHaveLength(1);
  });
  it('rememberDate kalıcıdır', () => {
    rememberDate({ date: '2020-01-15', href: '/tarih/2020-01-15/' });
    rememberDate({ date: '2020-01-10', href: '/tarih/2020-01-10/' });
    expect(loadPrefs().recent?.map((r) => r.date)).toEqual(['2020-01-10', '2020-01-15']);
  });
  it('depolama yoksa ya da hata veriyorsa sessizce çalışır', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('engelli'); }, setItem: () => { throw new Error('dolu'); } });
    expect(() => savePrefs({ currency: 'USD' })).not.toThrow();
    expect(loadPrefs()).toEqual({});
    vi.unstubAllGlobals();
    expect(() => savePrefs({ currency: 'USD' })).not.toThrow();
  });
});
