/**
 * Kullanıcı tercihleri (SPEC §9): son seçilen para birimi, kur türü ve son bakılan tarihler. Yalnızca tarayıcının
 * localStorage'ında kalır, sunucuya gönderilmez ve kişiyi tanımlamaz (gizlilik ve çerez sayfaları bunu söyler).
 * Depolama kapalı/dolu/erişilemezse (özel pencere, engellenmiş site verisi) her işlem sessizce atlanır; site aynı çalışır.
 * Veri önbelleği tutulmaz; okunan her değer doğrulanır (bozuk kayıt yok sayılır).
 */
import { CURRENCIES, RATE_FIELDS, type CurrencyCode, type RateField } from '../providers/types.ts';

const KEY = 'dovizarsiv:tercihler:v1';
export const MAX_RECENT = 5;

export interface RecentDate {
  /** Kullanıcının baktığı tarih (YYYY-AA-GG). */
  date: string;
  /** Açılan sayfa: /tarih/…/ ya da /{para}/{yıl}/{ay}/. */
  href: string;
}

export interface Prefs {
  currency?: CurrencyCode;
  rateField?: RateField;
  recent?: RecentDate[];
}

const HREF_RE = /^\/(tarih\/\d{4}-\d{2}-\d{2}|(dolar|euro|sterlin)\/\d{4}\/\d{2})\/$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Bozuk ya da beklenmeyen kaydı güvenli varsayılana indirger. */
export function sanitize(input: unknown): Prefs {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, unknown>;
  const out: Prefs = {};
  if (typeof raw.currency === 'string' && (CURRENCIES as readonly string[]).includes(raw.currency)) out.currency = raw.currency as CurrencyCode;
  if (typeof raw.rateField === 'string' && (RATE_FIELDS as readonly string[]).includes(raw.rateField)) out.rateField = raw.rateField as RateField;
  if (Array.isArray(raw.recent)) {
    out.recent = raw.recent
      .filter((r): r is RecentDate => !!r && typeof r === 'object' && DATE_RE.test(String((r as RecentDate).date)) && HREF_RE.test(String((r as RecentDate).href)))
      .map((r) => ({ date: r.date, href: r.href }))
      .slice(0, MAX_RECENT);
  }
  return out;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadPrefs(): Prefs {
  try {
    const raw = storage()?.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function savePrefs(patch: Partial<Prefs>): void {
  try {
    const next = { ...loadPrefs(), ...patch };
    storage()?.setItem(KEY, JSON.stringify(sanitize(next)));
  } catch {
    // Depolama kapalı ya da dolu: tercih hatırlanmaz, site çalışmaya devam eder.
  }
}

/** En yeni başta, aynı tarih tekrarlanmaz, en fazla MAX_RECENT. */
export function pushRecent(recent: readonly RecentDate[], entry: RecentDate): RecentDate[] {
  return [entry, ...recent.filter((r) => r.date !== entry.date)].slice(0, MAX_RECENT);
}

export function rememberDate(entry: RecentDate): void {
  const parsed = sanitize({ recent: [entry] }).recent;
  if (!parsed?.length) return;
  savePrefs({ recent: pushRecent(loadPrefs().recent ?? [], parsed[0]!) });
}
