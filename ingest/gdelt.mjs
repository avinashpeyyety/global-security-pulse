#!/usr/bin/env node
/**
 * GDELT-shaped ingest. Tries public GDELT GEO JSON; on failure keeps/copies seed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stampMeta } from './lib/stamp-meta.mjs';
import { geocodeFromText } from './lib/geocode.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const seedEvents = path.join(root, 'data/seed/events.json');
const publicEvents = path.join(root, 'apps/web/public/data/events.json');
const publicSnapshot = path.join(root, 'apps/web/public/data/snapshot.json');

const GDELT_URL =
  'https://api.gdeltproject.org/api/v2/geo/geo?query=conflict%20OR%20attack%20OR%20military&mode=PointData&format=GeoJSON&maxrecords=40';

const LAYER_GUESS = [
  [/cyber|ransomware|malware/i, 'cyber'],
  [/ship|vessel|maritime|red sea|hormuz|piracy/i, 'maritime'],
  [/sanction|diplomacy|embassy|visa/i, 'sanctions'],
  [/terror|isis|al-qaeda|ied/i, 'terrorism'],
  [/protest|riot|strike|unrest/i, 'unrest'],
  [/earthquake|flood|wildfire|disaster/i, 'disaster'],
  [/.*/, 'conflict'],
];

function guessLayer(text) {
  for (const [re, layer] of LAYER_GUESS) {
    if (re.test(text)) return layer;
  }
  return 'conflict';
}

function regionFromCoords(lat, lon) {
  if (lat > 35 && lon > -10 && lon < 40) return 'Europe';
  if (lat > 10 && lon > 30 && lon < 60) return 'Middle East';
  if (lat > 0 && lon > 95 && lon < 150) return 'East / SE Asia';
  if (lat > 5 && lon > 60 && lon < 95) return 'South Asia';
  if (lat > -35 && lat < 20 && lon > -20 && lon < 50) return 'Africa';
  if (lon < -30) return 'Americas';
  return 'Global';
}

async function fetchGdelt() {
  const res = await fetch(GDELT_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`GDELT HTTP ${res.status}`);
  const geo = await res.json();
  const features = geo.features ?? geo?.geojson?.features ?? [];
  const now = new Date().toISOString();
  return features.slice(0, 40).map((f, i) => {
    const [lon, lat] = f.geometry?.coordinates ?? [0, 0];
    const props = f.properties ?? {};
    const title = String(props.name || props.title || props.shareimage || 'GDELT event').slice(0, 160);
    const summary = String(props.urltone != null ? `tone=${props.urltone}; ${title}` : title).slice(0, 280);
    const severity = Math.min(5, Math.max(1, Math.round(Math.abs(Number(props.urltone) || 2) / 2) + 1));
    let la = Number(lat);
    let lo = Number(lon);
    let region = regionFromCoords(la, lo);
    // If GDELT point is missing/null-island, fall back to keyword place from title
    if (!Number.isFinite(la) || !Number.isFinite(lo) || (Math.abs(la) < 0.01 && Math.abs(lo) < 0.01)) {
      const hit = geocodeFromText(title);
      if (hit) {
        la = hit.lat;
        lo = hit.lon;
        region = hit.region;
      }
    }
    return {
      id: `gdelt-${Date.now()}-${i}`,
      title,
      summary,
      layer: guessLayer(`${title} ${props.url ?? ''}`),
      severity,
      falloutRisk: severityToFallout(severity),
      confidence: 0.55,
      lat: la,
      lon: lo,
      region,
      source: 'GDELT GEO',
      sourceReliability: 'B',
      url: props.url || undefined,
      observedAt: now,
      ingestedAt: now,
    };
  }).filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lon));
}

function severityToFallout(sev) {
  if (sev >= 5) return 'critical';
  if (sev >= 4) return 'high';
  if (sev >= 3) return 'medium';
  return 'low';
}

function loadSeed() {
  return JSON.parse(fs.readFileSync(seedEvents, 'utf8'));
}

function writeEvents(events) {
  fs.mkdirSync(path.dirname(publicEvents), { recursive: true });
  fs.writeFileSync(publicEvents, JSON.stringify(events, null, 2));
  fs.writeFileSync(seedEvents, JSON.stringify(events, null, 2));
  if (fs.existsSync(publicSnapshot)) {
    const snap = JSON.parse(fs.readFileSync(publicSnapshot, 'utf8'));
    snap.events = events;
    snap.generatedAt = new Date().toISOString();
    fs.writeFileSync(publicSnapshot, JSON.stringify(snap, null, 2));
  }
}

async function main() {
  try {
    const events = await fetchGdelt();
    if (!events.length) throw new Error('empty GDELT payload');
    writeEvents(events);
    const um = stampMeta();
    console.log(`ingest:gdelt Pass — wrote ${events.length} live events`);
    console.log(`  ${um.updatedAtLabel} · ${um.nextUpdateHint}`);
  } catch (err) {
    const seed = loadSeed();
    writeEvents(seed);
    const um = stampMeta();
    console.warn(`ingest:gdelt Warn — network/API failed (${err.message}); kept seed (${seed.length} events)`);
    console.log(`  ${um.updatedAtLabel} · ${um.nextUpdateHint}`);
  }
}

main();
