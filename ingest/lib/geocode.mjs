/**
 * Keyword place → lat/lon/region helper for RSS / X-scroll / light normalize.
 * Prefer title matches over feed.region. Not full NER — ordered keyword scan.
 */

/** @typedef {{ lat: number, lon: number, region: string, place: string }} PlaceHit */

/** Longer / more specific phrases first so "Saudi capital" / "Bab el-Mandeb" win. */
const PLACES = [
  { keys: ['bab el-mandeb', 'bab el mandeb', 'bab-el-mandeb'], lat: 12.58, lon: 43.33, region: 'Red Sea / Bab el-Mandeb', place: 'Bab el-Mandeb' },
  { keys: ['strait of hormuz', 'hormuz'], lat: 26.57, lon: 56.25, region: 'Persian Gulf', place: 'Strait of Hormuz' },
  { keys: ['red sea'], lat: 20.0, lon: 38.5, region: 'Red Sea / Bab el-Mandeb', place: 'Red Sea' },
  { keys: ['black sea'], lat: 43.4, lon: 34.0, region: 'Eastern Europe', place: 'Black Sea' },
  { keys: ['saudi capital', 'riyadh'], lat: 24.71, lon: 46.68, region: 'Middle East', place: 'Riyadh' },
  { keys: ['yanbu'], lat: 24.09, lon: 38.06, region: 'Middle East', place: 'Yanbu' },
  { keys: ['saudi arabia', 'saudi'], lat: 24.71, lon: 46.68, region: 'Middle East', place: 'Saudi Arabia' },
  { keys: ['moscow', 'moskva'], lat: 55.76, lon: 37.62, region: 'Europe', place: 'Moscow' },
  { keys: ['kupiansk', 'kupyansk'], lat: 49.71, lon: 37.62, region: 'Eastern Europe', place: 'Kupiansk' },
  { keys: ['kyiv', 'kiev'], lat: 50.45, lon: 30.52, region: 'Eastern Europe', place: 'Kyiv' },
  { keys: ['odessa', 'odesa'], lat: 46.48, lon: 30.73, region: 'Eastern Europe', place: 'Odesa' },
  { keys: ['donetsk', 'donbas', 'donbass'], lat: 48.0, lon: 37.8, region: 'Eastern Europe', place: 'Donbas' },
  { keys: ['crimea', 'sevastopol'], lat: 44.95, lon: 34.1, region: 'Eastern Europe', place: 'Crimea' },
  { keys: ['tehran'], lat: 35.69, lon: 51.39, region: 'Middle East', place: 'Tehran' },
  { keys: ['iran'], lat: 32.43, lon: 53.69, region: 'Middle East', place: 'Iran' },
  { keys: ['taipei'], lat: 25.03, lon: 121.57, region: 'East / SE Asia', place: 'Taipei' },
  { keys: ['taiwan'], lat: 23.7, lon: 121.0, region: 'East / SE Asia', place: 'Taiwan' },
  { keys: ['beijing', 'peking'], lat: 39.9, lon: 116.4, region: 'East / SE Asia', place: 'Beijing' },
  { keys: ['south china sea'], lat: 12.0, lon: 114.0, region: 'East / SE Asia', place: 'South China Sea' },
  { keys: ['washington', 'white house', 'pentagon'], lat: 38.91, lon: -77.04, region: 'Americas', place: 'Washington' },
  { keys: ['gaza', 'rafah', 'khan younis'], lat: 31.5, lon: 34.47, region: 'Middle East', place: 'Gaza' },
  { keys: ['west bank', 'ramallah'], lat: 31.9, lon: 35.2, region: 'Middle East', place: 'West Bank' },
  { keys: ['israel', 'tel aviv', 'jerusalem'], lat: 31.78, lon: 35.22, region: 'Middle East', place: 'Israel' },
  { keys: ['beirut', 'lebanon'], lat: 33.89, lon: 35.5, region: 'Middle East', place: 'Lebanon' },
  { keys: ['damascus', 'syria'], lat: 33.51, lon: 36.29, region: 'Middle East', place: 'Syria' },
  { keys: ['sanaa', "sana'a", 'yemen', 'houthi'], lat: 15.35, lon: 44.21, region: 'Middle East', place: 'Yemen' },
  { keys: ['baghdad', 'iraq'], lat: 33.31, lon: 44.37, region: 'Middle East', place: 'Iraq' },
  { keys: ['cairo', 'egypt'], lat: 30.04, lon: 31.24, region: 'Africa', place: 'Egypt' },
  { keys: ['khartoum', 'sudan'], lat: 15.5, lon: 32.56, region: 'Africa', place: 'Sudan' },
  { keys: ['islamabad', 'pakistan'], lat: 33.68, lon: 73.05, region: 'South Asia', place: 'Pakistan' },
  { keys: ['new delhi', 'delhi', 'india'], lat: 28.61, lon: 77.21, region: 'South Asia', place: 'India' },
  { keys: ['pyongyang', 'north korea', 'dprk'], lat: 39.04, lon: 125.76, region: 'East / SE Asia', place: 'North Korea' },
  { keys: ['seoul', 'south korea'], lat: 37.57, lon: 126.98, region: 'East / SE Asia', place: 'South Korea' },
  { keys: ['tokyo', 'japan'], lat: 35.68, lon: 139.69, region: 'East / SE Asia', place: 'Japan' },
  { keys: ['manila', 'philippines'], lat: 14.6, lon: 120.98, region: 'East / SE Asia', place: 'Philippines' },
  { keys: ['london', 'united kingdom'], lat: 51.51, lon: -0.13, region: 'Europe', place: 'London' },
  { keys: ['paris', 'france'], lat: 48.86, lon: 2.35, region: 'Europe', place: 'Paris' },
  { keys: ['berlin', 'germany'], lat: 52.52, lon: 13.4, region: 'Europe', place: 'Berlin' },
  { keys: ['warsaw', 'poland'], lat: 52.23, lon: 21.01, region: 'Europe', place: 'Warsaw' },
  { keys: ['ukraine', 'ukrainian'], lat: 49.0, lon: 32.0, region: 'Eastern Europe', place: 'Ukraine' },
  { keys: ['russia', 'russian'], lat: 55.76, lon: 37.62, region: 'Europe', place: 'Russia' },
];

const REGION_FALLBACK = {
  Global: { lat: 20, lon: 0, region: 'Global' },
  'Middle East': { lat: 29, lon: 45, region: 'Middle East' },
  Europe: { lat: 50, lon: 10, region: 'Europe' },
  'Eastern Europe': { lat: 49, lon: 32, region: 'Eastern Europe' },
  Americas: { lat: 38, lon: -95, region: 'Americas' },
  Africa: { lat: 5, lon: 20, region: 'Africa' },
  'East / SE Asia': { lat: 15, lon: 105, region: 'East / SE Asia' },
  'South Asia': { lat: 22, lon: 78, region: 'South Asia' },
  'Red Sea / Bab el-Mandeb': { lat: 14.5, lon: 42.5, region: 'Red Sea / Bab el-Mandeb' },
  'Persian Gulf': { lat: 26.5, lon: 56, region: 'Persian Gulf' },
};

/**
 * Scan text for first matching place keyword (case-insensitive).
 * @param {string} text
 * @returns {PlaceHit | null}
 */
export function geocodeFromText(text) {
  const hay = String(text || '').toLowerCase();
  if (!hay.trim()) return null;
  for (const p of PLACES) {
    for (const key of p.keys) {
      if (hay.includes(key)) {
        return { lat: p.lat, lon: p.lon, region: p.region, place: p.place };
      }
    }
  }
  return null;
}

/**
 * Prefer title hits, then summary, then feed/default region coords (+ optional jitter).
 * @param {{ title?: string, summary?: string, region?: string, jitterIndex?: number, jitterSalt?: string }} opts
 */
export function resolveEventGeo(opts = {}) {
  const titleHit = geocodeFromText(opts.title || '');
  if (titleHit) return { ...titleHit, matchedFrom: 'title' };
  const summaryHit = geocodeFromText(opts.summary || '');
  if (summaryHit) return { ...summaryHit, matchedFrom: 'summary' };

  const fb = REGION_FALLBACK[opts.region] || REGION_FALLBACK.Global;
  const salt = String(opts.jitterSalt || opts.title || '');
  const i = Number(opts.jitterIndex) || 0;
  let hash = 0;
  for (let c = 0; c < salt.length; c++) hash = (hash * 31 + salt.charCodeAt(c)) | 0;
  const jLat = ((((Math.abs(hash) * 17 + i * 13) % 100) / 100) - 0.5) * 8;
  const jLon = ((((Math.abs(hash) * 29 + i * 7) % 100) / 100) - 0.5) * 12;
  return {
    lat: fb.lat + jLat,
    lon: fb.lon + jLon,
    region: fb.region,
    place: null,
    matchedFrom: 'region-fallback',
  };
}

/** Coords near Global base [20,0] with RSS-style jitter, or region tagged Global. */
export function looksLikeGlobalJitter(lat, lon, region) {
  if (region === 'Global') return true;
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return true;
  return la > 12 && la < 28 && lo > -10 && lo < 10;
}

/**
 * Re-geocode events on wrong Global jitter when title/summary clearly names a place.
 * Title matches preferred.
 * @param {Array<object>} events
 */
export function regeocodeWrongGlobal(events) {
  let fixed = 0;
  const out = events.map((e) => {
    if (!looksLikeGlobalJitter(e.lat, e.lon, e.region)) return e;
    const hit = geocodeFromText(e.title || '') || geocodeFromText(e.summary || '');
    if (!hit) return e;
    fixed++;
    return { ...e, lat: hit.lat, lon: hit.lon, region: hit.region };
  });
  return { events: out, fixed };
}

export { PLACES, REGION_FALLBACK };
