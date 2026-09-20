#!/usr/bin/env node
/**
 * X allowlist scroll ingest — NO paid X API / no search_posts_all / no user-X MCP.
 *
 * Modes:
 *   --dry-run (default when --live not passed)
 *                        Synthesize structured event pointers from allowlist.
 *   --live               Budgeted Playwright timeline scroll if playwright is installed.
 *                        OPTIONAL. On Grok box, headless Playwright often gets HTTP 403
 *                        from x.com. Prefer browser handoff instead:
 *                          computerUse Chrome scroll → data/raw/x-scroll-browser-latest.json
 *                          → npm run ingest:x-scroll:browser
 *                        See ingest/x-scroll-browser-handoff.mjs and agents/x-scroll/README.md.
 *
 * Env (optional, Playwright --live only):
 *   GSP_X_STORAGE_STATE  Path to Playwright storageState JSON (logged-in session).
 *                        Never commit this file. See agents/x-scroll/README.md.
 *   GSP_X_MAX_PROFILES   Override max profiles per session (smoke / CI).
 *   GSP_X_MAX_POSTS      Override max posts per profile.
 *   GSP_X_STOP_AFTER_MS  Override hard stop budget.
 *   GSP_X_MIN_DELAY_MS / GSP_X_MAX_DELAY_MS
 *   GSP_X_HANDLES        Comma-separated handle filter for smoke.
 *   GSP_X_CHROME_PATH    Optional system Chrome binary for channel launch.
 *
 * Merges into apps/web/public/data/events.json by id (does not wipe seed blindly).
 * Raw session dump: data/raw/x-scroll-YYYYMMDD.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { stampMeta } from './lib/stamp-meta.mjs';
import {
  root,
  allowlistPath,
  loadAllowlist,
  loadExistingEvents,
  mergeById,
  pointerToEvent,
  updateFeedStatus,
  writeRaw,
  writeEventsAndSnapshot,
} from './lib/x-scroll-shared.mjs';

const args = new Set(process.argv.slice(2));
const wantLive = args.has('--live');

const LOGIN_WALL_RE =
  /sign in to x|log in to x|\bsign in\b|\blog in\b|something went wrong|rate limit|try again later|this account doesn.t exist|account suspended|to view this profile/i;

function envInt(name, fallback) {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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
    const text = `[dry-run] ${theme} via @${a.handle} (${a.category}). Live Playwright scroll replaces this placeholder — on Grok box prefer browser handoff (ingest:x-scroll:browser).`;
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
    console.warn('  On Grok box prefer: npm run ingest:x-scroll:browser (computerUse handoff)');
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
      'x-scroll: no GSP_X_STORAGE_STATE — anonymous Chromium (login walls / 403 likely on box). Prefer ingest:x-scroll:browser.',
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
          `On Grok box prefer computerUse Chrome → npm run ingest:x-scroll:browser. ` +
          `Optional: GSP_X_STORAGE_STATE on a residential network. Falling back to dry-run.`,
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
    allowlist.accounts = allowlist.accounts.filter((account) =>
      requested.has(account.handle.toLowerCase()),
    );
    console.log(
      `x-scroll: handle filter → ${allowlist.accounts.map((account) => `@${account.handle}`).join(', ') || '(none)'}`,
    );
  }
  let pointers = null;
  let mode = 'dry-run';
  let liveMeta = null;

  if (wantLive && !args.has('--dry-run')) {
    console.warn(
      'x-scroll: --live is optional; on Grok box Playwright often 403s — prefer ingest:x-scroll:browser',
    );
    const result = await tryLiveScroll(allowlist);
    liveMeta = result.meta;
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
  writeEventsAndSnapshot(events);

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
