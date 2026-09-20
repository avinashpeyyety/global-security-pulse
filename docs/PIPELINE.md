# Ingest & intel pipeline

Cheap, open-source-first cadence for Global Security Pulse. **No paid X API search** (`search_posts_all` is forbidden by default). **No user-X MCP** from automation.

## Cadence

| When | What | Notes |
|------|------|-------|
| On demand / daily | `npm run ingest:all` | Markets → GDELT → RSS → **X-scroll dry** (or skip) → daily snapshot. Does **not** force Playwright `--live` (403s on Grok box). |
| Before/after `ingest:all` (Chief, box) | computerUse Chrome → handoff JSON → `npm run ingest:x-scroll:browser` | **Preferred live X path on Grok box.** No API. No Air. |
| Every day 8:20 AM / 1:20 PM / 6:20 PM CT | Data inject + commit | Header shows Updated / Next update from `meta.json` |
| Daily evening | Same + commit | Refreshes `apps/web/public/data/*` and archives `reports/daily/YYYY-MM-DD/` |
| Weekends | Same daily inject schedule | UI advances to the next daily slot, including Sat → Sun and Sun → Mon |
| Ad-hoc | `npm run report:daily` | Snapshot only (current public data) |
| Ad-hoc dry X | `npm run ingest:x-scroll` | Synthesize pointers (no browser) |
| Ad-hoc browser X | `npm run ingest:x-scroll:browser` | Merge Chief computerUse handoff JSON |
| Ad-hoc Playwright X | `npm run ingest:x-scroll:live` | Optional; may HTTP 403 on box |

## Box path (Grok) — browser handoff

Headless Playwright against x.com often gets **HTTP 403** from this box’s egress. Real box Chrome via **computerUse** loads public profiles (e.g. BBCWorld, Reuters) with post URLs and text, no login wall.

**Routine:**

1. Scroll allowlisted profiles in computerUse Chrome (`ingest/allowlists/x-security.json`).
2. Write handoff JSON to **`data/raw/x-scroll-browser-latest.json`** (schema below / `docs/x-scroll-browser-example.json`).
3. Run `npm run ingest:x-scroll:browser` — normalizes via `pointerToEvent` / geocode / merge-by-id into `events.json`, sets feeds detail to `browser: N pointers`, stamps meta, archives a dated copy under `data/raw/`.

No X API. No Air required. `ingest:all` does **not** include this step — Chief runs it separately before or after.

### Handoff schema

```json
{
  "mode": "browser",
  "generatedAt": "2026-09-20T21:00:00.000Z",
  "pointers": [
    {
      "author": "BBCWorld",
      "title": "Short headline or post text",
      "url": "https://x.com/BBCWorld/status/1234567890123456789",
      "observedAt": "2026-09-20T20:55:00.000Z",
      "postId": "1234567890123456789"
    }
  ]
}
```

Required per pointer: `author`, `title` **or** `text`, `url`. Optional: `observedAt`, `postId` (derived from `/status/` in url when omitted). Reliability / region come from the allowlist when the handle matches.

## Playwright install (optional live X)

```bash
npm i -D playwright
npx playwright install chromium
# Linux CI / headless boxes may also need:
npx playwright install-deps chromium
```

**Note:** On Grok box / many datacenter hosts, x.com returns HTTP **403** with an empty body to headless Playwright even before a login wall. Prefer **browser handoff** above. Playwright `--live` remains available for residential/local networks with optional `GSP_X_STORAGE_STATE`.

If X shows a login / consent wall (“Sign in”, “Log in”, “Something went wrong”), live scrapes may return **zero** posts. The ingest then falls back to dry-run **only when zero posts were scraped across all profiles**. To unlock real timelines off-box, export a logged-in Playwright `storageState` (never commit cookies):

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

`*.storage-state.json`, `.auth/`, cookie dumps, and `data/x-storage-state.json` are gitignored.

Live browser order (when `--live` is used): Chromium with stealth-ish flags, Firefox when installed, then system Chrome channel. Set `GSP_X_HANDLES=BBCWorld,Reuters` with `GSP_X_MAX_PROFILES=2` for a targeted smoke.

Smoke / budget overrides: `GSP_X_HANDLES`, `GSP_X_MAX_PROFILES`, `GSP_X_MAX_POSTS`, `GSP_X_STOP_AFTER_MS`, `GSP_X_MIN_DELAY_MS`, `GSP_X_MAX_DELAY_MS`.

## Budgets (X)

- Allowlist only: `ingest/allowlists/x-security.json` (~25 editorial handles: DoD, Reuters, BBC World, Al Jazeera Eng, CSIS, IISS, UN, regional mil).
- Session caps (Playwright): max ~12 profiles, ~10 posts each, jittered delays, hard stop ~3 minutes.
- Output: `data/raw/x-scroll-YYYYMMDD.json` or `data/raw/x-scroll-browser-YYYYMMDD.json` → normalize → **merge by `id`** into `events.json`.
- Place geocode: `ingest/lib/geocode.mjs` keyword → lat/lon from title/summary (Moscow, Riyadh, Hormuz, etc.); else region fallback.
- Dry-run (`npm run ingest:x-scroll`): synthesizes structured pointers tagged `source: x-scroll`, `mode: dry-run`. Does not call X MCP or paid APIs. Used by `ingest:all`.
- Browser handoff (`ingest:x-scroll:browser`): preferred live path on Grok box — see above.
- Playwright live (`ingest:x-scroll:live`): optional; may 403 on box; falls back to dry-run if Playwright missing **or** zero posts scraped.

## Other open rails

| Script | Source | Merge rule |
|--------|--------|------------|
| `ingest:markets` | Yahoo chart API (+ optional FRED) | Replaces series / anomalies / stress |
| `ingest:gdelt` | GDELT GEO | Rewrites events from live GeoJSON or keeps seed |
| `ingest:rss` | BBC World / Guardian / Al Jazeera RSS (Reuters+AP free feeds blocked) | **Merge by id** + keyword geocode |
| `ingest:x-scroll` | Allowlist dry (default in `ingest:all`) | **Merge by id** + keyword geocode |
| `ingest:x-scroll:browser` | computerUse handoff JSON | **Merge by id** + keyword geocode |
| `ingest:x-scroll:live` | Playwright (optional) | **Merge by id** + keyword geocode |
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
- X: allowlist scroll / browser handoff only — never `search_posts_all` / never spend X API credits / never user-X MCP from this repo’s automation.

## Known gaps / limits

- **Telegram** not wired — no channel ingest yet.
- **X live on Grok box** = computerUse Chrome → handoff JSON → `ingest:x-scroll:browser`. Playwright `--live` often 403s here. Never uses paid `search_posts_all`.
- **GDELT** uses live GEO when reachable; on failure falls back to seed events (Warn).
- **Geocode** is keyword/title matching (`ingest/lib/geocode.mjs`), not full NER. Title beats feed `region`; Global jitter is re-snapped when a place name is clear. Unmatched Global wires still sit near Atlantic fallback coords.
- **Reuters World / AP** free RSS URLs probed and skipped (401/404/HTML/hijacked Feedburner); BBC + Guardian + Al Jazeera remain the open wires.
