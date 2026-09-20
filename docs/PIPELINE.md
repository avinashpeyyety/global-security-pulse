# Ingest & intel pipeline

Cheap, open-source-first cadence for Global Security Pulse. **No paid X API search** (`search_posts_all` is forbidden by default).

## Cadence

| When | What | Notes |
|------|------|-------|
| On demand / daily | `npm run ingest:all` | Markets → GDELT → RSS → **X-scroll live** (`node ingest/x-scroll.mjs --live`) → daily snapshot |
| Every day 8:20 AM / 1:20 PM / 6:20 PM CT | Data inject + commit | Header shows Updated / Next update from `meta.json` |
| Daily evening | Same + commit | Refreshes `apps/web/public/data/*` and archives `reports/daily/YYYY-MM-DD/` |
| Weekends | Same daily inject schedule | UI advances to the next daily slot, including Sat → Sun and Sun → Mon |
| Ad-hoc | `npm run report:daily` | Snapshot only (current public data) |
| Ad-hoc dry X | `npm run ingest:x-scroll` | Synthesize pointers (no browser) |
| Ad-hoc live X | `npm run ingest:x-scroll:live` or `npm run ingest:x-scroll -- --live` | Playwright browser-retry allowlist scroll |

## Playwright install (live X)

```bash
npm i -D playwright
npx playwright install chromium
# Linux CI / headless boxes may also need:
npx playwright install-deps chromium
```

**Note:** Some hosts (cloud/datacenter egress) receive HTTP **403** with an empty body from x.com even before a login wall. In that case live scroll cannot succeed from that machine — run Playwright on a residential/local network with `GSP_X_STORAGE_STATE`, or keep dry-run fallback.

If X shows a login / consent wall (“Sign in”, “Log in”, “Something went wrong”), live scrapes may return **zero** posts. The ingest then falls back to dry-run **only when zero posts were scraped across all profiles**. To unlock real timelines, export a logged-in Playwright `storageState` (never commit cookies):

```bash
# One-time interactive login (local machine with a browser):
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://x.com/i/flow/login');
  console.log('Log in in the browser window, then press Enter here…');
  await new Promise((r) => process.stdin.once('data', r));
  await context.storageState({ path: 'data/x-storage-state.json' });
  await browser.close();
  console.log('Wrote data/x-storage-state.json — keep it out of git');
})();
"

export GSP_X_STORAGE_STATE="$(pwd)/data/x-storage-state.json"
npm run ingest:x-scroll:live
```

`*.storage-state.json`, `.auth/`, and `data/x-storage-state.json` are gitignored.

Live browser order is Chromium with stealth-ish flags and a desktop-like context, Firefox when its Playwright binary is installed, then the system Chrome channel when available. Set `GSP_X_HANDLES=BBCWorld,Reuters` with `GSP_X_MAX_PROFILES=2` for a targeted smoke.

Smoke / budget overrides: `GSP_X_HANDLES`, `GSP_X_MAX_PROFILES`, `GSP_X_MAX_POSTS`, `GSP_X_STOP_AFTER_MS`, `GSP_X_MIN_DELAY_MS`, `GSP_X_MAX_DELAY_MS`.

## Budgets (X)

- Allowlist only: `ingest/allowlists/x-security.json` (~25 editorial handles: DoD, Reuters, BBC World, Al Jazeera Eng, CSIS, IISS, UN, regional mil).
- Session caps: max ~12 profiles, ~10 posts each, jittered delays, hard stop ~3 minutes.
- Output: `data/raw/x-scroll-YYYYMMDD.json` → normalize → **merge by `id`** into `events.json`.
- Place geocode: `ingest/lib/geocode.mjs` keyword → lat/lon from title/summary (Moscow, Riyadh, Hormuz, etc.); else region fallback.
- Dry-run (`npm run ingest:x-scroll`): synthesizes structured pointers tagged `source: x-scroll`, `mode: dry-run`. Does not call X MCP or paid APIs.
- Live path (`ingest:all` / `ingest:x-scroll:live`): Playwright browser-retry timeline scroll (Chromium → Firefox → system Chrome channel). Falls back to dry-run if Playwright missing **or** zero posts scraped (login wall).

## Other open rails

| Script | Source | Merge rule |
|--------|--------|------------|
| `ingest:markets` | Yahoo chart API (+ optional FRED) | Replaces series / anomalies / stress |
| `ingest:gdelt` | GDELT GEO | Rewrites events from live GeoJSON or keeps seed |
| `ingest:rss` | BBC World / Guardian / Al Jazeera RSS (Reuters+AP free feeds blocked) | **Merge by id** + keyword geocode |
| `ingest:x-scroll` / `:live` | Allowlist dry or Playwright | **Merge by id** + keyword geocode |
| `report:daily` | `public/data/*` | Writes dated archive + indexes |

## FalloutRisk mapping

| Severity | Fallout |
|----------|---------|
| 1–2 | low |
| 3 | medium |
| 4 | high |
| 5 | critical |

Heuristics bump severity for attack/missile/war language; reliability C/D softens one notch. Postures use `precipitatePotential` on the same labels.

## Daily snapshot layout

```
reports/daily/YYYY-MM-DD/
  events.json  postures.json  anomalies.json  stress.json
  series.json  feeds.json  hotspots.json  supply-routes.json
  snapshot.json  pack.json  meta.json  report.md
reports/daily/index.json

apps/web/public/reports/daily/YYYY-MM-DD/   # Pages mirror
apps/web/public/data/reports-index.json     # UI archive picker
```

`report.md` summarizes top \|z\| anomalies, high/critical fallout events, and high/critical postures.

## Merge rules

1. Never blindly wipe seed on X/RSS paths — upsert by `id`.
2. GDELT live success may replace the events array (seed remains under `data/seed/` until overwritten by a successful markets/series write pattern).
3. Snapshot `generatedAt` is bumped whenever events/series change.
4. Feed chips: Pass / Fail / Warn / Not run + `evaluated_at` + rule + snapshot id.

## Cost doctrine

- MapLibre + OpenFreeMap (no Google Maps / Mapbox required).
- Markets: Yahoo public chart (no key); FRED optional.
- X: allowlist scroll only — never `search_posts_all` / never spend X API credits from this repo’s automation.

## Known gaps / limits

- **Telegram** not wired — no channel ingest yet.
- **X live** needs Playwright (+ browser); default path is dry-run allowlist pointers only. Never uses paid `search_posts_all`.
- **GDELT** uses live GEO when reachable; on failure falls back to seed events (Warn).
- **Geocode** is keyword/title matching (`ingest/lib/geocode.mjs`), not full NER. Title beats feed `region`; Global jitter is re-snapped when a place name is clear. Unmatched Global wires still sit near Atlantic fallback coords.
- **Reuters World / AP** free RSS URLs probed and skipped (401/404/HTML/hijacked Feedburner); BBC + Guardian + Al Jazeera remain the open wires.
