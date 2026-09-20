/**
 * Shared X-scroll normalize / merge helpers (dry-run, Playwright live, browser handoff).
 * No X API. No user-X MCP.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveEventGeo } from './geocode.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(__dirname, '../..');
export const allowlistPath = path.join(root, 'ingest/allowlists/x-security.json');
export const publicEvents = path.join(root, 'apps/web/public/data/events.json');
export const publicFeeds = path.join(root, 'apps/web/public/data/feeds.json');
export const publicSnapshot = path.join(root, 'apps/web/public/data/snapshot.json');
export const seedEvents = path.join(root, 'data/seed/events.json');
export const rawDir = path.join(root, 'data/raw');

const LAYER_GUESS = [
  [/cyber|ransomware|malware|phishing/i, 'cyber'],
  [/ship|vessel|maritime|red sea|hormuz|piracy|tanker|strait/i, 'maritime'],
  [/sanction|diplomacy|embassy|visa|ceasefire|talks/i, 'sanctions'],
  [/terror|isis|al-qaeda|ied|hostage/i, 'terrorism'],
  [/protest|riot|strike|unrest/i, 'unrest'],
  [/earthquake|flood|wildfire|disaster|quake/i, 'disaster'],
  [/.*/, 'conflict'],
];

export function guessLayer(text) {
  for (const [re, layer] of LAYER_GUESS) {
    if (re.test(text)) return layer;
  }
  return 'conflict';
}

export function severityToFallout(sev) {
  if (sev >= 5) return 'critical';
  if (sev >= 4) return 'high';
  if (sev >= 3) return 'medium';
  return 'low';
}

export function falloutHeuristic(text, reliability) {
  let sev = 2;
  if (/critical|massacre|invasion|nuclear|strike|attack|missile|drone swarm/i.test(text)) sev = 4;
  if (/war|invasion|nuclear|genocide|catastrophic/i.test(text)) sev = 5;
  if (/advisory|exercise|talks|sanction|diplomacy/i.test(text)) sev = Math.max(sev, 3);
  if (reliability === 'C' || reliability === 'D') sev = Math.max(1, sev - 1);
  return { severity: sev, falloutRisk: severityToFallout(sev) };
}

export function loadAllowlist() {
  return JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
}

export function allowlistByHandle(allowlist) {
  const map = new Map();
  for (const a of allowlist.accounts || []) {
    map.set(String(a.handle).toLowerCase(), a);
  }
  return map;
}

export function loadExistingEvents() {
  if (fs.existsSync(publicEvents)) {
    return JSON.parse(fs.readFileSync(publicEvents, 'utf8'));
  }
  if (fs.existsSync(seedEvents)) {
    return JSON.parse(fs.readFileSync(seedEvents, 'utf8'));
  }
  return [];
}

export function mergeById(existing, incoming) {
  const map = new Map(existing.map((e) => [e.id, e]));
  let added = 0;
  let updated = 0;
  for (const e of incoming) {
    if (map.has(e.id)) {
      map.set(e.id, { ...map.get(e.id), ...e });
      updated++;
    } else {
      map.set(e.id, e);
      added++;
    }
  }
  return { events: [...map.values()], added, updated };
}

/**
 * Normalize a pointer (dry / live / browser) into an events.json row.
 */
export function pointerToEvent(ptr) {
  const { severity, falloutRisk } = falloutHeuristic(ptr.text || ptr.title || '', ptr.reliability);
  const title = String(ptr.title || ptr.text || `Update from @${ptr.author}`).slice(0, 160);
  const summary = String(ptr.text || title).slice(0, 280);
  let lat;
  let lon;
  let region;
  if (ptr.lat != null && ptr.lon != null) {
    lat = Number(ptr.lat);
    lon = Number(ptr.lon);
    region = ptr.regionHint || 'Global';
  } else {
    const geo = resolveEventGeo({
      title,
      summary,
      region: ptr.regionHint || 'Global',
      jitterIndex: 0,
      jitterSalt: ptr.id,
    });
    lat = geo.lat;
    lon = geo.lon;
    region = geo.region;
    if (geo.matchedFrom === 'region-fallback') {
      let hash = 0;
      for (let i = 0; i < ptr.id.length; i++) hash = (hash * 31 + ptr.id.charCodeAt(i)) | 0;
      lat += ((hash % 1000) / 1000 - 0.5) * 0.4;
      lon += ((((hash / 1000) | 0) % 1000) / 1000 - 0.5) * 0.4;
    }
  }
  return {
    id: ptr.id,
    title,
    summary,
    layer: guessLayer(`${title} ${ptr.text || ''}`),
    severity,
    falloutRisk,
    confidence: ptr.reliability === 'A' ? 0.7 : ptr.reliability === 'B' ? 0.6 : 0.45,
    lat,
    lon,
    region,
    source: 'x-scroll',
    sourceReliability: ptr.reliability || 'C',
    url: ptr.url,
    observedAt: ptr.observedAt,
    ingestedAt: ptr.ingestedAt || new Date().toISOString(),
    author: ptr.author,
  };
}

/**
 * Enrich a browser-handoff pointer with allowlist metadata + stable id.
 */
export function normalizeBrowserPointer(raw, allowlistMap, ingestedAt) {
  const author = String(raw.author || '').replace(/^@/, '').trim();
  if (!author) return null;
  const text = String(raw.text || raw.title || '').trim();
  const title = String(raw.title || raw.text || `Update from @${author}`).trim();
  if (!text && !title) return null;
  const url = String(raw.url || `https://x.com/${author}`).trim();
  const postId =
    (raw.postId && String(raw.postId)) ||
    (url.match(/status\/(\d+)/) || [])[1] ||
    `browser_${author}_${Buffer.from(`${url}|${title}`).toString('base64url').slice(0, 16)}`;
  const acct = allowlistMap.get(author.toLowerCase()) || {};
  const observedAt = raw.observedAt || ingestedAt;
  return {
    id: `xscroll-${author.toLowerCase()}-${postId}`,
    postId: String(postId),
    author,
    category: raw.category || acct.category || 'wire',
    reliability: raw.reliability || acct.reliability || 'C',
    title: title.slice(0, 160),
    text: (text || title).slice(0, 280),
    url,
    observedAt,
    ingestedAt,
    regionHint: raw.regionHint || acct.regionHint || 'Global',
    mode: 'browser',
    sourceReliability: raw.reliability || acct.reliability || 'C',
    lat: raw.lat,
    lon: raw.lon,
  };
}

export function updateFeedStatus(mode, count, extra = '') {
  if (!fs.existsSync(publicFeeds)) return;
  const feeds = JSON.parse(fs.readFileSync(publicFeeds, 'utf8'));
  const now = new Date().toISOString();
  const idx = feeds.findIndex((f) => f.id === 'x-scroll');
  const entry = {
    id: 'x-scroll',
    name: 'X allowlist scroll',
    status: count > 0 ? 'Pass' : 'Warn',
    lastEvaluatedAt: now,
    detail: `${mode}: ${count} pointers merged (no X API search)${extra ? `; ${extra}` : ''}`,
    rule: 'allowlist_scroll && merge_by_id',
    snapshot: `x-scroll@${now.slice(0, 10)}`,
  };
  if (idx >= 0) feeds[idx] = entry;
  else feeds.push(entry);
  fs.writeFileSync(publicFeeds, JSON.stringify(feeds, null, 2));
}

export function writeRaw(pointers, mode, meta = {}, filename) {
  fs.mkdirSync(rawDir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const out = path.join(rawDir, filename || `x-scroll-${day}.json`);
  fs.writeFileSync(
    out,
    JSON.stringify(
      { mode, generatedAt: new Date().toISOString(), count: pointers.length, meta, pointers },
      null,
      2,
    ),
  );
  return out;
}

export function writeEventsAndSnapshot(events) {
  fs.mkdirSync(path.dirname(publicEvents), { recursive: true });
  fs.writeFileSync(publicEvents, JSON.stringify(events, null, 2));
  if (fs.existsSync(publicSnapshot)) {
    const snap = JSON.parse(fs.readFileSync(publicSnapshot, 'utf8'));
    snap.events = events;
    snap.generatedAt = new Date().toISOString();
    if (fs.existsSync(publicFeeds)) {
      snap.feeds = JSON.parse(fs.readFileSync(publicFeeds, 'utf8'));
    }
    fs.writeFileSync(publicSnapshot, JSON.stringify(snap, null, 2));
  }
}
