#!/usr/bin/env node
/**
 * X allowlist scroll ingest — NO paid X API / no search_posts_all.
 *
 * Modes:
 *   --dry-run (default)  Synthesize structured event pointers from allowlist +
 *                        optional merge of recent GDELT/RSS-shaped titles.
 *   --live               Budgeted Playwright timeline scroll if playwright is installed.
 *
 * Merges into apps/web/public/data/events.json by id (does not wipe seed blindly).
 * Raw session dump: data/raw/x-scroll-YYYYMMDD.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stampMeta } from './lib/stamp-meta.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const allowlistPath = path.join(root, 'ingest/allowlists/x-security.json');
const publicEvents = path.join(root, 'apps/web/public/data/events.json');
const publicFeeds = path.join(root, 'apps/web/public/data/feeds.json');
const publicSnapshot = path.join(root, 'apps/web/public/data/snapshot.json');
const seedEvents = path.join(root, 'data/seed/events.json');
const rawDir = path.join(root, 'data/raw');

const args = new Set(process.argv.slice(2));
const wantLive = args.has('--live');
const dryRun = !wantLive || args.has('--dry-run');

const LAYER_GUESS = [
  [/cyber|ransomware|malware|phishing/i, 'cyber'],
  [/ship|vessel|maritime|red sea|hormuz|piracy|tanker|strait/i, 'maritime'],
  [/sanction|diplomacy|embassy|visa|ceasefire|talks/i, 'sanctions'],
  [/terror|isis|al-qaeda|ied|hostage/i, 'terrorism'],
  [/protest|riot|strike|unrest/i, 'unrest'],
  [/earthquake|flood|wildfire|disaster|quake/i, 'disaster'],
  [/.*/, 'conflict'],
];

const REGION_COORDS = {
  Global: [20, 0],
  Americas: [38, -95],
  Europe: [50, 10],
  'Eastern Europe': [49, 32],
  'Middle East': [29, 45],
  'South Asia': [22, 78],
  'East / SE Asia': [15, 105],
  Africa: [5, 20],
  'Red Sea / Bab el-Mandeb': [14.5, 42.5],
  'Persian Gulf': [26.5, 56],
};

function guessLayer(text) {
  for (const [re, layer] of LAYER_GUESS) {
    if (re.test(text)) return layer;
  }
  return 'conflict';
}

function severityToFallout(sev) {
  if (sev >= 5) return 'critical';
  if (sev >= 4) return 'high';
  if (sev >= 3) return 'medium';
  return 'low';
}

function falloutHeuristic(text, reliability) {
  let sev = 2;
  if (/critical|massacre|invasion|nuclear|strike|attack|missile|drone swarm/i.test(text)) sev = 4;
  if (/war|invasion|nuclear|genocide|catastrophic/i.test(text)) sev = 5;
  if (/advisory|exercise|talks|sanction|diplomacy/i.test(text)) sev = Math.max(sev, 3);
  if (reliability === 'C' || reliability === 'D') sev = Math.max(1, sev - 1);
  return { severity: sev, falloutRisk: severityToFallout(sev) };
}

function loadAllowlist() {
  const data = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  return data;
}

function loadExistingEvents() {
  if (fs.existsSync(publicEvents)) {
    return JSON.parse(fs.readFileSync(publicEvents, 'utf8'));
  }
  if (fs.existsSync(seedEvents)) {
    return JSON.parse(fs.readFileSync(seedEvents, 'utf8'));
  }
  return [];
}

function mergeById(existing, incoming) {
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

function pointerToEvent(ptr) {
  const region = ptr.regionHint || 'Global';
  const [lat, lon] =
    ptr.lat != null && ptr.lon != null
      ? [ptr.lat, ptr.lon]
      : REGION_COORDS[region] || REGION_COORDS.Global;
  const { severity, falloutRisk } = falloutHeuristic(ptr.text || ptr.title || '', ptr.reliability);
  const title = String(ptr.title || ptr.text || `Update from @${ptr.author}`).slice(0, 160);
  // Deterministic micro-jitter from id (stable across runs)
  let hash = 0;
  for (let i = 0; i < ptr.id.length; i++) hash = (hash * 31 + ptr.id.charCodeAt(i)) | 0;
  const jLat = ((hash % 1000) / 1000 - 0.5) * 0.4;
  const jLon = ((((hash / 1000) | 0) % 1000) / 1000 - 0.5) * 0.4;
  return {
    id: ptr.id,
    title,
    summary: String(ptr.text || title).slice(0, 280),
    layer: guessLayer(`${title} ${ptr.text || ''}`),
    severity,
    falloutRisk,
    confidence: ptr.reliability === 'A' ? 0.7 : ptr.reliability === 'B' ? 0.6 : 0.45,
    lat: Number(lat) + jLat,
    lon: Number(lon) + jLon,
    region,
    source: 'x-scroll',
    sourceReliability: ptr.reliability || 'C',
    url: ptr.url,
    observedAt: ptr.observedAt,
    ingestedAt: ptr.ingestedAt || new Date().toISOString(),
    author: ptr.author,
  };
}

function dryRunPointers(allowlist) {
  const now = new Date();
  const budget = allowlist.budget || {};
  const maxProfiles = Math.min(allowlist.accounts.length, budget.maxProfilesPerSession || 12);
  const accounts = allowlist.accounts.slice(0, maxProfiles);
  const themes = [
    'Maritime security advisory update',
    'Defense posture / readiness note',
    'Regional conflict monitoring brief',
    'Humanitarian access / displacement update',
    'Sanctions / diplomacy development',
  ];
  return accounts.map((a, i) => {
    const observed = new Date(now.getTime() - i * 45 * 60e3);
    const theme = themes[i % themes.length];
    const text = `[dry-run] ${theme} via @${a.handle} (${a.category}). Live Playwright scroll replaces this placeholder.`;
    return {
      id: `xscroll-dry-${a.handle.toLowerCase()}-${observed.toISOString().slice(0, 10)}`,
      postId: `dry_${a.handle}_${i}`,
      author: a.handle,
      category: a.category,
      reliability: a.reliability,
      title: `${a.displayName || a.handle}: ${theme}`,
      text,
      url: `https://x.com/${a.handle}`,
      observedAt: observed.toISOString(),
      ingestedAt: now.toISOString(),
      regionHint: a.regionHint || 'Global',
      mode: 'dry-run',
      sourceReliability: a.reliability,
    };
  });
}

async function tryLiveScroll(allowlist) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.warn('x-scroll: Playwright not installed — falling back to dry-run');
    return null;
  }
  const budget = allowlist.budget || {};
  const maxProfiles = Math.min(allowlist.accounts.length, budget.maxProfilesPerSession || 12);
  const maxPosts = budget.maxPostsPerProfile || 10;
  const minDelay = budget.minDelayMs || 1500;
  const maxDelay = budget.maxDelayMs || 4000;
  const stopAfter = budget.stopAfterMs || 180000;
  const started = Date.now();
  const pointers = [];
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    for (let i = 0; i < maxProfiles; i++) {
      if (Date.now() - started > stopAfter) break;
      const a = allowlist.accounts[i];
      const url = `https://x.com/${a.handle}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(minDelay + Math.floor(Math.random() * (maxDelay - minDelay)));
        const posts = await page.evaluate((limit) => {
          const articles = [...document.querySelectorAll('article')].slice(0, limit);
          return articles.map((el, idx) => {
            const text = (el.innerText || '').split('\n').slice(0, 6).join(' ').slice(0, 280);
            const link = el.querySelector('a[href*="/status/"]');
            const href = link ? link.href : null;
            return { text, href, idx };
          });
        }, maxPosts);
        const now = new Date();
        for (const p of posts) {
          if (!p.text || p.text.length < 20) continue;
          const postId =
            (p.href && (p.href.match(/status\/(\d+)/) || [])[1]) ||
            `live_${a.handle}_${p.idx}_${now.getTime()}`;
          pointers.push({
            id: `xscroll-${a.handle.toLowerCase()}-${postId}`,
            postId: String(postId),
            author: a.handle,
            category: a.category,
            reliability: a.reliability,
            title: String(p.text).slice(0, 120),
            text: p.text,
            url: p.href || `https://x.com/${a.handle}`,
            observedAt: now.toISOString(),
            ingestedAt: now.toISOString(),
            regionHint: a.regionHint || 'Global',
            mode: 'live',
            sourceReliability: a.reliability,
          });
        }
        console.log(`  live @${a.handle}: ${posts.length} articles scanned`);
      } catch (err) {
        console.warn(`  live @${a.handle}: ${err.message}`);
      }
      await page.waitForTimeout(minDelay);
    }
  } finally {
    await browser.close();
  }
  return pointers;
}

function updateFeedStatus(mode, count) {
  if (!fs.existsSync(publicFeeds)) return;
  const feeds = JSON.parse(fs.readFileSync(publicFeeds, 'utf8'));
  const now = new Date().toISOString();
  const idx = feeds.findIndex((f) => f.id === 'x-scroll');
  const entry = {
    id: 'x-scroll',
    name: 'X allowlist scroll',
    status: count > 0 ? 'Pass' : 'Warn',
    lastEvaluatedAt: now,
    detail: `${mode}: ${count} pointers merged (no X API search)`,
    rule: 'allowlist_scroll && merge_by_id',
    snapshot: `x-scroll@${now.slice(0, 10)}`,
  };
  if (idx >= 0) feeds[idx] = entry;
  else feeds.push(entry);
  fs.writeFileSync(publicFeeds, JSON.stringify(feeds, null, 2));
}

function writeRaw(pointers, mode) {
  fs.mkdirSync(rawDir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const out = path.join(rawDir, `x-scroll-${day}.json`);
  fs.writeFileSync(
    out,
    JSON.stringify({ mode, generatedAt: new Date().toISOString(), count: pointers.length, pointers }, null, 2),
  );
  return out;
}

async function main() {
  if (!fs.existsSync(allowlistPath)) {
    console.error('Missing allowlist at', allowlistPath);
    process.exit(1);
  }
  const allowlist = loadAllowlist();
  let pointers = null;
  let mode = 'dry-run';

  if (wantLive && !args.has('--dry-run')) {
    pointers = await tryLiveScroll(allowlist);
    if (pointers && pointers.length) mode = 'live';
  }
  if (!pointers || !pointers.length) {
    pointers = dryRunPointers(allowlist);
    mode = 'dry-run';
  }

  const rawPath = writeRaw(pointers, mode);
  const incoming = pointers.map(pointerToEvent);
  const existing = loadExistingEvents();
  const { events, added, updated } = mergeById(existing, incoming);

  fs.mkdirSync(path.dirname(publicEvents), { recursive: true });
  fs.writeFileSync(publicEvents, JSON.stringify(events, null, 2));
  // Keep seed as baseline — only update public; optionally sync seed if empty
  if (fs.existsSync(publicSnapshot)) {
    const snap = JSON.parse(fs.readFileSync(publicSnapshot, 'utf8'));
    snap.events = events;
    snap.generatedAt = new Date().toISOString();
    if (fs.existsSync(publicFeeds)) {
      snap.feeds = JSON.parse(fs.readFileSync(publicFeeds, 'utf8'));
    }
    fs.writeFileSync(publicSnapshot, JSON.stringify(snap, null, 2));
  }
  updateFeedStatus(mode, incoming.length);

  const um = stampMeta();
  console.log(
    `ingest:x-scroll ${mode} — ${incoming.length} pointers (added ${added}, updated ${updated}); raw → ${path.relative(root, rawPath)}`,
  );
  console.log('No X API credits used. Allowlist:', path.relative(root, allowlistPath));
  console.log(`  ${um.updatedAtLabel} · ${um.nextUpdateHint}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
