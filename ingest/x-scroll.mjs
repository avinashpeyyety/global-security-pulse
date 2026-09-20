#!/usr/bin/env node
/**
 * X allowlist scroll ingest — NO paid X API / no search_posts_all.
 *
 * Modes:
 *   --dry-run (default when --live not passed)
 *                        Synthesize structured event pointers from allowlist.
 *   --live               Budgeted Playwright timeline scroll if playwright is installed.
 *
 * Env (optional):
 *   GSP_X_STORAGE_STATE  Path to Playwright storageState JSON (logged-in session).
 *                        Never commit this file. See agents/x-scroll/README.md.
 *   GSP_X_MAX_PROFILES   Override max profiles per session (smoke / CI).
 *   GSP_X_MAX_POSTS      Override max posts per profile.
 *   GSP_X_STOP_AFTER_MS  Override hard stop budget.
 *   GSP_X_MIN_DELAY_MS / GSP_X_MAX_DELAY_MS
 *
 * Merges into apps/web/public/data/events.json by id (does not wipe seed blindly).
 * Raw session dump: data/raw/x-scroll-YYYYMMDD.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stampMeta } from './lib/stamp-meta.mjs';
import { resolveEventGeo } from './lib/geocode.mjs';

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

const LAYER_GUESS = [
  [/cyber|ransomware|malware|phishing/i, 'cyber'],
  [/ship|vessel|maritime|red sea|hormuz|piracy|tanker|strait/i, 'maritime'],
  [/sanction|diplomacy|embassy|visa|ceasefire|talks/i, 'sanctions'],
  [/terror|isis|al-qaeda|ied|hostage/i, 'terrorism'],
  [/protest|riot|strike|unrest/i, 'unrest'],
  [/earthquake|flood|wildfire|disaster|quake/i, 'disaster'],
  [/.*/, 'conflict'],
];

const LOGIN_WALL_RE =
  /sign in to x|log in to x|\bsign in\b|\blog in\b|something went wrong|rate limit|try again later|this account doesn.t exist|account suspended|to view this profile/i;

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

function envInt(name, fallback) {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function loadAllowlist() {
  return JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
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
    // Micro-jitter only for region-fallback (place hits stay pinned)
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

function dryRunPointers(allowlist) {
  const now = new Date();
  const budget = allowlist.budget || {};
  const maxProfiles = Math.min(
    allowlist.accounts.length,
    envInt('GSP_X_MAX_PROFILES', budget.maxProfilesPerSession || 12),
  );
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

/**
 * Detect login / consent / soft-block walls from page body text.
 * @returns {{ wall: boolean, reason: string | null, sample: string }}
 */
function detectLoginWall(bodyText) {
  const sample = String(bodyText || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!sample) return { wall: true, reason: 'empty-page', sample: '' };
  const m = sample.match(LOGIN_WALL_RE);
  if (m) {
    return { wall: true, reason: `matched:${m[0]}`, sample };
  }
  return { wall: false, reason: null, sample };
}

async function tryLiveScroll(allowlist) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.warn('x-scroll: Playwright not installed — falling back to dry-run');
    console.warn('  Install: npm i -D playwright && npx playwright install chromium');
    return { pointers: null, meta: { playwright: false, loginWalls: 0, profilesTried: 0 } };
  }

  const budget = allowlist.budget || {};
  const maxProfiles = Math.min(
    allowlist.accounts.length,
    envInt('GSP_X_MAX_PROFILES', budget.maxProfilesPerSession || 12),
  );
  const maxPosts = envInt('GSP_X_MAX_POSTS', budget.maxPostsPerProfile || 10);
  const minDelay = envInt('GSP_X_MIN_DELAY_MS', budget.minDelayMs || 1500);
  const maxDelay = envInt('GSP_X_MAX_DELAY_MS', budget.maxDelayMs || 4000);
  const stopAfter = envInt('GSP_X_STOP_AFTER_MS', budget.stopAfterMs || 180000);
  const started = Date.now();
  const pointers = [];
  let loginWalls = 0;
  let profilesTried = 0;
  let profilesWithPosts = 0;

  const storageStatePath = process.env.GSP_X_STORAGE_STATE
    ? path.resolve(process.env.GSP_X_STORAGE_STATE)
    : null;
  if (storageStatePath) {
    if (!fs.existsSync(storageStatePath)) {
      console.warn(
        `x-scroll: GSP_X_STORAGE_STATE set but file missing: ${storageStatePath} — continuing anonymously`,
      );
    } else {
      console.log(`x-scroll: using storageState ${storageStatePath}`);
    }
  } else {
    console.log(
      'x-scroll: no GSP_X_STORAGE_STATE — anonymous Chromium (login walls likely). See agents/x-scroll/README.md',
    );
  }

  const chromeUserAgent =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const browserStrategies = [
    {
      name: 'chromium-stealth',
      userAgent: chromeUserAgent,
      launch: () =>
        playwright.chromium.launch({
          headless: true,
          args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'],
        }),
    },
    {
      name: 'firefox',
      launch: () => playwright.firefox.launch({ headless: true }),
    },
  ];
  const chromeCandidates = [
    process.env.GSP_X_CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/opt/google/chrome/google-chrome',
  ].filter(Boolean);
  if (chromeCandidates.some((candidate) => fs.existsSync(candidate))) {
    browserStrategies.push({
      name: 'chrome-channel',
      userAgent: chromeUserAgent,
      launch: () =>
        playwright.chromium.launch({
          channel: 'chrome',
          headless: true,
          args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'],
        }),
    });
  }

  const strategyResults = [];
  for (const strategy of browserStrategies) {
    if (pointers.length || Date.now() - started > stopAfter) break;
    const strategyMeta = { name: strategy.name, profiles: [] };
    let browser;
    try {
      console.log(`x-scroll: trying browser strategy ${strategy.name}`);
      browser = await strategy.launch();
    } catch (err) {
      strategyMeta.error = err.message;
      strategyResults.push(strategyMeta);
      console.warn(`x-scroll: ${strategy.name} unavailable — ${err.message}`);
      continue;
    }

    const contextOpts = {
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
      timezoneId: 'America/Chicago',
      colorScheme: 'light',
    };
    if (strategy.userAgent) {
      contextOpts.userAgent = strategy.userAgent;
      contextOpts.extraHTTPHeaders = { 'Accept-Language': 'en-US,en;q=0.9' };
    }
    if (storageStatePath && fs.existsSync(storageStatePath)) {
      contextOpts.storageState = storageStatePath;
    }

    const context = await browser.newContext(contextOpts);
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    const page = await context.newPage();

    try {
      for (let i = 0; i < maxProfiles; i++) {
        if (Date.now() - started > stopAfter) {
          console.warn(`x-scroll: stopAfterMs=${stopAfter} reached after ${profilesTried} profiles`);
          break;
        }
        const a = allowlist.accounts[i];
        const url = `https://x.com/${a.handle}`;
        profilesTried++;
        const profileMeta = { handle: a.handle };
        try {
          const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
          const httpStatus = resp ? resp.status() : 0;
          profileMeta.httpStatus = httpStatus;
          await page.waitForTimeout(minDelay + Math.floor(Math.random() * Math.max(1, maxDelay - minDelay)));

          const bodyText = await page.evaluate(() => document.body?.innerText || '');
          let wall = detectLoginWall(bodyText);
          if (!wall.wall && (httpStatus === 403 || httpStatus === 429)) {
            wall = { wall: true, reason: `http-${httpStatus}`, sample: bodyText.slice(0, 240) };
          } else if (wall.wall && wall.reason === 'empty-page' && httpStatus) {
            wall = { ...wall, reason: `empty-page/http-${httpStatus}` };
          }

          const posts = await page.evaluate((limit) => {
            const articles = [...document.querySelectorAll('article')].slice(0, limit);
            return articles.map((el, idx) => {
              const text = (el.innerText || '').split('\n').slice(0, 6).join(' ').slice(0, 280);
              const link = el.querySelector('a[href*="/status/"]');
              const href = link ? link.href : null;
              return { text, href, idx };
            });
          }, maxPosts);

          const usable = posts.filter((post) => post.text && post.text.length >= 20);
          profileMeta.articles = posts.length;
          profileMeta.usablePosts = usable.length;
          profileMeta.wall = wall.wall;
          profileMeta.wallReason = wall.reason;
          profileMeta.wallText = wall.sample;

          if (wall.wall && usable.length === 0) {
            loginWalls++;
            console.warn(
              `  [${strategy.name}] live @${a.handle}: LOGIN/CONSENT WALL (${wall.reason}) — sample: "${wall.sample.slice(0, 120)}…"`,
            );
          } else if (usable.length === 0) {
            console.warn(
              `  [${strategy.name}] live @${a.handle}: 0 posts scraped (http=${httpStatus}; articles=${posts.length}; wall=${wall.wall ? wall.reason : 'no'})`,
            );
          } else {
            profilesWithPosts++;
            if (wall.wall) {
              console.warn(
                `  [${strategy.name}] live @${a.handle}: wall signals present (${wall.reason}) but scraped ${usable.length} posts`,
              );
            }
          }

          const now = new Date();
          for (const post of usable) {
            const postId =
              (post.href && (post.href.match(/status\/(\d+)/) || [])[1]) ||
              `live_${a.handle}_${post.idx}_${now.getTime()}`;
            pointers.push({
              id: `xscroll-${a.handle.toLowerCase()}-${postId}`,
              postId: String(postId),
              author: a.handle,
              category: a.category,
              reliability: a.reliability,
              title: String(post.text).slice(0, 120),
              text: post.text,
              url: post.href || `https://x.com/${a.handle}`,
              observedAt: now.toISOString(),
              ingestedAt: now.toISOString(),
              regionHint: a.regionHint || 'Global',
              mode: 'live',
              sourceReliability: a.reliability,
            });
          }
          console.log(
            `  [${strategy.name}] live @${a.handle}: ${usable.length} posts kept (${posts.length} articles scanned; http=${httpStatus})`,
          );
        } catch (err) {
          profileMeta.error = err.message;
          console.warn(`  [${strategy.name}] live @${a.handle}: ${err.message}`);
        }
        strategyMeta.profiles.push(profileMeta);
        await page.waitForTimeout(minDelay);
        if (pointers.length) break;
      }
    } finally {
      strategyMeta.posts = pointers.length;
      strategyResults.push(strategyMeta);
      await browser.close();
    }
  }

  const meta = {
    playwright: true,
    loginWalls,
    profilesTried,
    profilesWithPosts,
    storageState: Boolean(storageStatePath && fs.existsSync(storageStatePath)),
    browserStrategies: strategyResults,
  };

  if (pointers.length === 0) {
    if (loginWalls > 0) {
      console.warn(
        `x-scroll: LIVE scraped 0 posts across ${profilesTried} profiles; login/consent/HTTP walls on ${loginWalls}. ` +
          `Set GSP_X_STORAGE_STATE to a Playwright storageState JSON from a logged-in session on a network that can reach x.com ` +
          `(datacenter IPs often get HTTP 403 with an empty body). Falling back to dry-run.`,
      );
    } else {
      console.warn(
        `x-scroll: LIVE scraped 0 posts across ${profilesTried} profiles (no clear login wall). Falling back to dry-run.`,
      );
    }
  } else {
    console.log(
      `x-scroll: LIVE ok — ${pointers.length} posts from ${profilesWithPosts}/${profilesTried} profiles` +
        (loginWalls ? ` (${loginWalls} wall hits on other profiles)` : ''),
    );
  }

  return { pointers, meta };
}

function updateFeedStatus(mode, count, extra = '') {
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

function writeRaw(pointers, mode, meta = {}) {
  fs.mkdirSync(rawDir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const out = path.join(rawDir, `x-scroll-${day}.json`);
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

async function main() {
  if (!fs.existsSync(allowlistPath)) {
    console.error('Missing allowlist at', allowlistPath);
    process.exit(1);
  }
  const allowlist = loadAllowlist();
  const requestedHandles = (process.env.GSP_X_HANDLES || '')
    .split(',')
    .map((handle) => handle.trim().toLowerCase())
    .filter(Boolean);
  if (requestedHandles.length) {
    const requested = new Set(requestedHandles);
    allowlist.accounts = allowlist.accounts.filter((account) => requested.has(account.handle.toLowerCase()));
    console.log(`x-scroll: handle filter → ${allowlist.accounts.map((account) => `@${account.handle}`).join(', ') || '(none)'}`);
  }
  let pointers = null;
  let mode = 'dry-run';
  let liveMeta = null;

  if (wantLive && !args.has('--dry-run')) {
    const result = await tryLiveScroll(allowlist);
    liveMeta = result.meta;
    // Fall back to dry-run ONLY if zero posts scraped across all profiles
    if (result.pointers && result.pointers.length) {
      pointers = result.pointers;
      mode = 'live';
    } else {
      pointers = null;
      mode = 'dry-run';
    }
  }
  if (!pointers || !pointers.length) {
    pointers = dryRunPointers(allowlist);
    mode = 'dry-run';
  }

  const rawPath = writeRaw(pointers, mode, liveMeta || {});
  const incoming = pointers.map(pointerToEvent);
  const existing = loadExistingEvents();
  const { events, added, updated } = mergeById(existing, incoming);

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
  const wallNote =
    liveMeta && liveMeta.loginWalls
      ? `${liveMeta.loginWalls} login-wall profile(s)`
      : liveMeta && liveMeta.playwright === false
        ? 'playwright missing'
        : '';
  updateFeedStatus(mode, incoming.length, wallNote);

  const um = stampMeta();
  console.log(
    `ingest:x-scroll ${mode} — ${incoming.length} pointers (added ${added}, updated ${updated}); raw → ${path.relative(root, rawPath)}`,
  );
  if (liveMeta) {
    console.log(
      `  live meta: profilesTried=${liveMeta.profilesTried ?? 0} withPosts=${liveMeta.profilesWithPosts ?? 0} loginWalls=${liveMeta.loginWalls ?? 0} storageState=${liveMeta.storageState ?? false}`,
    );
  }
  console.log('No X API credits used. Allowlist:', path.relative(root, allowlistPath));
  console.log(`  ${um.updatedAtLabel} · ${um.nextUpdateHint}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
