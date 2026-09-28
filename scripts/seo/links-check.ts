/**
 * npm run links:check — dist/ içindeki tüm iç linkler ve yetim sayfa kontrolü (SPEC §11.2).
 * Kritik kırık link (sayfa/dosya yok) ya da yetim sayfa (hiçbir sayfadan link almayan; ana sayfa ve 404 hariç) → çıkış kodu 1.
 */
import { pageMeta, readHtmlPages, resolveInternal } from './lib/dist.ts';

const SITE = 'https://dovizarsiv.net';

function main(): void {
  const pages = readHtmlPages();
  const known = new Set(pages.map((p) => p.path));
  const inbound = new Map<string, number>();
  const broken: Array<{ from: string; href: string }> = [];
  let checked = 0;
  const cache = new Map<string, boolean>();

  for (const page of pages) {
    const { links } = pageMeta(page.html);
    for (const raw of links) {
      let href = raw;
      if (href.startsWith(SITE)) href = href.slice(SITE.length) || '/';
      if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;
      if (!href.startsWith('/')) href = new URL(href, `${SITE}${page.path}`).pathname;
      const path = href.split(/[?#]/)[0]!;
      checked++;
      let ok = cache.get(path);
      if (ok === undefined) {
        ok = resolveInternal(path) !== null;
        cache.set(path, ok);
      }
      if (!ok) broken.push({ from: page.path, href });
      else if (known.has(path) && path !== page.path) inbound.set(path, (inbound.get(path) ?? 0) + 1);
    }
  }

  const orphans = pages
    .map((p) => p.path)
    .filter((p) => p !== '/' && p !== '/404.html' && !inbound.has(p));

  console.log(`links:check: ${pages.length} sayfa, ${checked} iç link, ${cache.size} benzersiz hedef`);
  if (broken.length) {
    const byHref = new Map<string, string[]>();
    for (const b of broken) byHref.set(b.href, [...(byHref.get(b.href) ?? []), b.from]);
    for (const [href, from] of [...byHref].slice(0, 50)) console.error(`KIRIK LİNK ${href} ← ${from.slice(0, 3).join(', ')}${from.length > 3 ? ` (+${from.length - 3})` : ''}`);
  }
  for (const o of orphans.slice(0, 50)) console.error(`YETİM SAYFA ${o}`);
  if (broken.length || orphans.length) {
    console.error(`links:check BAŞARISIZ: ${broken.length} kırık link, ${orphans.length} yetim sayfa`);
    process.exit(1);
  }
  console.log('links:check TAMAM: kırık link ve yetim sayfa yok');
}

main();
