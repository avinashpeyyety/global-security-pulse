#!/usr/bin/env node
/**
 * Lightweight RSS / Atom ingest for open security wires.
 * Merges into apps/web/public/data/events.json by id. No API keys.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stampMeta } from './lib/stamp-meta.mjs';
import { resolveEventGeo, regeocodeWrongGlobal, regeocodeAllNamed } from './lib/geocode.mjs';

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
  // v0.2 feed pack (probed 2026-09-27 from box: all HTTP 200 with fresh items)
  { id: 'france24', name: 'France 24', url: 'https://www.france24.com/en/rss', reliability: 'A', region: 'Global' },
  { id: 'dw-world', name: 'DW World', url: 'https://rss.dw.com/rdf/rss-en-world', reliability: 'A', region: 'Global' },
  { id: 'npr-world', name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', reliability: 'A', region: 'Global' },
  { id: 'nyt-world', name: 'NYT World', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', reliability: 'A', region: 'Global' },
  { id: 'sky-world', name: 'Sky News World', url: 'https://feeds.skynews.com/feeds/rss/world.xml', reliability: 'A', region: 'Global' },
  { id: 'cbs-world', name: 'CBS World', url: 'https://www.cbsnews.com/latest/rss/world', reliability: 'A', region: 'Global' },
  { id: 'un-news', name: 'UN News', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', reliability: 'A', region: 'Global' },
  { id: 'reliefweb', name: 'ReliefWeb', url: 'https://reliefweb.int/updates/rss.xml', reliability: 'A', region: 'Global', layer: 'disaster' },
  { id: 'guardian-ukraine', name: 'Guardian Ukraine', url: 'https://www.theguardian.com/world/ukraine/rss', reliability: 'A', region: 'Europe' },
  { id: 'times-of-israel', name: 'Times of Israel', url: 'https://www.timesofisrael.com/feed/', reliability: 'B', region: 'Middle East' },
  { id: 'diplomat', name: 'The Diplomat', url: 'https://thediplomat.com/feed/', reliability: 'A', region: 'Asia' },
  { id: 'scmp-asia', name: 'SCMP', url: 'https://www.scmp.com/rss/91/feed', reliability: 'B', region: 'Asia' },
  { id: 'africanews', name: 'Africanews', url: 'https://www.africanews.com/feed/rss', reliability: 'B', region: 'Africa' },
  { id: 'crisisgroup', name: 'Crisis Group', url: 'https://www.crisisgroup.org/rss.xml', reliability: 'A', region: 'Global' },
  { id: 'breaking-defense', name: 'Breaking Defense', url: 'https://breakingdefense.com/feed/', reliability: 'A', region: 'Global' },
  { id: 'defense-news', name: 'Defense News', url: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml', reliability: 'A', region: 'Global' },
  { id: 'gcaptain', name: 'gCaptain', url: 'https://gcaptain.com/feed/', reliability: 'A', region: 'Global', layer: 'maritime' },
  { id: 'maritime-exec', name: 'Maritime Executive', url: 'https://www.maritime-executive.com/articles.rss', reliability: 'A', region: 'Global', layer: 'maritime' },
  { id: 'cisa', name: 'CISA advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', reliability: 'A', region: 'Americas', layer: 'cyber' },
  { id: 'bleepingcomputer', name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', reliability: 'A', region: 'Global', layer: 'cyber' },
  { id: 'the-record', name: 'The Record', url: 'https://therecord.media/feed', reliability: 'A', region: 'Global', layer: 'cyber' },
  { id: 'gdacs', name: 'GDACS alerts', url: 'https://www.gdacs.org/xml/rss.xml', reliability: 'A', region: 'Global', layer: 'disaster' },
  { id: 'usgs-m45', name: 'USGS M4.5+ quakes', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.atom', reliability: 'A', region: 'Global', layer: 'disaster' },
  { id: 'bellingcat', name: 'Bellingcat', url: 'https://www.bellingcat.com/feed/', reliability: 'A', region: 'Global' },
  // Skipped: Reuters/AP (no clean free RSS), ISW (403), Kyiv Independent (404), MEE/Defense Post (empty).
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
      decodeXml((block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) || [])[1] || '') ||
      decodeXml((block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i) || [])[1] || '');
    if (!title) continue;
    // Native coordinates (USGS georss:point, GDACS geo:lat/geo:long) + GDACS alert level.
    let point = null;
    const gp = block.match(/<georss:point>\s*(-?[\d.]+)\s+(-?[\d.]+)/i);
    const gl = block.match(/<geo:lat>\s*(-?[\d.]+)/i);
    const gn = block.match(/<geo:long>\s*(-?[\d.]+)/i);
    if (gp) point = { lat: Number(gp[1]), lon: Number(gp[2]) };
    else if (gl && gn) point = { lat: Number(gl[1]), lon: Number(gn[1]) };
    const alert = ((block.match(/<gdacs:alertlevel>([^<]+)/i) || [])[1] || '').trim();
    items.push({ title, link, desc, pub, point, alert });
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
  const MAX_AGE_MS = Number(process.env.GSP_RSS_MAX_AGE_H || 72) * 3600e3;
  const items = parseItems(xml, 10).filter((it) => {
    const t = new Date(it.pub).getTime();
    return !Number.isFinite(t) || Date.now() - t <= MAX_AGE_MS;
  });
  const now = new Date().toISOString();
  return items.map((it, i) => {
    const sev = severityFromTitle(it.title);
    const observed = it.pub ? new Date(it.pub) : new Date(Date.now() - i * 3600e3);
    const title = it.title.slice(0, 160);
    const summary = (it.desc || it.title).slice(0, 280);
    const layer = feed.layer || guessLayer(`${it.title} ${it.desc}`);
    const falloutRisk = severityToFallout(sev);
    let geo = resolveEventGeo({
      title,
      summary,
      region: feed.region,
      layer,
      falloutRisk,
      jitterIndex: i,
      jitterSalt: slugId(feed.id, it.title),
    });
    // Hazard feeds with exact coords: pin significant events directly.
    const mag = Number((it.title.match(/^M\s*([\d.]+)/) || [])[1]);
    const significantHazard =
      it.point &&
      Number.isFinite(it.point.lat) &&
      ((feed.id === 'usgs-m45' && mag >= 5.0) || (feed.id === 'gdacs' && /orange|red/i.test(it.alert)));
    if (significantHazard) {
      geo.lat = Math.round(it.point.lat * 100) / 100;
      geo.lon = Math.round(it.point.lon * 100) / 100;
      geo.mapEligible = true;
      if (!geo.region || geo.region === 'Global') geo.region = feed.region;
    }
    return {
      id: slugId(feed.id, it.title),
      title,
      summary,
      layer,
      severity: sev,
      falloutRisk,
      confidence: feed.reliability === 'A' ? 0.72 : 0.58,
      lat: geo.lat,
      lon: geo.lon,
      region: geo.region,
      mapEligible: geo.mapEligible === true,
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
  const rawExisting = fs.existsSync(publicEvents)
    ? JSON.parse(fs.readFileSync(publicEvents, 'utf8'))
    : fs.existsSync(seedEvents)
      ? JSON.parse(fs.readFileSync(seedEvents, 'utf8'))
      : [];
  const { events: jitterFixed, fixed: regeoFixed } = regeocodeWrongGlobal(rawExisting);
  if (regeoFixed) console.log(`  re-geocoded ${regeoFixed} Global-jitter event(s) from title/summary places`);
  const { events: existing, fixed: namedFixed, cleared } = regeocodeAllNamed(jitterFixed);
  if (namedFixed || cleared) console.log(`  regeocodeAllNamed: updated ${namedFixed}, cleared Global-jitter ${cleared}`);

  const incoming = [];
  const notes = [];
  const settled = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f)));
  for (const [idx, feed] of FEEDS.entries()) {
    try {
      const r = settled[idx];
      if (r.status === 'rejected') throw r.reason;
      const items = r.value;
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
  const um = stampMeta();
  console.log(`ingest:rss Pass — merged ${incoming.length} items (added ${added})`);
  console.log(`  ${um.updatedAtLabel} · ${um.nextUpdateHint}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
