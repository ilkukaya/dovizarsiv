/**
 * İçerik koleksiyonları. Rehber yazıları Markdown'dır (insan incelemesi kolay olsun diye). Şema build'de zorunlu kılınır:
 * eksik kaynak, geçersiz tarih ya da uygunsuz description build'i düşürür.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-AA-GG biçiminde olmalı');

const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: z.object({
    /** H1 ve <title> (marka eki layout'ta eklenir). */
    title: z.string().min(5),
    /** Meta description: görünür içeriğin özeti, 50–170 karakter. */
    description: z.string().min(50).max(170),
    /** Rehber dizinindeki sıra (SPEC §6.10 konu numarası). */
    order: z.number().int().min(1).max(99),
    /** Son ANLAMLI içerik değişikliği (Article dateModified, sitemap lastmod). Build tarihi yazılmaz. */
    updated: isoDate,
    /** Yazıdaki olgulara dayanak: resmî kaynaklar. Doğrulanamayan olgu yazılmaz; kaynaksız yazı yayımlanmaz. */
    sources: z.array(z.object({ label: z.string(), url: z.string().url() })).min(1),
    /** "İlgili sayfalar": arşiv ve araç sayfalarına linkler (iç link, "/" ile başlar). */
    related: z.array(z.object({ label: z.string(), href: z.string().startsWith('/') })).min(1),
  }),
});

export const collections = { guides };
