# X allowlist scroll agent

Budgeted scroll of **named** reliable accounts only. **No paid X API. No user-X MCP.**

## Preferred path on Grok box — browser handoff

Headless Playwright gets **HTTP 403** on x.com from this box. Real box Chrome (computerUse) loads public profiles (BBCWorld, Reuters tested) with post URLs and text, no login wall.

```
computerUse Chrome scroll (allowlist)
  → write data/raw/x-scroll-browser-latest.json
  → npm run ingest:x-scroll:browser
```

No API. No Air required. Run this **separately** before or after `npm run ingest:all` (which no longer forces Playwright `--live`).

Schema example: `docs/x-scroll-browser-example.json`.

```bash
npm run ingest:x-scroll:browser
# or: node ingest/x-scroll-browser-handoff.mjs [path/to/handoff.json]
```

Merges via shared `pointerToEvent` / geocode / merge-by-id into `events.json`; feed detail becomes `browser: N pointers`; stamps meta; archives `data/raw/x-scroll-browser-YYYYMMDD.json`.

## Other entrypoints

```bash
npm run ingest:x-scroll            # dry-run → merge into events.json (used by ingest:all)
npm run ingest:x-scroll:live       # optional Playwright --live (may 403 on box)
npm run ingest:x-scroll -- --live  # equivalent
```

`npm run ingest:all` order: markets → gdelt → rss → **x-scroll dry** → daily snapshot. Live X on box is the browser handoff step above, run by Chief routine separately.

Canonical allowlist: `ingest/allowlists/x-security.json`  
Legacy agent YAML: `agents/x-scroll/allowlist.yaml` (used by `npm run agent:x-scroll` → JSONL only)

## Cost rules

- **Do not** call expensive X `search_posts_all` by default.
- **Do not** use user-X MCP tools from automation that would spend credits.
- Optional later: enrich known post IDs via `get_posts_by_ids` if an X connector env is present (not the default box path).
- Live scroll (off-box) may use Playwright against allowlisted profile timelines — not firehose search.

## Install Playwright (optional)

```bash
npm i -D playwright          # at repo root (devDependency)
npx playwright install chromium
npx playwright install-deps chromium   # Linux headless boxes
```

## Dry-run (CI / ingest:all)

Writes `data/raw/x-scroll-YYYYMMDD.json` and **merges** normalized events (`source: x-scroll`) into `apps/web/public/data/events.json` by `id`.

## Playwright live (optional; may 403 on box)

1. Install Playwright + Chromium (above).
2. Optional logged-in session via `GSP_X_STORAGE_STATE` (see login wall below).
3. `npm run ingest:x-scroll:live` — max N profiles / M tweets, rate-limited.
4. Same merge path as dry-run; pointers include post URLs when scraped.
5. Place geocode from title via `ingest/lib/geocode.mjs` (Moscow, Riyadh, etc.).

Budget overrides for smoke tests: `GSP_X_MAX_PROFILES=3 GSP_X_MAX_POSTS=5 GSP_X_STOP_AFTER_MS=60000`.

## Login / consent wall (Playwright)

**Note:** Grok box / cloud egress often receives HTTP **403** with an empty body from x.com. Prefer **browser handoff**. Off-box, use residential/local network + `GSP_X_STORAGE_STATE`, or keep dry-run fallback.

Anonymous Chromium often hits X walls (“Sign in”, “Log in”, “Something went wrong”). The live path:

- Detects wall text and logs `LOGIN/CONSENT WALL` per profile.
- Falls back to dry-run **only if zero posts were scraped across all profiles**.
- If some profiles yield posts, those live pointers are kept (no dry-run mix).

### Creating `storageState` (do NOT commit)

```bash
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
})();
"

export GSP_X_STORAGE_STATE="$(pwd)/data/x-storage-state.json"
npm run ingest:x-scroll:live
```

Never commit `data/x-storage-state.json`, `*.storage-state.json`, cookie dumps, or storage state — they are gitignored.

See `docs/PIPELINE.md` for budgets and falloutRisk mapping.
