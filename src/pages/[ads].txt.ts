/**
 * ads.txt (Google AdSense yardım "Ads.txt guide"): yalnızca canlı reklam kipinde ve geçerli publisher ID ile üretilir.
 * Sahte ID YAZILMAZ; reklam kapalıyken dosya çıktıda yoktur.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { ADS, adsTxtLine } from '../config/ads.ts';

export const getStaticPaths: GetStaticPaths = () => (ADS.mode === 'live' ? [{ params: { ads: 'ads' } }] : []);

export const GET: APIRoute = () => new Response(`${adsTxtLine(ADS.publisherId)}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
