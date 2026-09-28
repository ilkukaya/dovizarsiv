/**
 * Yerel geliştirmede .env dosyasını yükler (Node yerleşik `process.loadEnvFile`). CI'da ortam değişkenleri
 * GitHub Secrets'tan gelir. Anahtar değeri hiçbir zaman yazdırılmaz.
 */
import { existsSync } from 'node:fs';

export function loadEnv(): void {
  if (existsSync('.env')) process.loadEnvFile('.env');
}

export function parseArgs(argv: readonly string[]): { flags: Set<string>; options: Map<string, string> } {
  const flags = new Set<string>();
  const options = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=', 2) as [string, string?];
    if (value === undefined) flags.add(key);
    else options.set(key, value);
  }
  return { flags, options };
}

/** GitHub Actions uyarı/hata ek açıklaması (yerelde düz metin). */
export function annotate(level: 'warning' | 'error' | 'notice', message: string): void {
  if (process.env.GITHUB_ACTIONS === 'true') console.log(`::${level}::${message.replaceAll('\n', '%0A')}`);
  else console.log(`[${level}] ${message}`);
}
