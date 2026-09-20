# X allowlist scroll agent

Budgeted scroll of **named** reliable accounts only. Primary ingest entrypoint:

```bash
npm run ingest:x-scroll            # dry-run → merge into events.json
npm run ingest:x-scroll:live       # Playwright live (same as -- --live)
npm run ingest:x-scroll -- --live  # equivalent
```

`npm run ingest:all` runs **live** X-scroll (`node ingest/x-scroll.mjs --live`) so the daily routine gets real scrolls when Chromium works.

Canonical allowlist: `ingest/allowlists/x-security.json`  
Legacy agent YAML: `agents/x-scroll/allowlist.yaml` (used by `npm run agent:x-scroll` → JSONL only)

## Cost rules

- **Do not** call expensive X `search_posts_all` by default.
- **Do not** use user-X MCP tools from automation that would spend credits.
- Optional later: enrich known post IDs via `get_posts_by_ids` if an X connector env is present.
- Live scroll uses Playwright against allowlisted profile timelines — not firehose search.

## Install Playwright

```bash
npm i -D playwright          # at repo root (devDependency)
npx playwright install chromium
npx playwright install-deps chromium   # Linux headless boxes
```

## Dry-run (CI / no browser)

Writes `data/raw/x-scroll-YYYYMMDD.json` and **merges** normalized events (`source: x-scroll`) into `apps/web/public/data/events.json` by `id`.

## Live scroll

1. Install Playwright + Chromium (above).
2. Optional logged-in session via `GSP_X_STORAGE_STATE` (see login wall below).
3. `npm run ingest:x-scroll:live` — max N profiles / M tweets, rate-limited.
4. Same merge path as dry-run; pointers include post URLs when scraped.
5. Place geocode from title via `ingest/lib/geocode.mjs` (Moscow, Riyadh, etc.).

Budget overrides for smoke tests: `GSP_X_MAX_PROFILES=3 GSP_X_MAX_POSTS=5 GSP_X_STOP_AFTER_MS=60000`.

## Login / consent wall

**Note:** Some hosts (cloud/datacenter egress) receive HTTP **403** with an empty body from x.com even before a login wall. In that case live scroll cannot succeed from that machine — run Playwright on a residential/local network with `GSP_X_STORAGE_STATE`, or keep dry-run fallback.

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

Never commit `data/x-storage-state.json`, `*.storage-state.json`, or cookie dumps — they are gitignored.

See `docs/PIPELINE.md` for budgets and falloutRisk mapping.
