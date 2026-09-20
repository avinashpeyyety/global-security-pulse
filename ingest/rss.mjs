#!/usr/bin/env node
/**
 * Lightweight RSS / Atom ingest for open security wires.
 * Merges into apps/web/public/data/events.json by id. No API keys.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicEvents = path.join(root, 'apps/web/public/data/events.json');
const publicFeeds = path.join(root, 'apps/web/public/data/feeds.json');
const publicSnapshot = path.join(root, 'apps/web/public/data/snapshot.json');
const seedEvents = path.join(root, 'data/seed/events.json');

const FEEDS = [
  {
    id: 'bbc-world',
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    reliability: 'A',
    region: 'Global',
  },
  {
    id: 'guardian-world',
    name: 'Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    reliability: 'A',
    region: 'Global',
  },
  {
    id: 'aljazeera',
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    reliability: 'B',
    region: 'Middle East',
  },
];

const LAYER_GUESS = [
  [/cyber|ransomware|malware/i, 'cyber'],
  [/ship|vessel|maritime|red sea|hormuz|piracy|tanker/i, 'maritime'],
  [/sanction|diplomacy|embassy|ceasefire/i, 'sanctions'],
  [/terror|isis|hostage/i, 'terrorism'],
  [/protest|riot|unrest/i, 'unrest'],
  [/earthquake|flood|wildfire|disaster/i, 'disaster'],
  [/war|attack|military|missile|drone|troop|conflict|bomb/i, 'conflict'],
  [/.*/, 'conflict'],
];

const REGION_COORDS = {
  Global: [20, 0],
  'Middle East': [29, 45],
  Europe: [50, 10],
  Americas: [38, -95],
  Africa: [5, 20],
  'East / SE Asia': [15, 105],
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

function severityFromTitle(title) {
  let sev = 2;
  if (/attack|strike|missile|killed|bomb|invasion|war/i.test(title)) sev = 4;
  if (/nuclear|massacre|genocide/i.test(title)) sev = 5;
  if (/talks|ceasefire|diplomacy|sanction|election/i.test(title)) sev = 3;
  return sev;
}

function decodeXml(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}

function parseItems(xml, limit = 12) {
  const items = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  const entries = blocks.length ? blocks : xml.split(/<entry[\s>]/i).slice(1);
  for (const block of entries.slice(0, limit)) {
    const title = decodeXml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const link =
      decodeXml((block.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || '') ||
      decodeXml((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '');
    const desc = decodeXml(
      (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
        block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
        [])[1] || title,
    );
    const pub =
      decodeXml((block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || '') ||
      decodeXml((block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) || [])[1] || '') ||
      decodeXml((block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) || [])[1] || '');
    if (!title) continue;
    items.push({ title, link, desc, pub });
  }
  return items;
}

function slugId(feedId, title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `rss-${feedId}-${slug || 'item'}`;
}

function mergeById(existing, incoming) {
  const map = new Map(existing.map((e) => [e.id, e]));
  let added = 0;
  for (const e of incoming) {
    if (map.has(e.id)) map.set(e.id, { ...map.get(e.id), ...e });
    else {
      map.set(e.id, e);
      added++;
    }
  }
  return { events: [...map.values()], added };
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: {
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      'User-Agent': 'GlobalSecurityPulse/0.1 (+https://github.com/avinashpeyyety/global-security-pulse)',
    },
    signal: AbortSignal.timeout(18000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const items = parseItems(xml, 10);
  const now = new Date().toISOString();
  const [lat0, lon0] = REGION_COORDS[feed.region] || REGION_COORDS.Global;
  return items.map((it, i) => {
    const sev = severityFromTitle(it.title);
    const observed = it.pub ? new Date(it.pub) : new Date(Date.now() - i * 3600e3);
    return {
      id: slugId(feed.id, it.title),
      title: it.title.slice(0, 160),
      summary: (it.desc || it.title).slice(0, 280),
      layer: guessLayer(`${it.title} ${it.desc}`),
      severity: sev,
      falloutRisk: severityToFallout(sev),
      confidence: feed.reliability === 'A' ? 0.72 : 0.58,
      lat: lat0 + ((((slugId(feed.id, it.title).length * 17 + i * 13) % 100) / 100) - 0.5) * 8,
      lon: lon0 + ((((slugId(feed.id, it.title).length * 29 + i * 7) % 100) / 100) - 0.5) * 12,
      region: feed.region,
      source: `rss:${feed.name}`,
      sourceReliability: feed.reliability,
      url: it.link || undefined,
      observedAt: Number.isFinite(observed.getTime()) ? observed.toISOString() : now,
      ingestedAt: now,
    };
  });
}

function updateFeedStatus(ok, detail) {
  if (!fs.existsSync(publicFeeds)) return;
  const feeds = JSON.parse(fs.readFileSync(publicFeeds, 'utf8'));
  const now = new Date().toISOString();
  const entry = {
    id: 'rss',
    name: 'RSS wires',
    status: ok ? 'Pass' : 'Warn',
    lastEvaluatedAt: now,
    detail,
    rule: 'http_200 && items>=1',
    snapshot: `rss@${now.slice(0, 10)}`,
  };
  const idx = feeds.findIndex((f) => f.id === 'rss');
  if (idx >= 0) feeds[idx] = entry;
  else feeds.push(entry);
  fs.writeFileSync(publicFeeds, JSON.stringify(feeds, null, 2));
}

async function main() {
  const existing = fs.existsSync(publicEvents)
    ? JSON.parse(fs.readFileSync(publicEvents, 'utf8'))
    : fs.existsSync(seedEvents)
      ? JSON.parse(fs.readFileSync(seedEvents, 'utf8'))
      : [];

  const incoming = [];
  const notes = [];
  for (const feed of FEEDS) {
    try {
      const items = await fetchFeed(feed);
      incoming.push(...items);
      notes.push(`${feed.id}:${items.length}`);
      console.log(`  rss ${feed.id}: ${items.length} items`);
    } catch (err) {
      notes.push(`${feed.id}:fail`);
      console.warn(`  rss ${feed.id}: ${err.message}`);
    }
  }

  if (!incoming.length) {
    updateFeedStatus(false, `no items (${notes.join(', ')})`);
    console.warn('ingest:rss Warn — no live items; events unchanged');
    return;
  }

  const { events, added } = mergeById(existing, incoming);
  fs.writeFileSync(publicEvents, JSON.stringify(events, null, 2));
  if (fs.existsSync(publicSnapshot)) {
    const snap = JSON.parse(fs.readFileSync(publicSnapshot, 'utf8'));
    snap.events = events;
    snap.generatedAt = new Date().toISOString();
    fs.writeFileSync(publicSnapshot, JSON.stringify(snap, null, 2));
  }
  updateFeedStatus(true, `merged ${incoming.length} (added ${added}); ${notes.join(', ')}`);
  console.log(`ingest:rss Pass — merged ${incoming.length} items (added ${added})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
