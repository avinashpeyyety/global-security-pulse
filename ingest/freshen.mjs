#!/usr/bin/env node
/**
 * Freshness pass. Runs after all ingests, before the daily report.
 * - Drops seed-pack placeholder events (ids starting "evt-").
 * - Drops anything observed more than GSP_MAX_AGE_DAYS ago (default 7), so the
 *   7d / 30d views stay honest and hotspots are driven by current data.
 * - Mirrors the result into snapshot.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const eventsPath = path.join(root, 'apps/web/public/data/events.json');
const snapPath = path.join(root, 'apps/web/public/data/snapshot.json');
const maxAgeDays = Number(process.env.GSP_MAX_AGE_DAYS || 7);
const cutoff = Date.now() - maxAgeDays * 86400e3;

const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const kept = events.filter((e) => {
  if (String(e.id || '').startsWith('evt-')) return false;
  const t = Date.parse(e.observedAt || e.ingestedAt || '');
  return Number.isFinite(t) && t >= cutoff;
});
kept.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
fs.writeFileSync(eventsPath, JSON.stringify(kept, null, 2));
if (fs.existsSync(snapPath)) {
  const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  snap.events = kept;
  snap.generatedAt = new Date().toISOString();
  fs.writeFileSync(snapPath, JSON.stringify(snap, null, 2));
}
const day = kept.filter((e) => Date.parse(e.observedAt) >= Date.now() - 86400e3).length;
console.log(`freshen: kept ${kept.length}/${events.length} events (≤${maxAgeDays}d); ${day} in last 24h`);
