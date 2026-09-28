/**
 * Rehber yazıları kalite kapısı (SPEC §6.10, §7): şema, kaynak, ilgili link, yasak kalıplar ve rota kaydı tutarlılığı.
 * Doğrulanamayan olgu yazılmaz; bu test yalnızca biçimsel/yasak kalıp denetimidir, içeriğin doğruluğu docs/guides-review.md'de insan incelemesine bırakılmıştır.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STATIC_ROUTES } from '../src/config/static-routes.ts';

const DIR = 'src/content/guides';
const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));

function parse(name: string): { front: string; body: string } {
  const text = readFileSync(join(DIR, name), 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`${name}: frontmatter yok`);
  return { front: m[1]!, body: m[2]! };
}

const BANNED = [
  'günümüzde',
  'bu yazımızda',
  'hayatımızın vazgeçilmez',
  'en güncel bilgilere sitemizden',
  'kesin olarak',
  'en doğru',
  '1 numara',
  'garantili',
  'yatırım yapmalısınız',
  'nedeniyle yükseldi',
  'sebebiyle yükseldi',
  'nedeniyle düştü',
  'öngörülüyor',
  'tahmin ediliyor',
];

describe('rehber yazıları', () => {
  it('SPEC §6.10: 10 yazı, sıra 1–10 ve tekrarsız', () => {
    expect(files).toHaveLength(10);
    const orders = files.map((f) => Number(/^order:\s*(\d+)/m.exec(parse(f).front)![1])).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    describe(slug, () => {
      const { front, body } = parse(file);
      it('title, description (50–170), updated ve kaynak var', () => {
        expect(/^title:\s*".{5,}"/m.test(front)).toBe(true);
        const desc = /^description:\s*"(.*)"$/m.exec(front)![1]!;
        expect(desc.length).toBeGreaterThanOrEqual(50);
        expect(desc.length).toBeLessThanOrEqual(170);
        expect(/^updated:\s*"\d{4}-\d{2}-\d{2}"/m.test(front)).toBe(true);
        expect(front).toMatch(/sources:\n\s+- label:/);
        expect(front).toMatch(/related:\n\s+- label:/);
      });
      it('yasak kalıp ve boş iddia içermez', () => {
        const lower = `${front}\n${body}`.toLocaleLowerCase('tr-TR');
        for (const phrase of BANNED) expect(lower.includes(phrase), `"${phrase}"`).toBe(false);
      });
      it('en az 200 kelime (boş taslak koruması) ve en az bir arşiv/araç linki', () => {
        expect(body.split(/\s+/).length).toBeGreaterThan(200);
        expect(/\]\(\/(dolar|euro|sterlin|tarih|tarih-arsivi|hesaplama|karsilastir)\b/.test(body)).toBe(true);
      });
      it('iç linkler eğik çizgiyle biter ve küçük harflidir (canonical kuralı)', () => {
        for (const m of `${front}\n${body}`.matchAll(/\]\((\/[^)\s]*)\)|href:\s*"(\/[^"]*)"/g)) {
          const href = (m[1] ?? m[2])!.split('#')[0]!;
          expect(href.endsWith('/'), href).toBe(true);
          expect(href, href).toBe(href.toLowerCase());
        }
      });
      it('rota kaydında (STATIC_ROUTES) aynı updated tarihiyle var', () => {
        const route = STATIC_ROUTES.find((r) => r.path === `/rehber/${slug}/`);
        expect(route, 'STATIC_ROUTES kaydı').toBeTruthy();
        expect(route!.sitemap).toBe('guides');
        expect(route!.updated).toBe(/^updated:\s*"(\d{4}-\d{2}-\d{2})"/m.exec(front)![1]);
      });
    });
  }
});
