#!/usr/bin/env node
/**
 * Curate map-facing event briefs:
 *  - Wire/RSS/GDELT/UKMTO/seed → curatedSummary (briefSource wire)
 *  - Live x-scroll posts attach to curated events as xPosts (collapsible)
 *  - Dry-run x-scroll placeholders dropped from map set
 *  - Unmatched live X → thin agent-wrapper event (brief only; raw in xPosts)
 *
 * No X API. Reads/writes apps/web/public/data/events.json (+ snapshot events).
 *
 * Usage:
 *   node ingest/curate-briefs.mjs
 *   npm run ingest:curate-briefs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geocodeFromText } from './lib/geocode.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicEvents = path.join(root, 'apps/web/public/data/events.json');
const publicSnapshot = path.join(root, 'apps/web/public/data/snapshot.json');
const publicHotspots = path.join(root, 'apps/web/public/data/hotspots.json');

const PROX_KM_STRONG = 180;
const PROX_KM_WEAK = 450;
/** Place-only matches used to clear this; topic substance required now. */
const MATCH_THRESHOLD = 7;

/** Security / conflict lexicon — overlap required with curated event tokens. */
const SECURITY_LEXICON = [
  'missile', 'missiles', 'ballistic', 'drone', 'drones', 'attack', 'attacks',
  'strike', 'strikes', 'airstrike', 'artillery', 'war', 'warfare', 'intercept',
  'intercepted', 'bomb', 'bombs', 'bombing', 'houthi', 'houthis', 'rocket',
  'rockets', 'shelling', 'invasion', 'combat', 'raid', 'raids', 'swarm',
  'barrage', 'downed', 'explosion', 'explosions', 'weapon', 'weapons',
  'naval', 'vessel', 'tanker', 'piracy', 'hostage', 'militia', 'militant',
  'cyberattack', 'cyberattacks', 'sanctions', 'ceasefire', 'offensive',
];

/** Canonicalize plural / near-duplicate security tokens. */
const SECURITY_CANON = {
  missiles: 'missile',
  drones: 'drone',
  attacks: 'attack',
  strikes: 'strike',
  airstrike: 'strike',
  intercepted: 'intercept',
  bombs: 'bomb',
  bombing: 'bomb',
  houthis: 'houthi',
  rockets: 'rocket',
  raids: 'raid',
  explosions: 'explosion',
  weapons: 'weapon',
  cyberattacks: 'cyberattack',
};

/** Ultra-generic security words — weak alone inside multi-topic laundry lists. */
const GENERIC_SECURITY = new Set(['attack', 'war', 'strike', 'military', 'defense', 'defence']);

/** Celebrity / entertainment noise — reject vs security/conflict curated events. */
const ENTERTAINMENT_NOISE = [
  'ed sheeran', 'sheeran', 'macklemore', 'concert', 'album', 'celebrity',
  'hollywood', 'premier league', 'premier-league', 'nfl', 'nba', 'mlb', 'nhl',
  'golf', 'oscar', 'oscars', 'grammy', 'grammys', 'spotify', 'billboard',
  'netflix', 'box office', 'box-office', 'trailer', 'taylor swift', 'beyonce',
  'kardashian', 'super bowl', 'world cup final', 'eurovision',
  '2-minute warning', 'touchdown', 'kickoff', 'halftime', 'bucs-browns',
  'buccaneers', 'red carpet', 'box office',
];

function isXScrollCurated(e) {
  return String(e.source || '').toLowerCase() === 'x-scroll-curated';
}

/** Raw / dry-run x-scroll rows (not already-curated wrappers). */
function isRawXScroll(e) {
  const src = String(e.source || '').toLowerCase();
  return src === 'x-scroll' || (src.startsWith('x-scroll') && !isXScrollCurated(e));
}

function isDryRun(e) {
  if (!isRawXScroll(e)) return false;
  const id = String(e.id || '');
  const summary = String(e.summary || '');
  return id.includes('dry') || /\[dry-run\]/i.test(summary) || /dry-run/i.test(summary);
}

function cleanWireBrief(e) {
  const title = String(e.title || '').trim();
  const summary = String(e.summary || '').trim();
  if (!summary) return title.slice(0, 280);
  // Drop tone= noise from GDELT-ish summaries
  let s = summary.replace(/^tone=[^;]*;\s*/i, '').trim();
  if (title && s.toLowerCase().startsWith(title.toLowerCase())) {
    /* already title-like */
  } else if (title && !s.toLowerCase().includes(title.toLowerCase().slice(0, 40)) && s.length < 200) {
    s = `${title} — ${s}`;
  }
  return s.slice(0, 320);
}

function haversineKm(aLat, aLon, bLat, bLon) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function significantTokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .filter(
      (w) =>
        ![
          'that',
          'this',
          'with',
          'from',
          'have',
          'will',
          'were',
          'been',
          'they',
          'their',
          'about',
          'after',
          'before',
          'says',
          'said',
          'post',
          'update',
          'brief',
          'scroll',
          'podcast',
        ].includes(w),
    );
}

/** Distinctive place tokens only — not broad regions. */
const PLACE_KEYS = [
  'moscow', 'moskva', 'riyadh', 'saudi', 'houthi', 'yemen', 'sanaa',
  'kyiv', 'kiev', 'kupiansk', 'kharkiv', 'odessa', 'odesa', 'donbas', 'crimea',
  'tehran', 'iran', 'gaza', 'israel', 'beirut', 'lebanon', 'damascus',
  'hormuz', 'red sea', 'bab el-mandeb', 'taiwan', 'taipei', 'beijing',
  'pyongyang', 'seoul', 'islamabad', 'pakistan', 'greenland', 'washington',
  'baghdad', 'khartoum', 'haiti', 'nepal', 'malawi',
];

function placeKeywords(text) {
  const keys = new Set();
  const hay = String(text || '').toLowerCase();
  for (const k of PLACE_KEYS) {
    if (hay.includes(k)) keys.add(k);
  }
  return keys;
}

/** Primary place for an event from title (then summary) — used for named-in-X. */
function primaryPlaceKeys(e) {
  const fromTitle = placeKeywords(e.title || '');
  if (fromTitle.size) return fromTitle;
  return placeKeywords(e.summary || '');
}

function securityTokensIn(text) {
  const hay = String(text || '').toLowerCase();
  const out = new Set();
  for (const t of SECURITY_LEXICON) {
    // Word-boundary match — avoid "war" inside warns/warning/forwarder
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
    if (!re.test(hay)) continue;
    out.add(SECURITY_CANON[t] || t);
  }
  return out;
}

function hasEntertainmentNoise(text) {
  const hay = String(text || '').toLowerCase();
  return ENTERTAINMENT_NOISE.some((k) => hay.includes(k));
}

function isEntertainmentCurated(text) {
  return hasEntertainmentNoise(text);
}

/** Multi-topic roundup / podcast laundry list — do not spray across every place named. */
function isMultiTopicRoundup(xHay, xPlaces) {
  if (xPlaces.size >= 3) return true;
  if (/podcast\s*:/i.test(xHay)) return true;
  if (/\band ed\b/i.test(xHay)) return true;
  // "A, B and C" topic sandwich (xHay is lowercased)
  if (/\band [a-z]{3,}\b/.test(xHay) && xPlaces.size >= 2) return true;
  return false;
}

function scoreMatch(curated, xEvt) {
  let score = 0;
  const cText = `${curated.title} ${curated.summary}`;
  const xText = `${xEvt.title} ${xEvt.summary}`;
  const cHay = String(cText).toLowerCase();
  const xHay = String(xText).toLowerCase();

  // 1) Reject celebrity/entertainment noise against security/conflict events
  if (hasEntertainmentNoise(xHay) && !isEntertainmentCurated(cHay)) {
    return { score: 0, namedInX: false, strongProx: false, reason: 'entertainment-noise' };
  }

  const dist = haversineKm(
    Number(curated.lat),
    Number(curated.lon),
    Number(xEvt.lat),
    Number(xEvt.lon),
  );
  let strongProx = false;
  if (Number.isFinite(dist)) {
    if (dist <= PROX_KM_STRONG) {
      score += 4;
      strongProx = true;
    } else if (dist <= PROX_KM_WEAK) score += 1;
  }

  const cPlaces = primaryPlaceKeys(curated);
  const xPlaces = placeKeywords(xText);
  let sharedPlaces = 0;
  for (const p of cPlaces) {
    if (xPlaces.has(p) || xHay.includes(p)) sharedPlaces++;
  }
  const namedInX = sharedPlaces > 0;

  // 2) Topic substance: shared security tokens derived from the curated event
  const cSec = securityTokensIn(cText);
  const xSec = securityTokensIn(xText);
  const sharedSec = [];
  for (const t of cSec) {
    if (xSec.has(t)) sharedSec.push(t);
  }
  const distinctiveShared = sharedSec.filter((t) => !GENERIC_SECURITY.has(t));
  const roundup = isMultiTopicRoundup(xHay, xPlaces);

  // Place-only (or prox-only) is not enough — need ≥1 shared security/topic token
  if (sharedSec.length === 0) {
    return { score: 0, namedInX, strongProx, reason: 'no-topic-overlap' };
  }

  // Need a place link OR strong proximity, plus topic overlap
  if (!namedInX && !strongProx) {
    return { score: 0, namedInX: false, strongProx: false, reason: 'no-place' };
  }

  // 3) Roundup / podcast laundry: require strong event-specific tokens (not just "attack")
  if (roundup) {
    if (distinctiveShared.length === 0) {
      return { score: 0, namedInX, strongProx, reason: 'roundup-weak-topic' };
    }
    // Prefer ballistic+saudi / drone+moscow style: distinctive topic + named place
    if (!namedInX) {
      return { score: 0, namedInX, strongProx, reason: 'roundup-needs-place' };
    }
    score += Math.min(12, distinctiveShared.length * 6);
    score += Math.min(8, sharedPlaces * 4);
  } else {
    score += Math.min(10, sharedPlaces * 5);
    score += Math.min(10, distinctiveShared.length * 5 + sharedSec.length * 2);
  }

  // Light lexical tie-break
  const cTok = new Set(significantTokens(cText));
  let overlap = 0;
  for (const t of significantTokens(xText)) {
    if (cTok.has(t)) overlap++;
  }
  score += Math.min(2, overlap);

  return { score, namedInX, strongProx, sharedSec, distinctiveShared, roundup };
}

function toXPost(e) {
  const author = String(e.author || '').replace(/^@/, '') ||
    (String(e.url || '').match(/x\.com\/([^/]+)/i) || [])[1] ||
    'unknown';
  return {
    author,
    text: String(e.summary || e.title || '').replace(/^\[dry-run\]\s*/i, '').slice(0, 280),
    url: e.url || `https://x.com/${author}`,
    observedAt: e.observedAt,
  };
}

function agentBriefForX(e) {
  const author = String(e.author || '').replace(/^@/, '') || 'unknown';
  const place =
    geocodeFromText(`${e.title} ${e.summary}`) ||
    (e.region && e.region !== 'Global' ? { place: e.region } : null);
  const topic = place?.place || e.region || 'this topic';
  return `User-generated X post from @${author} regarding ${topic} — verify against wires.`;
}

function rebuildHotspots(events) {
  const by = new Map();
  for (const e of events) {
    const region = e.region || 'Global';
    const h =
      by.get(region) ||
      {
        region,
        count: 0,
        maxSeverity: 0,
        freshestSource: '',
        freshestAt: '1970-01-01',
        layers: new Set(),
      };
    h.count++;
    h.maxSeverity = Math.max(h.maxSeverity, e.severity || 0);
    if (e.observedAt > h.freshestAt) {
      h.freshestAt = e.observedAt;
      h.freshestSource = e.source;
    }
    if (e.layer) h.layers.add(e.layer);
    by.set(region, h);
  }
  return [...by.values()].map((h) => ({ ...h, layers: [...h.layers] }));
}

function main() {
  if (!fs.existsSync(publicEvents)) {
    console.error('curate-briefs: missing', publicEvents);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(publicEvents, 'utf8'));
  if (!Array.isArray(raw)) {
    console.error('curate-briefs: events.json is not an array');
    process.exit(1);
  }

  const dryDropped = raw.filter(isDryRun);
  const liveX = raw.filter((e) => isRawXScroll(e) && !isDryRun(e));
  // Keep prior curated wrappers + non-X wire/seed events
  const curatedBase = raw.filter((e) => !isRawXScroll(e));

  /** @type {Map<string, object>} */
  const curated = new Map();
  for (const e of curatedBase) {
    // Drop prior x-scroll-curated wrappers — rematch live X fresh each run
    if (isXScrollCurated(e)) continue;
    const brief = cleanWireBrief(e);
    curated.set(e.id, {
      ...e,
      curatedSummary: e.curatedSummary || brief,
      briefSource: e.briefSource || 'wire',
      // Always recompute xPosts from live X (do not keep stale place-only matches)
      xPosts: [],
      // Primary wire url stays BBC/AJ/etc. — never replace with X
      url: e.url,
    });
  }

  let matched = 0;
  let unmatched = 0;
  const wrappers = [];

  let entertainmentDropped = 0;
  for (const x of liveX) {
    const xBlob = `${x.title || ''} ${x.summary || ''}`;
    // Celebrity/sports laundry posts: do not attach to security events OR pin as wrappers
    if (hasEntertainmentNoise(xBlob)) {
      entertainmentDropped++;
      continue;
    }
    const scores = [...curated.values()]
      .map((c) => {
        const r = scoreMatch(c, x);
        if (!r || typeof r === 'number') return { c, score: r || 0, namedInX: false };
        return {
          c,
          score: r.score,
          namedInX: r.namedInX,
          strongProx: r.strongProx,
          reason: r.reason,
        };
      })
      .filter((r) => r.score >= MATCH_THRESHOLD)
      .sort((a, b) => b.score - a.score || String(a.c.id).localeCompare(String(b.c.id)));

    // One X post → at most one curated event (highest score wins)
    const best = scores[0];
    if (!best) {
      unmatched++;
      const post = toXPost(x);
      const brief = agentBriefForX(x);
      wrappers.push({
        id: `curated-x-${x.id.replace(/^xscroll-/, '')}`,
        title: String(x.title || `X post from @${post.author}`).slice(0, 160),
        summary: brief,
        curatedSummary: brief,
        briefSource: 'agent',
        xPosts: [post],
        layer: x.layer || 'conflict',
        severity: Math.min(3, Number(x.severity) || 2),
        falloutRisk: x.falloutRisk || 'low',
        confidence: Math.min(0.55, Number(x.confidence) || 0.45),
        lat: Number(x.lat),
        lon: Number(x.lon),
        region: x.region || 'Global',
        source: 'x-scroll-curated',
        sourceReliability: x.sourceReliability || 'C',
        url: x.url,
        observedAt: x.observedAt,
        ingestedAt: x.ingestedAt || new Date().toISOString(),
      });
      continue;
    }

    matched++;
    const post = toXPost(x);
    const row = curated.get(best.c.id);
    if (!row.xPosts) row.xPosts = [];
    const dup = row.xPosts.some((p) => p.url === post.url);
    if (!dup) row.xPosts.push(post);
  }

  // Drop empty xPosts arrays for cleanliness
  const out = [...curated.values()].map((e) => {
    if (Array.isArray(e.xPosts) && e.xPosts.length === 0) {
      const { xPosts, ...rest } = e;
      return rest;
    }
    return e;
  });

  out.push(...wrappers);

  // Stable-ish order: non-wrapper first by observedAt desc, then wrappers
  out.sort((a, b) => String(b.observedAt).localeCompare(String(a.observedAt)));

  fs.writeFileSync(publicEvents, JSON.stringify(out, null, 2));

  if (fs.existsSync(publicSnapshot)) {
    const snap = JSON.parse(fs.readFileSync(publicSnapshot, 'utf8'));
    snap.events = out;
    snap.generatedAt = new Date().toISOString();
    fs.writeFileSync(publicSnapshot, JSON.stringify(snap, null, 2));
  }

  const hotspots = rebuildHotspots(out);
  fs.writeFileSync(publicHotspots, JSON.stringify(hotspots, null, 2));

  console.log(
    `curate-briefs Pass — curated ${curated.size} wire events; ` +
      `matched ${matched} live X → xPosts; ` +
      `wrappers ${wrappers.length}; ` +
      `dropped ${dryDropped.length} dry-run; ` +
      `entertainment-dropped ${entertainmentDropped}; ` +
      `map events ${out.length}`,
  );
}

main();
