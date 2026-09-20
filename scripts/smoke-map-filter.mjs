#!/usr/bin/env node
/**
 * Smoke: null lat/lon must never pass the map plottable guard.
 * Mirrors apps/web/src/lib/mapCoords.ts (keep in sync).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function hasPlottableCoords(lat, lon) {
  if (lat == null || lon == null) return false;
  if (lat === '' || lon === '') return false;
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (la === 0 && lo === 0) return false;
  return true;
}

function isEventMapPlottable(e) {
  return e.mapEligible === true && hasPlottableCoords(e.lat, e.lon);
}

const cases = [
  { name: 'null,null mapEligible true', lat: null, lon: null, mapEligible: true, expect: false },
  { name: 'undefined coords', lat: undefined, lon: undefined, mapEligible: true, expect: false },
  { name: 'null + mapEligible false', lat: null, lon: null, mapEligible: false, expect: false },
  { name: 'exact 0,0', lat: 0, lon: 0, mapEligible: true, expect: false },
  { name: 'NaN', lat: NaN, lon: 10, mapEligible: true, expect: false },
  { name: 'missing mapEligible', lat: 55.75, lon: 37.62, expect: false },
  { name: 'Moscow ok', lat: 55.75, lon: 37.62, mapEligible: true, expect: true },
  { name: 'string nums ok', lat: '24.71', lon: '46.68', mapEligible: true, expect: true },
];

let failed = 0;
for (const c of cases) {
  const got = isEventMapPlottable(c);
  if (got !== c.expect) {
    console.error(`FAIL ${c.name}: got ${got}, expected ${c.expect}`);
    failed++;
  }
}

// Old buggy filter would accept null via Number(null)===0
const buggy = (e) =>
  e.mapEligible !== false && Number.isFinite(Number(e.lat)) && Number.isFinite(Number(e.lon));
if (!buggy({ lat: null, lon: null, mapEligible: true })) {
  console.error('FAIL: expected buggy filter to accept null,null (sanity of trap)');
  failed++;
}
if (isEventMapPlottable({ lat: null, lon: null, mapEligible: true })) {
  console.error('FAIL: fixed filter must reject null,null even when mapEligible');
  failed++;
}

const eventsPath = path.join(root, 'apps/web/public/data/events.json');
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const nullCoords = events.filter((e) => e.lat == null || e.lon == null);
const plotted = events.filter(isEventMapPlottable);
const nullPlotted = plotted.filter((e) => e.lat == null || e.lon == null);
const zeroPlotted = plotted.filter((e) => Number(e.lat) === 0 && Number(e.lon) === 0);

console.log(`events=${events.length} nullCoords=${nullCoords.length} plotted=${plotted.length}`);
if (nullPlotted.length > 0) {
  console.error(`FAIL: ${nullPlotted.length} null-coord events would still plot`);
  failed++;
}
if (zeroPlotted.length > 0) {
  console.error(`FAIL: ${zeroPlotted.length} exact [0,0] events would still plot`);
  failed++;
}

if (failed) {
  console.error(`smoke-map-filter: ${failed} failure(s)`);
  process.exit(1);
}
console.log('smoke-map-filter: ok — null-lat events excluded; Number(null) trap closed');
