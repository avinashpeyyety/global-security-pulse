/**
 * Sharp, Traceburst-style map markers.
 *
 * - Event circles are native MapLibre WebGL circles (vector, re-rasterised per frame at the
 *   map's devicePixelRatio), so they stay crisp at any zoom / HiDPI. No circle-blur anywhere.
 * - Posture triangles are drawn on a canvas at >= 2x devicePixelRatio and registered with
 *   `pixelRatio`, replacing the old 32px SDF raster (which was soft at HiDPI).
 * - Severity → size (sqrt-ish, small range); risk band → restrained slate palette with the
 *   single sky-blue accent for critical; thin ring outline; a crisp outer halo ring for critical.
 */
import type { FalloutRisk } from '@gsp/shared';
import { MARKER_RISK_COLORS, RISK_RANK } from '@gsp/shared';

export const MARKER_BG = '#0b0e11';
export const ACCENT = '#7dd3fc';

/** Logical-pixel radius at zoom ~3. Range ≈ 3.6 (low, sev 1) → 10.5 (critical, sev 5). */
export function markerRadius(severity: number, risk: FalloutRisk): number {
  const sev = Math.max(1, Math.min(5, Number(severity) || 1));
  return +(3 + RISK_RANK[risk] * 1.5 + sev * 0.6).toFixed(2);
}

export function markerPixelRatio(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return Math.max(2, Math.ceil(dpr));
}

/** Logical edge length of the posture triangle per band. */
export const TRIANGLE_SIZE: Record<FalloutRisk, number> = { low: 9, medium: 10, high: 12, critical: 14 };

export function postureImageId(risk: FalloutRisk): string {
  return `posture-tri-${risk}`;
}

/** Crisp triangle bitmap drawn at `pr` device pixels per logical pixel. */
export function makeTriangleImage(
  risk: FalloutRisk,
  pr = markerPixelRatio(),
): { width: number; height: number; data: Uint8Array; pixelRatio: number } {
  const logical = TRIANGLE_SIZE[risk] + 4; // pad for outline / halo ring
  const px = Math.round(logical * pr);
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(pr, 0, 0, pr, 0, 0);
  const s = TRIANGLE_SIZE[risk];
  const ox = (logical - s) / 2;
  const top = (logical - s * 0.9) / 2;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(ox + s / 2, top);
    ctx.lineTo(ox + s, top + s * 0.9);
    ctx.lineTo(ox, top + s * 0.9);
    ctx.closePath();
  };
  const c = MARKER_RISK_COLORS[risk];
  ctx.lineJoin = 'miter';
  // dark keyline separates overlapping shapes
  path();
  ctx.strokeStyle = MARKER_BG;
  ctx.lineWidth = 2;
  ctx.stroke();
  path();
  ctx.fillStyle = c.fill;
  ctx.globalAlpha = 0.95;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = c.ring;
  ctx.lineWidth = 0.75;
  ctx.stroke();
  const img = ctx.getImageData(0, 0, px, px);
  return { width: px, height: px, data: new Uint8Array(img.data.buffer), pixelRatio: pr };
}
