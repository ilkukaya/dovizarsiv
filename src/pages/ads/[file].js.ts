/**
 * /ads/runtime.js: yalnızca reklam CANLI kipteyken üretilir (getStaticPaths). Kapalı ya da test kipinde dosya çıktıda yoktur.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { ADS } from '../../config/ads.ts';
import { runtimeSource } from '../../lib/ads/runtime.ts';

export const getStaticPaths: GetStaticPaths = () => (ADS.mode === 'live' ? [{ params: { file: 'runtime' } }] : []);

export const GET: APIRoute = () => new Response(runtimeSource(ADS), { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
