/** Tarih bulucu için gün sayfası olan belirlenme günleri (sıralı ISO dizisi). */
import type { APIRoute } from 'astro';
import { dayPageDates } from '../../lib/data/store.ts';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(dayPageDates()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
