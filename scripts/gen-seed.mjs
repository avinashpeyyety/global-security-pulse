#!/usr/bin/env node
/** Generate seed JSON for offline first paint. Run from repo root: node scripts/gen-seed.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const now = new Date('2026-09-20T16:00:00Z');
const iso = (d) => d.toISOString();
const daysAgo = (d) => new Date(now.getTime() - d * 86400e3);

const rawEvents = JSON.parse(fs.readFileSync(path.join(root, 'data/seed/events.json'), 'utf8'));
function severityToFallout(sev) {
  if (sev >= 5) return 'critical';
  if (sev >= 4) return 'high';
  if (sev >= 3) return 'medium';
  return 'low';
}
const events = rawEvents.map((e) => ({
  ...e,
  falloutRisk: e.falloutRisk ?? severityToFallout(e.severity),
}));
let postures = [];
const posturesPath = path.join(root, 'data/seed/postures.json');
if (fs.existsSync(posturesPath)) {
  postures = JSON.parse(fs.readFileSync(posturesPath, 'utf8'));
} else {
  const pubPostures = path.join(root, 'apps/web/public/data/postures.json');
  if (fs.existsSync(pubPostures)) postures = JSON.parse(fs.readFileSync(pubPostures, 'utf8'));
}


function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genSeries(id, name, unit, source, days, base, vol, drift = 0) {
  const rnd = mulberry32(id.split('').reduce((s, c) => s + c.charCodeAt(0), 0));
  const points = [];
  let v = base;
  for (let i = days; i >= 0; i--) {
    const shock = (rnd() - 0.5) * vol;
    v = Math.max(0.01, v * (1 + drift) + shock);
    points.push({ t: daysAgo(i).toISOString().slice(0, 10), v: Math.round(v * 100) / 100 });
  }
  if (['vix', 'wti', 'spx'].includes(id)) {
    const last = points[points.length - 1];
    last.v = Math.round(last.v * (id === 'vix' ? 1.35 : id === 'wti' ? 1.08 : 0.97) * 100) / 100;
  }
  return { id, name, unit, source, points };
}

const series = [
  genSeries('spx', 'S&P 500', 'index', 'stooq', 90, 5600, 25, 0.0002),
  genSeries('ndx', 'Nasdaq 100', 'index', 'stooq', 90, 19800, 80, 0.0003),
  genSeries('dax', 'DAX', 'index', 'stooq', 90, 18500, 60, 0.0001),
  genSeries('nky', 'Nikkei 225', 'index', 'stooq', 90, 39000, 120, 0.00015),
  genSeries('shcomp', 'Shanghai Composite', 'index', 'stooq', 90, 3100, 18, -0.00005),
  genSeries('eurusd', 'EUR/USD', 'fx', 'stooq', 90, 1.09, 0.004, 0),
  genSeries('usdjpy', 'USD/JPY', 'fx', 'stooq', 90, 148, 0.4, 0.0001),
  genSeries('dxy', 'US Dollar Index', 'index', 'yahoo', 90, 104, 0.25, 0.00005),
  genSeries('wti', 'WTI Crude', 'USD/bbl', 'stooq', 90, 78, 1.2, 0.0002),
  genSeries('brent', 'Brent Crude', 'USD/bbl', 'stooq', 90, 82, 1.2, 0.0002),
  genSeries('gold', 'Gold', 'USD/oz', 'stooq', 90, 2480, 8, 0.0001),
  genSeries('copper', 'Copper', 'USD/lb', 'stooq', 90, 4.2, 0.05, 0),
  genSeries('vix', 'VIX', 'index', 'yahoo', 90, 16, 0.8, 0),
  genSeries('fedfunds', 'Fed Funds (proxy)', '%', 'seed', 90, 5.33, 0.01, 0),
];

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function std(arr) { const m = mean(arr); return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)) || 1e-9); }

function anomaliesFrom(seriesList) {
  const evaluatedAt = iso(now);
  return seriesList.map((s) => {
    const vals = s.points.map((p) => p.v);
    const window = vals.slice(-60);
    const z = (vals[vals.length - 1] - mean(window)) / std(window);
    const pct = (a, b) => (b === 0 ? 0 : ((a - b) / Math.abs(b)) * 100);
    const last = vals[vals.length - 1];
    const d1 = vals[vals.length - 2] ?? last;
    const d5 = vals[vals.length - 6] ?? last;
    const d20 = vals[vals.length - 21] ?? last;
    const adverseUp = ['vix', 'wti', 'brent', 'dxy', 'usdjpy', 'gold'].includes(s.id);
    let streak = 0;
    for (let i = vals.length - 1; i > 0; i--) {
      const up = vals[i] > vals[i - 1];
      if (adverseUp ? up : !up) streak++; else break;
    }
    return {
      seriesId: s.id, seriesName: s.name,
      zScore: Math.round(z * 100) / 100,
      pctChange1d: Math.round(pct(last, d1) * 100) / 100,
      pctChange5d: Math.round(pct(last, d5) * 100) / 100,
      pctChange20d: Math.round(pct(last, d20) * 100) / 100,
      adverseStreak: streak, latestValue: last, evaluatedAt,
      rule: 'rolling_z_60d + pct_1/5/20d + adverse_streak',
      snapshot: `seed@${evaluatedAt.slice(0, 10)}`,
    };
  }).sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

const anomalies = anomaliesFrom(series);
const byId = Object.fromEntries(anomalies.map((a) => [a.seriesId, a]));
const clamp = (n) => Math.min(100, Math.max(0, n));
const eq = clamp(40 + -(byId.spx?.pctChange5d ?? 0) * 8 + Math.max(0, -(byId.spx?.zScore ?? 0)) * 10);
const usd = clamp(30 + Math.max(0, byId.dxy?.zScore ?? 0) * 15);
const vix = clamp(20 + Math.max(0, byId.vix?.zScore ?? 0) * 18);
const oil = clamp(25 + Math.max(0, byId.wti?.zScore ?? 0) * 14);
const stress = {
  score: Math.round((eq * 0.35 + usd * 0.2 + vix * 0.25 + oil * 0.2) * 10) / 10,
  components: { equities: Math.round(eq), usd: Math.round(usd), vix: Math.round(vix), oil: Math.round(oil) },
  evaluatedAt: iso(now),
  rule: '0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil',
  snapshot: `seed@${iso(now).slice(0, 10)}`,
};

function buildHotspots(evts) {
  const by = new Map();
  for (const e of evts) {
    const h = by.get(e.region) || { region: e.region, count: 0, maxSeverity: 0, freshestSource: '', freshestAt: '1970-01-01', layers: new Set() };
    h.count++; h.maxSeverity = Math.max(h.maxSeverity, e.severity);
    if (e.observedAt > h.freshestAt) { h.freshestAt = e.observedAt; h.freshestSource = e.source; }
    h.layers.add(e.layer); by.set(e.region, h);
  }
  return [...by.values()].map((h) => ({ ...h, layers: [...h.layers] }))
    .sort((a, b) => b.maxSeverity - a.maxSeverity || b.count - a.count);
}

const feeds = [
  { id: 'gdelt', name: 'GDELT GEO', status: 'Pass', lastEvaluatedAt: iso(new Date(now.getTime() - 1800e3)), detail: 'Seed + optional live refresh', rule: 'http_200 && events>=1', snapshot: 'seed-v0.1' },
  { id: 'markets', name: 'Markets (Stooq/Yahoo)', status: 'Pass', lastEvaluatedAt: iso(new Date(now.getTime() - 1440e3)), detail: 'Seed series loaded', rule: 'series_count>=10', snapshot: 'seed-v0.1' },
  { id: 'x-scroll', name: 'X allowlist scroll', status: 'Not run', lastEvaluatedAt: null, detail: 'Dry-run agent available; live Playwright scroll not scheduled', rule: 'jsonl_written', snapshot: null },
  { id: 'fred', name: 'FRED macros', status: 'Warn', lastEvaluatedAt: iso(new Date(now.getTime() - 3600e3)), detail: 'No FRED_API_KEY; using seed proxy for fed funds', rule: 'api_key_present || seed_fallback', snapshot: 'seed-proxy' },
  { id: 'rss', name: 'Wire RSS', status: 'Not run', lastEvaluatedAt: null, detail: 'RSS ingest stubbed for v0.1', rule: 'feed_parse_ok', snapshot: null },
  { id: 'baltic', name: 'Baltic Dry', status: 'Not run', lastEvaluatedAt: null, detail: 'No free reliable source wired', rule: 'source_available', snapshot: null },
];

// Prefer richer ingested public events so CI/Pages never clobber RSS/GDELT packs with the 24-event seed.
const publicEventsPath = path.join(root, 'apps/web/public/data/events.json');
let eventsOut = events;
if (fs.existsSync(publicEventsPath)) {
  try {
    const pub = JSON.parse(fs.readFileSync(publicEventsPath, 'utf8'));
    if (Array.isArray(pub) && pub.length > events.length) {
      eventsOut = pub.map((e) => ({
        ...e,
        falloutRisk: e.falloutRisk ?? severityToFallout(e.severity),
      }));
      console.log(`gen-seed: preserving public events (${eventsOut.length} > seed ${events.length})`);
    }
  } catch (err) {
    console.warn('gen-seed: could not read public events, using seed', err.message);
  }
}

const publicPosturesPath = path.join(root, 'apps/web/public/data/postures.json');
let posturesOut = postures;
if (fs.existsSync(publicPosturesPath)) {
  try {
    const pubP = JSON.parse(fs.readFileSync(publicPosturesPath, 'utf8'));
    if (Array.isArray(pubP) && pubP.length >= postures.length) posturesOut = pubP;
  } catch { /* keep seed postures */ }
}

const hotspots = buildHotspots(eventsOut);
const snapshot = { generatedAt: iso(now), events: eventsOut, postures: posturesOut, hotspots, feeds, series, anomalies, stress, timeWindows: ['6h', '24h', '7d', '30d'] };

const outs = [
  ['data/seed/events.json', events], // keep canonical small seed for offline bootstrap
  ['data/seed/series.json', series],
  ['data/seed/snapshot.json', { ...snapshot, events, postures }],
  ['data/seed/postures.json', postures],
  ['apps/web/public/data/events.json', eventsOut],
  ['apps/web/public/data/postures.json', posturesOut],
  ['apps/web/public/data/series.json', series],
  ['apps/web/public/data/snapshot.json', snapshot],
  ['apps/web/public/data/feeds.json', feeds],
  ['apps/web/public/data/anomalies.json', anomalies],
  ['apps/web/public/data/stress.json', stress],
  ['apps/web/public/data/hotspots.json', hotspots],
];

for (const [rel, data] of outs) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}
console.log('gen-seed ok', { events: eventsOut.length, postures: posturesOut.length, series: series.length, stress: stress.score });
