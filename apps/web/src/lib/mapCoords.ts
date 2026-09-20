/**
 * Map plottable coordinates.
 *
 * IMPORTANT: never use Number.isFinite(Number(lat)) alone.
 * Number(null) === 0, which is finite — cleared Global junk (lat/lon null)
 * would otherwise all pin at null island [0, 0] in the Atlantic.
 */

export type LatLonLike = {
  lat: number | null | undefined;
  lon: number | null | undefined;
};

/** True when lat/lon are present, finite numbers, and not exact null-island [0,0]. */
export function hasPlottableCoords(lat: unknown, lon: unknown): boolean {
  // Reject null/undefined before Number() — Number(null) === 0 is finite.
  if (lat == null || lon == null) return false;
  if (lat === '' || lon === '') return false;
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  // Exact [0, 0] is null island (Number(null) trap / missing place). Real Gulf of
  // Guinea events are near but not exactly 0,0; require non-zero coords to plot.
  if (la === 0 && lo === 0) return false;
  return true;
}

/** Event must be explicitly map-eligible and have real coords. */
export function isEventMapPlottable(e: LatLonLike & { mapEligible?: boolean }): boolean {
  return e.mapEligible === true && hasPlottableCoords(e.lat, e.lon);
}

/** Postures are typed with required numbers; still guard at runtime. */
export function isPostureMapPlottable(p: LatLonLike): boolean {
  return hasPlottableCoords(p.lat, p.lon);
}
