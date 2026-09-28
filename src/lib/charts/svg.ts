/**
 * Build-time SVG grafik hesapları (SPEC §9: grafikler build'de SVG, istemci JS yok).
 * Uzun seriler, uç değerleri koruyarak (her kovada min+maks) seyreltilir.
 */
import type { IsoDate } from '../data/dates.ts';
import { formatNumber } from '../formatting/format.ts';

export interface ChartPoint {
  date: IsoDate;
  value: number;
}

export interface ChartGeometry {
  width: number;
  height: number;
  path: string;
  yTicks: Array<{ y: number; label: string }>;
  xTicks: Array<{ x: number; label: string }>;
  scale: 'linear' | 'log';
}

const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

/** Kova başına min ve maks'ı koruyarak en fazla ~2*buckets noktaya indirger. */
export function downsample(points: readonly ChartPoint[], buckets = 300): ChartPoint[] {
  if (points.length <= buckets * 2) return [...points];
  const size = points.length / buckets;
  const out: ChartPoint[] = [];
  for (let b = 0; b < buckets; b++) {
    const slice = points.slice(Math.floor(b * size), Math.floor((b + 1) * size));
    if (slice.length === 0) continue;
    let min = slice[0]!;
    let max = slice[0]!;
    for (const p of slice) {
      if (p.value < min.value) min = p;
      if (p.value > max.value) max = p;
    }
    if (min.date < max.date) out.push(min, max);
    else if (min === max) out.push(min);
    else out.push(max, min);
  }
  return out;
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

function labelFor(value: number): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8;
  return formatNumber(value.toFixed(digits), 0, digits);
}

export function buildChart(
  points: readonly ChartPoint[],
  options: { width?: number; height?: number; scale?: 'linear' | 'log'; xLabel?: (date: IsoDate) => string; xTickCount?: number } = {},
): ChartGeometry | null {
  if (points.length < 2) return null;
  const width = options.width ?? 720;
  const height = options.height ?? 260;
  const scale = options.scale ?? 'linear';
  const data = downsample(points);
  const tx = (v: number) => (scale === 'log' ? Math.log10(v) : v);
  const values = data.map((p) => tx(p.value));
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;
  const path = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(tx(p.value)).toFixed(1)}`).join('');
  const yTicks = niceTicks(min, max).map((v) => ({ y: y(v), label: labelFor(scale === 'log' ? 10 ** v : v) }));
  const xCount = Math.min(options.xTickCount ?? 5, data.length);
  const xLabel = options.xLabel ?? ((d: IsoDate) => d.slice(0, 4));
  const xTicks = Array.from({ length: xCount }, (_, k) => {
    const i = Math.round((k / Math.max(1, xCount - 1)) * (data.length - 1));
    return { x: x(i), label: xLabel(data[i]!.date) };
  });
  return { width, height, path, yTicks, xTicks, scale };
}

export const CHART_PADDING = PAD;
