/**
 * Impact-first place → lat/lon/region helper for RSS / X-scroll / normalize.
 * Prefer title impact hits over summary; never pin Global [20,0] jitter.
 * Map markers require place coords + kinetic/impact language (mapEligible).
 * Diplomacy, elections, welfare, generic UKMTO/VRA PDFs stay off-map.
 */

/** @typedef {{ lat: number, lon: number, region: string, place: string }} PlaceHit */
/** @typedef {PlaceHit & { matchedFrom: string, mapEligible?: boolean }} GeoResolve */

/** Longer / more specific phrases first so "Saudi capital" / "Bab el-Mandeb" win. */
const PLACES = [
  { keys: ['bab el-mandeb', 'bab el mandeb', 'bab-el-mandeb'], lat: 12.58, lon: 43.33, region: 'Red Sea / Bab el-Mandeb', place: 'Bab el-Mandeb' },
  { keys: ['strait of hormuz', 'hormuz'], lat: 26.57, lon: 56.25, region: 'Persian Gulf', place: 'Strait of Hormuz' },
  { keys: ['red sea'], lat: 20.0, lon: 38.5, region: 'Red Sea / Bab el-Mandeb', place: 'Red Sea' },
  { keys: ['black sea'], lat: 43.4, lon: 34.0, region: 'Eastern Europe', place: 'Black Sea' },
  { keys: ['saudi capital', 'riyadh'], lat: 24.71, lon: 46.68, region: 'Middle East', place: 'Riyadh' },
  { keys: ['yanbu'], lat: 24.09, lon: 38.06, region: 'Middle East', place: 'Yanbu' },
  { keys: ['aramco', 'dhahran', 'ras tanura'], lat: 26.3, lon: 50.15, region: 'Middle East', place: 'Aramco / Dhahran' },
  { keys: ['jeddah', 'jiddah'], lat: 21.49, lon: 39.19, region: 'Middle East', place: 'Jeddah' },
  { keys: ['mecca', 'makkah'], lat: 21.39, lon: 39.86, region: 'Middle East', place: 'Mecca' },
  { keys: ['saudi arabia', 'saudi', 'saudis'], lat: 24.71, lon: 46.68, region: 'Middle East', place: 'Saudi Arabia' },
  { keys: ['doha', 'qatar', 'qatari'], lat: 25.29, lon: 51.53, region: 'Middle East', place: 'Qatar' },
  { keys: ['moscow', 'moskva'], lat: 55.76, lon: 37.62, region: 'Europe', place: 'Moscow' },
  { keys: ['st petersburg', 'saint petersburg', 'leningrad'], lat: 59.93, lon: 30.33, region: 'Europe', place: 'St Petersburg' },
  { keys: ['kupiansk', 'kupyansk'], lat: 49.71, lon: 37.62, region: 'Eastern Europe', place: 'Kupiansk' },
  { keys: ['kharkiv', 'kharkov'], lat: 49.99, lon: 36.23, region: 'Eastern Europe', place: 'Kharkiv' },
  { keys: ['kherson'], lat: 46.64, lon: 32.62, region: 'Eastern Europe', place: 'Kherson' },
  { keys: ['zaporizhzhia', 'zaporizhia', 'zaporozhye'], lat: 47.84, lon: 35.14, region: 'Eastern Europe', place: 'Zaporizhzhia' },
  { keys: ['mariupol'], lat: 47.1, lon: 37.55, region: 'Eastern Europe', place: 'Mariupol' },
  { keys: ['lviv', 'lvov'], lat: 49.84, lon: 24.03, region: 'Eastern Europe', place: 'Lviv' },
  { keys: ['kyiv', 'kiev'], lat: 50.45, lon: 30.52, region: 'Eastern Europe', place: 'Kyiv' },
  { keys: ['odessa', 'odesa'], lat: 46.48, lon: 30.73, region: 'Eastern Europe', place: 'Odesa' },
  { keys: ['donetsk', 'donbas', 'donbass'], lat: 48.0, lon: 37.8, region: 'Eastern Europe', place: 'Donbas' },
  { keys: ['crimea', 'sevastopol'], lat: 44.95, lon: 34.1, region: 'Eastern Europe', place: 'Crimea' },
  { keys: ['tel aviv', 'tel-aviv'], lat: 32.09, lon: 34.78, region: 'Middle East', place: 'Tel Aviv' },
  { keys: ['jerusalem'], lat: 31.78, lon: 35.22, region: 'Middle East', place: 'Jerusalem' },
  { keys: ['tehran'], lat: 35.69, lon: 51.39, region: 'Middle East', place: 'Tehran' },
  { keys: ['bandar abbas'], lat: 27.18, lon: 56.28, region: 'Persian Gulf', place: 'Bandar Abbas' },
  { keys: ['iran', 'iranian', 'irgc'], lat: 32.43, lon: 53.69, region: 'Middle East', place: 'Iran' },
  { keys: ['taipei'], lat: 25.03, lon: 121.57, region: 'East / SE Asia', place: 'Taipei' },
  { keys: ['taiwan', 'taiwan strait'], lat: 23.7, lon: 121.0, region: 'East / SE Asia', place: 'Taiwan' },
  { keys: ['beijing', 'peking'], lat: 39.9, lon: 116.4, region: 'East / SE Asia', place: 'Beijing' },
  { keys: ['south china sea'], lat: 12.0, lon: 114.0, region: 'East / SE Asia', place: 'South China Sea' },
  { keys: ['washington', 'white house', 'pentagon'], lat: 38.91, lon: -77.04, region: 'Americas', place: 'Washington' },
  { keys: ['louisiana', 'new orleans', 'baton rouge'], lat: 30.98, lon: -91.96, region: 'Americas', place: 'Louisiana' },
  { keys: ['greenland'], lat: 72.0, lon: -40.0, region: 'Americas', place: 'Greenland' },
  { keys: ['gaza', 'rafah', 'khan younis'], lat: 31.5, lon: 34.47, region: 'Middle East', place: 'Gaza' },
  { keys: ['west bank', 'ramallah'], lat: 31.9, lon: 35.2, region: 'Middle East', place: 'West Bank' },
  { keys: ['israel', 'israeli', 'idf'], lat: 31.78, lon: 35.22, region: 'Middle East', place: 'Israel' },
  { keys: ['beirut', 'lebanon', 'lebanese', 'hezbollah'], lat: 33.89, lon: 35.5, region: 'Middle East', place: 'Lebanon' },
  { keys: ['damascus', 'syria', 'syrian'], lat: 33.51, lon: 36.29, region: 'Middle East', place: 'Syria' },
  { keys: ['hodeidah', 'hudaydah', 'aden'], lat: 14.8, lon: 42.95, region: 'Red Sea / Bab el-Mandeb', place: 'Yemen coast' },
  { keys: ['sanaa', "sana'a", 'yemen', 'houthi', 'houthis'], lat: 15.35, lon: 44.21, region: 'Middle East', place: 'Yemen' },
  { keys: ['baghdad', 'iraq', 'iraqi'], lat: 33.31, lon: 44.37, region: 'Middle East', place: 'Iraq' },
  { keys: ['cairo', 'egypt', 'egyptian'], lat: 30.04, lon: 31.24, region: 'Africa', place: 'Egypt' },
  { keys: ['khartoum', 'sudan', 'sudanese'], lat: 15.5, lon: 32.56, region: 'Africa', place: 'Sudan' },
  { keys: ['sahel'], lat: 15.5, lon: 0.0, region: 'Africa', place: 'Sahel' },
  { keys: ['mali', 'bamako'], lat: 12.64, lon: -8.0, region: 'Africa', place: 'Mali' },
  // "niger" alone — word-boundary so it does NOT match "nigeria"/"nigerian"
  { keys: ['niger', 'niamey'], lat: 13.51, lon: 2.11, region: 'Africa', place: 'Niger' },
  { keys: ['burkina', 'burkina faso', 'ouagadougou'], lat: 12.37, lon: -1.53, region: 'Africa', place: 'Burkina Faso' },
  { keys: ['nigeria', 'nigerian', 'lagos', 'abuja'], lat: 9.08, lon: 8.68, region: 'Africa', place: 'Nigeria' },
  { keys: ['malawi'], lat: -13.25, lon: 34.3, region: 'Africa', place: 'Malawi' },
  { keys: ['equatorial guinea', 'malabo'], lat: 1.65, lon: 10.27, region: 'Africa', place: 'Equatorial Guinea' },
  { keys: ['nepal', 'nepalese', 'nepali', 'kathmandu'], lat: 27.72, lon: 85.32, region: 'South Asia', place: 'Nepal' },
  { keys: ['greece', 'greek', 'athens'], lat: 37.98, lon: 23.73, region: 'Europe', place: 'Greece' },
  { keys: ['haiti', 'port-au-prince', 'haitian'], lat: 18.59, lon: -72.31, region: 'Americas', place: 'Haiti' },
  { keys: ['bolivia', 'bolivian', 'la paz'], lat: -16.5, lon: -68.15, region: 'Americas', place: 'Bolivia' },
  { keys: ['brazil', 'brasilia', 'brazilian', 'lula'], lat: -15.79, lon: -47.88, region: 'Americas', place: 'Brazil' },
  { keys: ['islamabad', 'pakistan', 'pakistani'], lat: 33.68, lon: 73.05, region: 'South Asia', place: 'Pakistan' },
  { keys: ['new delhi', 'delhi', 'india', 'indian'], lat: 28.61, lon: 77.21, region: 'South Asia', place: 'India' },
  { keys: ['pyongyang', 'north korea', 'dprk'], lat: 39.04, lon: 125.76, region: 'East / SE Asia', place: 'North Korea' },
  { keys: ['seoul', 'south korea', 'korean peninsula'], lat: 37.57, lon: 126.98, region: 'East / SE Asia', place: 'South Korea' },
  { keys: ['tokyo', 'japan', 'japanese'], lat: 35.68, lon: 139.69, region: 'East / SE Asia', place: 'Japan' },
  { keys: ['manila', 'philippines', 'philippine'], lat: 14.6, lon: 120.98, region: 'East / SE Asia', place: 'Philippines' },
  { keys: ['strasbourg'], lat: 48.57, lon: 7.75, region: 'Europe', place: 'Strasbourg' },
  { keys: ['london', 'united kingdom', 'britain', 'british', 'uk '], lat: 51.51, lon: -0.13, region: 'Europe', place: 'London' },
  { keys: ['paris', 'france', 'french'], lat: 48.86, lon: 2.35, region: 'Europe', place: 'Paris' },
  { keys: ['berlin', 'germany', 'german', 'bundeswehr'], lat: 52.52, lon: 13.4, region: 'Europe', place: 'Berlin' },
  { keys: ['warsaw', 'poland', 'polish'], lat: 52.23, lon: 21.01, region: 'Europe', place: 'Warsaw' },
  { keys: ['ukraine', 'ukrainian'], lat: 49.0, lon: 32.0, region: 'Eastern Europe', place: 'Ukraine' },
  { keys: ['russia', 'russian', 'kremlin'], lat: 55.76, lon: 37.62, region: 'Europe', place: 'Russia' },
];

/** Region labels only — NEVER used as map pin coords (no Global [20,0] jitter). */
const REGION_FALLBACK = {
  Global: { lat: null, lon: null, region: 'Global' },
  'Middle East': { lat: null, lon: null, region: 'Middle East' },
  Europe: { lat: null, lon: null, region: 'Europe' },
  'Eastern Europe': { lat: null, lon: null, region: 'Eastern Europe' },
  Americas: { lat: null, lon: null, region: 'Americas' },
  Africa: { lat: null, lon: null, region: 'Africa' },
  'East / SE Asia': { lat: null, lon: null, region: 'East / SE Asia' },
  'South Asia': { lat: null, lon: null, region: 'South Asia' },
  'Red Sea / Bab el-Mandeb': { lat: null, lon: null, region: 'Red Sea / Bab el-Mandeb' },
  'Persian Gulf': { lat: null, lon: null, region: 'Persian Gulf' },
};

/** Verbs / context that mark an impact location nearby in text. */
const IMPACT_CONTEXT =
  /\b(attack|attacks|attacked|strike|strikes|struck|missile|missiles|drone|drones|bomb|bombs|bombed|bombing|intercept|intercepted|interception|hit|hits|hitting|targeted|targeting|target|explosion|explode|exploded|invasion|invade|invaded|shelling|shelled|killed|killing|deaths?|fire|fires|burning|over|near|above|in|at|from|towards|toward|against|raid|raids|raided|assault|assaulted|bombard|ballistic|rocket|rockets|artillery|airstrike|airstrikes|warhead|clash|clashes|offensive|defensive|flood|floods|flooding|earthquake|quake|tsunami|wildfire|cyclone|hurricane|typhoon|sinking|hijack|hijacked|piracy|blockade|mine|mined|ied)\b/i;

const SECURITY_SIGNAL =
  /\b(war|warfare|conflict|combat|military|army|navy|air\s*force|troops?|soldier|forces?|militia|insurgent|rebel|coup|junta|nato|pentagon|missile|drone|bomb|airstrike|shelling|artillery|invasion|occupy|occupied|occupation|attack|terror|terrorism|isis|islamic\s*state|al-?qaeda|houthis?|hezbollah|hamas|idf|irgc|nuclear|sanctions?|embargo|blockade|chokepoint|hormuz|bab\s*el-?mandeb|piracy|hijack|maritime|warship|destroyer|frigate|carrier|submarine|cyber\s*(attack|war|espionage|ops)?|ransomware|nation[- ]state|espionage|sabotage|assassination|hostage|kidnap|killed|killing|murder|ied|vbiied|car\s*bomb|suicide\s*bomb|mass\s*casualty|genocide|ethnic\s*cleansing|refugee\s*crisis|humanitarian\s*crisis|famine|earthquake|flood|floods|flooding|tsunami|wildfire|cyclone|hurricane|typhoon|volcano|outbreak|pandemic|chemical\s*weapon|biological\s*weapon|wmd|ballistic|hypersonic|airspace|no[- ]fly|ceasefire|armistice|peacekeeping|un\s*security|security\s*council|gulf\s*security|defense|defence|deterrence|mobilization|mobilisation|conscription|martial\s*law|curfew|riot|uprising|insurrection|separatist|annex|annexation|frontline|front\s*line|trench|drone\s*swarm|air\s*defense|air\s*defence|intercept|radar|satellite\s*weapon|space\s*weapon|on[- ]orbit|extradit|trial|islamic\s*state)\b/i;

const NON_SECURITY =
  /\b(sunlounger|sunbed|beach\s*fight|parakeet|converse|advert|advertisement|sneaker|fashion|golf|pga|nfl|nba|mlb|nhl|premier\s*league|champions\s*league|super\s*bowl|touchdown|running\s*back|quarterback|wide\s*receiver|bucs|browns|falcons|49ers|workout|sport|sports|football|soccer|basketball|baseball|tennis|olympics?|celebrity|red\s*carpet|hollywood|podcast\s*post|cat\s*species|feline|house\s*fire|firefighter|married|wedding|head\s*teacher|abuser|justice|netflix|hollywood|streaming|box\s*office|album|concert|festival\s*ticket|recipe|restaurant|travel\s*guide|holiday|vacation|lifestyle)\b/i;

/**
 * Kinetic / physical impact / named-area military activity required for map pins.
 * Deliberately narrower than SECURITY_SIGNAL (no bare nato/military/sanctions/talks).
 */
const MAP_IMPACT =
  /\b(attack|attacks|attacked|strike|strikes|struck|missile|missiles|drone|drones|bomb|bombs|bombed|bombing|ied|vbiied|car\s*bomb|shelling|shelled|artillery|airstrike|airstrikes|rocket|rockets|ballistic|invasion|invade|invaded|combat|clash|clashes|skirmish|offensive|raid|raids|raided|assault|intercept|intercepted|interception|explosion|explode|exploded|blast|blasts|killed|killing|wounded|casualt(?:y|ies)|shootout|shot\s*dead|gunfire|firefight|mortar|pirate|piracy|boarding|hijack|hijacked|collision|collided|sinking|sunk|mine|mined|blockade|drone\s*swarm|live[- ]?fire|drill|drills|military\s*exercise|war\s*game|war\s*games|earthquake|quake|tsunami|flood|floods|flooding|wildfire|cyclone|hurricane|typhoon|volcano|kidnap|kidnapped|hostage|assassination|assassinated|ransomware|cyber\s*intrusion|scada|war\s+on\s+iran|war\s+with\s+iran|war\s+on\s+israel)\b/i;

/** Maritime incident language — required to pin water/chokepoint centroids. */
const MARITIME_INCIDENT =
  /\b(attack|attacks|attacked|boarding|collision|collided|missile|missiles|drone|drones|swarm|hijack|hijacked|piracy|pirate|struck|strike|strikes|explosion|explode|exploded|sinking|sunk|intercept|intercepted|shelling|bomb|bombed|ied|raid)\b/i;

/** Diplomacy / elections / welfare / legal process / fundraising — never map-pin. */
const MAP_EXCLUDE =
  /\b(election|elections|electoral|welfare|weight[- ]?loss|membership|pardons?|pardoned|plans?\s+to\s+build|stronger\s+ties|bilateral\s+talks?|revive\s+[\w\s-]{0,40}talks?|talks?\s+with|working\s+to\s+revive|diplomatic\s+spat|visa\s+bans?|all\s+smiles|associate\s+member|security\s+framework|framework\s+with|UNSC\s+session|ceasefire\s+draft|designation\s+list|secondary\s+sanctions|welcomes?\s+.{0,40}deal|permanent\s+security\s+control|extradit(?:ed|ion|ing|es)?|opens?\s+trial|trial\s+of|arrested\s+in\s+connection|raises?\s+thousands|fundrais(?:e|ing|er)?|how\s+will\b|ahead\s+of\s+election|state\s+election|vows?\s+to\s+stay|announce[sd]?\s+higher\s+welfare|anti-?austerity\s+protest|protest\s+escalation|tear\s*gas|capital\s+square|port\s+strike|labour\s+strike|labor\s+strike)\b/i;

/** Water-basin / chokepoint place labels — pin only when title is a real incident. */
const WATER_BASIN_PLACES = new Set([
  'Red Sea',
  'Black Sea',
  'South China Sea',
  'Bab el-Mandeb',
  'Strait of Hormuz',
]);


function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Word-boundary-ish includes (avoids niger⊂nigerian, iran⊂iranian handled via explicit keys). */
function keyIndex(hay, key) {
  const k = String(key).toLowerCase();
  if (!k) return -1;
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRe(k)}(?=[^a-z0-9]|$)`, 'i');
  const m = re.exec(hay);
  return m ? m.index + (m[0].length > k.length ? m[0].length - k.length : 0) : -1;
}

/**
 * All place hits in text with character index (first key match per place entry).
 * @param {string} text
 * @returns {Array<PlaceHit & { index: number, key: string }>}
 */
export function findPlaceHits(text) {
  const hay = String(text || '').toLowerCase();
  if (!hay.trim()) return [];
  /** @type {Array<PlaceHit & { index: number, key: string }>} */
  const hits = [];
  for (const p of PLACES) {
    let best = -1;
    let bestKey = '';
    for (const key of p.keys) {
      const idx = keyIndex(hay, key);
      if (idx >= 0 && (best < 0 || idx < best)) {
        best = idx;
        bestKey = key;
      }
    }
    if (best >= 0) {
      hits.push({ lat: p.lat, lon: p.lon, region: p.region, place: p.place, index: best, key: bestKey });
    }
  }
  hits.sort((a, b) => a.index - b.index || b.key.length - a.key.length);
  return hits;
}

/**
 * Scan text for best place: prefer impact-context proximity, else first keyword.
 * @param {string} text
 * @returns {(PlaceHit & { impact: boolean }) | null}
 */
export function geocodeFromText(text) {
  const hay = String(text || '');
  const hits = findPlaceHits(hay);
  if (!hits.length) return null;

  const lower = hay.toLowerCase();

  // Prep + place: "attack on Moscow", "fire in Louisiana", "over Kyiv"
  const prepRe = /\b(?:on|in|at|over|near|above|towards|toward|against|into|from)\s+/gi;
  const prepEnds = [];
  let pm;
  while ((pm = prepRe.exec(lower)) !== null) {
    prepEnds.push(pm.index + pm[0].length);
  }

  const impactRe = new RegExp(IMPACT_CONTEXT.source, 'gi');
  const impactIdxs = [];
  let m;
  while ((m = impactRe.exec(lower)) !== null) {
    impactIdxs.push({ index: m.index, len: m[0].length, word: m[0].toLowerCase() });
  }

  function scoreHit(hit) {
    let score = 0;
    let impact = false;
    // Strong: place starts within 0..24 chars after a location prep
    for (const pe of prepEnds) {
      const gap = hit.index - pe;
      if (gap >= 0 && gap <= 24) {
        score += 100 - gap;
        impact = true;
      }
    }
    // Strong: place shortly AFTER attack/strike/hit/targeted/bomb/explosion/killed
    for (const ii of impactIdxs) {
      const after = hit.index - (ii.index + ii.len);
      const dist = Math.abs(hit.index - ii.index);
      if (after >= 0 && after <= 48) {
        score += 80 - after;
        impact = true;
      } else if (dist <= 56) {
        score += 40 - dist / 2;
        impact = true;
      }
    }
    // Slight preference for earlier mentions when scores tie
    score += Math.max(0, 10 - hit.index / 20);
    // Longer key = more specific
    score += Math.min(hit.key.length, 20) / 10;
    return { score, impact };
  }

  let best = null;
  for (const hit of hits) {
    const { score, impact } = scoreHit(hit);
    if (!best || score > best.score) {
      best = { hit, score, impact };
    }
  }
  const h = best.hit;
  return {
    lat: h.lat,
    lon: h.lon,
    region: h.region,
    place: h.place,
    impact: best.impact || best.score >= 40,
  };
}

/**
 * Lifestyle / sports / entertainment — never map-pin.
 * @param {string} text
 */
export function isNonSecurityNoise(text) {
  return NON_SECURITY.test(String(text || ''));
}

/**
 * Diplomacy / elections / welfare / pure talks — never map-pin.
 * @param {string} text
 */
export function isMapExcluded(text) {
  return MAP_EXCLUDE.test(String(text || ''));
}

/**
 * Kinetic / disaster / drill impact language for map pins.
 * @param {string} text
 */
export function hasMapImpactLanguage(text) {
  return MAP_IMPACT.test(String(text || ''));
}

/**
 * Generic UKMTO/JMIC/VRA PDF or transit advisory without an incident in the title.
 * @param {string} title
 * @param {string} [summary]
 */
export function isGenericMaritimeAdvisory(title, summary = '') {
  const t = String(title || '');
  const hay = `${t} ${summary || ''}`;
  const looks =
    /\b(UKMTO|JMIC|VRA\s*Overview|ADVISORY\s*NOTE|Warning\s+\d{1,4}\/\d{2}|transit\s+advisory)\b/i.test(
      hay,
    ) || /\bPDF\b/i.test(t);
  if (!looks) return false;
  // Title must name a real maritime incident to stay on the map.
  if (MARITIME_INCIDENT.test(t)) return false;
  return true;
}

/**
 * Mid-ocean / basin centroid pins (Red Sea, North Sea seed, named water basins).
 * @param {unknown} lat
 * @param {unknown} lon
 * @param {string|null|undefined} place
 */
export function isWaterOrMidOceanPin(lat, lon, place) {
  if (place && WATER_BASIN_PLACES.has(String(place))) return true;
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  // Seed North Sea centroid
  if (Math.abs(la - 56.5) < 0.75 && Math.abs(lo - 3.5) < 0.75) return true;
  // Canonical Red Sea water centroid from PLACES
  if (Math.abs(la - 20) < 0.75 && Math.abs(lo - 38.5) < 0.75) return true;
  return false;
}

/**
 * Conflict / security / disaster / maritime / cyber-nation-state signals.
 * Used for feed tagging — NOT alone sufficient for map pins (see computeMapEligible).
 * @param {string} text
 * @param {string} [layer]
 * @param {string} [falloutRisk]
 */
export function hasSecuritySignal(text, layer, falloutRisk) {
  const hay = String(text || '');
  if (isNonSecurityNoise(hay)) return false;
  if (SECURITY_SIGNAL.test(hay)) return true;
  const lay = String(layer || '').toLowerCase();
  if (['terrorism', 'maritime', 'sanctions', 'cyber'].includes(lay) && !isNonSecurityNoise(hay)) {
    // cyber alone needs nation-state / attack flavour unless fallout elevated
    if (lay === 'cyber') {
      return /\b(nation[- ]state|espionage|ransomware|critical\s*infrastructure|grid|pipeline|military|defense|defence|ministry|government)\b/i.test(
        hay,
      );
    }
    return true;
  }
  const risk = String(falloutRisk || '').toLowerCase();
  if ((risk === 'medium' || risk === 'high' || risk === 'critical') && SECURITY_SIGNAL.test(hay)) return true;
  return false;
}

/**
 * Whether an event with resolved place coords should appear on the SecurityMap.
 * Strict: place/coords + kinetic/impact language; never pure diplomacy / generic PDFs.
 * Layer alone or falloutRisk alone is NOT enough.
 */
export function computeMapEligible(opts = {}) {
  const title = String(opts.title || '');
  const summary = String(opts.summary || '');
  const text = `${title} ${summary} ${opts.curatedSummary || ''}`;
  const place = opts.place != null && opts.place !== '' && opts.place !== 'gdelt' ? opts.place : null;
  const hasPlace = opts.hasPlace === true || place != null;
  const latOk = Number.isFinite(Number(opts.lat));
  const lonOk = Number.isFinite(Number(opts.lon));
  if (!hasPlace || !latOk || !lonOk) return false;
  if (isNonSecurityNoise(text)) return false;
  if (isMapExcluded(text)) return false;
  if (isGenericMaritimeAdvisory(title, summary)) return false;
  // Require kinetic / disaster / drill / cyber-intrusion language (not bare "nato"/"security").
  if (!hasMapImpactLanguage(text)) return false;
  // Water / mid-ocean centroids: title must indicate a real maritime incident.
  if (isWaterOrMidOceanPin(opts.lat, opts.lon, place)) {
    if (!MARITIME_INCIDENT.test(title)) return false;
  }
  // Drop pure sanctions layer unless kinetic verbs present (prefer drop designation lists).
  const lay = String(opts.layer || '').toLowerCase();
  if (lay === 'sanctions' && !/\b(attack|strike|missile|drone|bomb|shelling|invasion|boarding|collision|ied|artillery|airstrike)\b/i.test(text)) {
    return false;
  }
  return true;
}

/**
 * Prefer title impact hits, then title any place, then summary impact, then summary place.
 * Never uses feed region "Global" / account regionHint as map coords.
 * @param {{ title?: string, summary?: string, region?: string, layer?: string, falloutRisk?: string, curatedSummary?: string, jitterIndex?: number, jitterSalt?: string, regionHint?: string }} opts
 * @returns {GeoResolve}
 */
export function resolveEventGeo(opts = {}) {
  // Explicitly ignore regionHint / feed Global for coordinates
  const title = opts.title || '';
  const summary = opts.summary || '';

  const titleHit = geocodeFromText(title);
  if (titleHit) {
    const mapEligible = computeMapEligible({
      title,
      summary,
      curatedSummary: opts.curatedSummary,
      layer: opts.layer,
      falloutRisk: opts.falloutRisk,
      lat: titleHit.lat,
      lon: titleHit.lon,
      place: titleHit.place,
      hasPlace: true,
    });
    return {
      lat: titleHit.lat,
      lon: titleHit.lon,
      region: titleHit.region,
      place: titleHit.place,
      matchedFrom: titleHit.impact ? 'title-impact' : 'title',
      mapEligible,
    };
  }

  const summaryHit = geocodeFromText(summary);
  if (summaryHit) {
    const mapEligible = computeMapEligible({
      title,
      summary,
      curatedSummary: opts.curatedSummary,
      layer: opts.layer,
      falloutRisk: opts.falloutRisk,
      lat: summaryHit.lat,
      lon: summaryHit.lon,
      place: summaryHit.place,
      hasPlace: true,
    });
    return {
      lat: summaryHit.lat,
      lon: summaryHit.lon,
      region: summaryHit.region,
      place: summaryHit.place,
      matchedFrom: summaryHit.impact ? 'summary-impact' : 'summary',
      mapEligible,
    };
  }

  // No place keyword — do NOT jitter Global [20,0]. Keep region label only.
  const regionLabel =
    opts.region && opts.region !== 'Global'
      ? opts.region
      : REGION_FALLBACK[opts.region]?.region || 'Global';
  return {
    lat: null,
    lon: null,
    region: regionLabel,
    place: null,
    matchedFrom: 'none',
    mapEligible: false,
  };
}

/**
 * Coords that look like the old Global [20,0] ±jitter cluster (not real Sahel with place).
 * Sahel true hits are ~[15.5, 0] but carry place/region Africa from keyword — callers
 * should prefer place-based eligibility over this heuristic alone.
 */
export function looksLikeGlobalJitter(lat, lon, region) {
  // null/undefined coords are "unset", not Global jitter pins
  if (lat == null || lon == null || lat === '' || lon === '') {
    return region === 'Global';
  }
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    return region === 'Global';
  }
  // Old RSS jitter envelope around [20,0] (excludes Red Sea lon~38, Nigeria lat~9)
  if (la > 12 && la < 28 && lo > -10 && lo < 10) return true;
  return region === 'Global' && Math.abs(la - 20) < 8 && Math.abs(lo - 0) < 12;
}

/**
 * Re-geocode events on wrong Global jitter when title/summary clearly names a place.
 * @param {Array<object>} events
 */
export function regeocodeWrongGlobal(events) {
  let fixed = 0;
  const out = events.map((e) => {
    if (!looksLikeGlobalJitter(e.lat, e.lon, e.region)) return e;
    const hit = geocodeFromText(e.title || '') || geocodeFromText(e.summary || '');
    if (!hit) {
      // Clear bogus Global jitter coords — not map-eligible
      return { ...e, lat: null, lon: null, region: e.region === 'Global' ? 'Global' : e.region, mapEligible: false };
    }
    fixed++;
    const mapEligible = computeMapEligible({
      ...e,
      lat: hit.lat,
      lon: hit.lon,
      place: hit.place,
      hasPlace: true,
    });
    return { ...e, lat: hit.lat, lon: hit.lon, region: hit.region, mapEligible };
  });
  return { events: out, fixed };
}

/**
 * Re-geocode ALL events: impact-first place from title/summary; never fill Global jitter.
 * Sets mapEligible on every row.
 */
export function regeocodeAllNamed(events) {
  let fixed = 0;
  let cleared = 0;
  let filled = 0;
  const out = events.map((e) => {
    const geo = resolveEventGeo({
      title: e.title,
      summary: e.summary,
      curatedSummary: e.curatedSummary,
      region: e.region,
      layer: e.layer,
      falloutRisk: e.falloutRisk,
    });

    if (geo.place) {
      const same =
        Number(e.lat) === geo.lat &&
        Number(e.lon) === geo.lon &&
        e.region === geo.region &&
        e.mapEligible === geo.mapEligible;
      if (!same) fixed++;
      return {
        ...e,
        lat: geo.lat,
        lon: geo.lon,
        region: geo.region,
        mapEligible: geo.mapEligible,
      };
    }

    // No place keyword in title/summary — never keep Global jitter or stale pins on the map.
    // GDELT rows with real instrumented coords may keep them only when source says so AND
    // coords are finite and outside the Global jitter envelope.
    const src = String(e.source || '');
    const la = e.lat == null ? NaN : Number(e.lat);
    const lo = e.lon == null ? NaN : Number(e.lon);
    const latOk = Number.isFinite(la);
    const lonOk = Number.isFinite(lo);
    const wasJitter = looksLikeGlobalJitter(e.lat, e.lon, e.region);
    const gdeltKeep =
      /^GDELT/i.test(src) &&
      latOk &&
      lonOk &&
      !wasJitter &&
      !(Math.abs(la) < 0.01 && Math.abs(lo) < 0.01);

    if (gdeltKeep) {
      // Instrumented GDELT coords may stay on the row, but map pins need impact language
      // and must not treat mid-ocean centroids as a "place" without a keyword hit.
      const textPlace = geocodeFromText(e.title || '') || geocodeFromText(e.summary || '');
      const kinetic = hasMapImpactLanguage(`${e.title || ''} ${e.summary || ''}`);
      const mapEligible = computeMapEligible({
        ...e,
        hasPlace: Boolean(textPlace?.place) || kinetic,
        place: textPlace?.place || null,
        lat: e.lat,
        lon: e.lon,
      });
      if (e.mapEligible !== mapEligible) fixed++;
      return { ...e, mapEligible };
    }

    if (latOk || lonOk || e.mapEligible !== false) cleared++;
    return {
      ...e,
      lat: null,
      lon: null,
      region: e.region && e.region !== 'Global' ? e.region : geo.region,
      mapEligible: false,
    };
  });
  return { events: out, fixed, filled, cleared };
}

/**
 * Apply map eligibility + clear Global-jitter pins across an events array.
 * Preferred one-shot for events.json refresh (does not wipe non-geo fields).
 */
export function applyMapEligibility(events) {
  const { events: out, fixed, cleared } = regeocodeAllNamed(events);
  return { events: out, fixed, cleared };
}

export { PLACES, REGION_FALLBACK, IMPACT_CONTEXT, SECURITY_SIGNAL, NON_SECURITY, MAP_IMPACT, MAP_EXCLUDE, MARITIME_INCIDENT, WATER_BASIN_PLACES };
