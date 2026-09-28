/** dist/ üzerinde çalışan doğrulama betikleri için ortak HTML okuma yardımcıları (bağımlılıksız). */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const DIST = process.env.DOVIZARSIV_DIST ?? 'dist';

export interface HtmlPage {
  file: string;
  /** Site yolu: "/tarih/2020-01-15/" ya da "/404.html" */
  path: string;
  html: string;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
}

export function listFiles(): string[] {
  if (!existsSync(DIST)) throw new Error(`${DIST} yok. Önce npm run build.`);
  const out: string[] = [];
  walk(DIST, out);
  return out;
}

export function filePathToUrlPath(file: string): string {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

export function readHtmlPages(): HtmlPage[] {
  return listFiles()
    .filter((f) => f.endsWith('.html'))
    .map((file) => ({ file, path: filePathToUrlPath(file), html: readFileSync(file, 'utf8') }));
}

/** İç yolun dist'te karşılığı var mı? ("/a/" → dist/a/index.html, "/a.csv" → dist/a.csv) */
export function resolveInternal(path: string): string | null {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]!);
  const candidates = clean.endsWith('/') ? [join(DIST, clean, 'index.html')] : [join(DIST, clean), join(DIST, clean, 'index.html')];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

const attr = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

export interface PageMeta {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  h1Count: number;
  kind: string | null;
  indexable: boolean | null;
  jsonLd: string[];
  hasSourceDisclosure: boolean;
  links: string[];
}

export function pageMeta(html: string): PageMeta {
  const head = html.slice(0, html.indexOf('</head>') + 7);
  const htmlTag = /<html[^>]*>/.exec(html)?.[0] ?? '';
  const metaByName = (name: string) => {
    const tag = [...head.matchAll(/<meta [^>]*>/g)].map((m) => m[0]).find((t) => attr(t, 'name') === name);
    return tag ? decodeEntities(attr(tag, 'content') ?? '') : null;
  };
  const canonicalTag = [...head.matchAll(/<link [^>]*>/g)].map((m) => m[0]).find((t) => attr(t, 'rel') === 'canonical');
  const body = html.slice(html.indexOf('<body'));
  return {
    title: /<title>([\s\S]*?)<\/title>/.exec(head)?.[1] ? decodeEntities(/<title>([\s\S]*?)<\/title>/.exec(head)![1]!) : null,
    description: metaByName('description'),
    canonical: canonicalTag ? attr(canonicalTag, 'href') ?? null : null,
    robots: metaByName('robots'),
    h1Count: (body.match(/<h1[\s>]/g) ?? []).length,
    kind: attr(htmlTag, 'data-page-kind') ?? null,
    indexable: attr(htmlTag, 'data-indexable') === undefined ? null : attr(htmlTag, 'data-indexable') === 'true',
    jsonLd: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]!),
    hasSourceDisclosure: /data-source-disclosure/.test(body),
    links: [...body.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => decodeEntities(m[1]!)),
  };
}
