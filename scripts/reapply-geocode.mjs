#!/usr/bin/env node
/**
 * Re-run impact-first geocode + mapEligible over public events.json
 * and rebuild snapshot.events from the result. Does NOT run gen-seed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyMapEligibility, looksLikeGlobalJitter } from '../ingest/lib/geocode.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const eventsPath = path.join(root, 'apps/web/public/data/events.json');
const snapPath = path.join(root, 'apps/web/public/data/snapshot.json');

function nearGlobal(e) {
  if (e.lat == null || e.lon == null) return false;
  const la = Number(e.lat);
  const lo = Number(e.lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  return la > 12 && la < 28 && lo > -10 && lo < 10;
}

const before = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const beforeNear = before.filter(nearGlobal);
console.log(`before: ${before.length} events, near-[20,0]/Global-jitter envelope: ${beforeNear.length}`);

const { events, fixed, cleared } = applyMapEligibility(before);
const afterNear = events.filter(nearGlobal);
const mapOn = events.filter((e) => e.mapEligible === true && Number.isFinite(Number(e.lat)));
const mapOff = events.filter((e) => e.mapEligible === false);

console.log(`after: fixed=${fixed} cleared=${cleared}`);
console.log(`after near-[20,0] envelope with coords: ${afterNear.length}`);
console.log(`mapEligible true: ${mapOn.length}; false: ${mapOff.length}`);
console.log('remaining near-[20,0]:');
for (const e of afterNear) {
  console.log(`  - [${e.mapEligible ? 'MAP' : 'off'}] ${e.title.slice(0, 90)} @ ${e.lat},${e.lon} (${e.region})`);
}
console.log('sample mapEligible=false titles:');
for (const e of mapOff.slice(0, 15)) {
  console.log(`  - ${e.title.slice(0, 90)} (lat=${e.lat})`);
}

const moscow = events.filter((e) => /moscow/i.test(e.title) || (Number(e.lat) > 55 && Number(e.lat) < 56 && Number(e.lon) > 37 && Number(e.lon) < 38));
const saudi = events.filter((e) => /riyadh|saudi capital|saudi arabia/i.test(`${e.title} ${e.summary}`) || (Math.abs(Number(e.lat) - 24.71) < 0.2 && Math.abs(Number(e.lon) - 46.68) < 0.2));
console.log('Moscow pins:', moscow.map((e) => `${e.title.slice(0, 50)} @${e.lat},${e.lon} elig=${e.mapEligible}`));
console.log('Saudi/Riyadh pins:', saudi.map((e) => `${e.title.slice(0, 50)} @${e.lat},${e.lon} elig=${e.mapEligible}`));

fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2) + '\n');

if (fs.existsSync(snapPath)) {
  const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  snap.events = events;
  snap.generatedAt = new Date().toISOString();
  if ('updatedAt' in snap) snap.updatedAt = snap.generatedAt;
  fs.writeFileSync(snapPath, JSON.stringify(snap, null, 2) + '\n');
  console.log('snapshot.json events rebuilt from events.json');
}

console.log('wrote', eventsPath);
