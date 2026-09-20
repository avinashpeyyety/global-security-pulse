# X allowlist scroll agent

Budgeted scroll of **named** reliable accounts only. Primary ingest entrypoint:

```bash
npm run ingest:x-scroll          # dry-run (default) → merge into events.json
npm run ingest:x-scroll -- --live  # Playwright if installed; else dry-run
```

Canonical allowlist: `ingest/allowlists/x-security.json`  
Legacy agent YAML: `agents/x-scroll/allowlist.yaml` (used by `npm run agent:x-scroll` → JSONL only)

## Cost rules

- **Do not** call expensive X `search_posts_all` by default.
- **Do not** use user-X MCP tools from automation that would spend credits.
- Optional later: enrich known post IDs via `get_posts_by_ids` if an X connector env is present.
- Live scroll uses Playwright against allowlisted profile timelines — not firehose search.

## Dry-run (default / CI)

Writes `data/raw/x-scroll-YYYYMMDD.json` and **merges** normalized events (`source: x-scroll`) into `apps/web/public/data/events.json` by `id`.

## Live scroll

1. `npm i -D playwright` (or in agent workspace) && `npx playwright install chromium`
2. Authenticate a dedicated browser profile if X requires login (never commit cookies).
3. `npm run ingest:x-scroll -- --live` — max N profiles / M tweets, rate-limited.
4. Same merge path as dry-run; pointers include post URLs when scraped.

See `docs/PIPELINE.md` for budgets and falloutRisk mapping.
