# Ingest & intel pipeline

Cheap, open-source-first cadence for Global Security Pulse. **No paid X API search** (`search_posts_all` is forbidden by default).

## Cadence

| When | What | Notes |
|------|------|-------|
| On demand / CI | `npm run ingest:all` | Markets → GDELT → RSS → X-scroll dry → daily snapshot |
| Weekday evening | Same + commit | Refreshes `apps/web/public/data/*` and archives `reports/daily/YYYY-MM-DD/` |
| Ad-hoc | `npm run report:daily` | Snapshot only (current public data) |
| Ad-hoc live X | `npm run ingest:x-scroll -- --live` | Only if Playwright + browser available; still allowlist-only |

## Budgets (X)

- Allowlist only: `ingest/allowlists/x-security.json` (~25 editorial handles: DoD, Reuters, BBC World, Al Jazeera Eng, CSIS, IISS, UN, regional mil).
- Session caps: max ~12 profiles, ~10 posts each, jittered delays, hard stop ~3 minutes.
- Output: `data/raw/x-scroll-YYYYMMDD.json` → normalize → **merge by `id`** into `events.json`.
- Dry-run (default / CI): synthesizes structured pointers tagged `source: x-scroll`, `mode: dry-run`. Does not call X MCP or paid APIs.
- Live path: optional Playwright Chromium timeline scroll. Falls back to dry-run if Playwright missing.

## Other open rails

| Script | Source | Merge rule |
|--------|--------|------------|
| `ingest:markets` | Yahoo chart API (+ optional FRED) | Replaces series / anomalies / stress |
| `ingest:gdelt` | GDELT GEO | Rewrites events from live GeoJSON or keeps seed |
| `ingest:rss` | BBC / Reuters / Al Jazeera RSS | **Merge by id** |
| `ingest:x-scroll` | Allowlist dry or Playwright | **Merge by id** |
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
