# Architecture — Global Security Pulse v0.1

## Goal
Exception-first ops glass for (1) geocoded security events and (2) open-market economic stress — without burning paid map or X search credits.

## Layout
```
apps/web/            Vite + React + TS dashboard (MapLibre)
packages/shared/     SecurityEvent, EconSeries, Anomaly, FeedStatus, …
agents/x-scroll/     Allowlist scroll agent (dry-run → JSONL)
ingest/              GDELT + markets fetchers (seed fallback)
data/seed/           First-paint JSON
data/ingest/         Runtime append-only pointers (gitignored *.jsonl)
docs/ARCHITECTURE.md This file
```

## Maps
**MapLibre GL JS** + **OpenFreeMap** dark vector tiles (`https://tiles.openfreemap.org/styles/dark`).
No Google Maps MCP / no required Mapbox token for v0.1.
GeoLibre Desktop on the Mac is for offline GIS analysis; the *web* dashboard stays MapLibre.

## Security rail
1. **GDELT-shaped** events (seed always; `npm run ingest:gdelt` refreshes when network allows).
2. **X allowlist scroll** (`agents/x-scroll`) — budgeted Playwright scroll of named handles only.
   Writes `data/ingest/x-pointers.jsonl`. Does **not** call `search_posts_all`.
3. Optional later: RSS, USGS, Nominatim geocode cache.

## Econ rail
Stooq/Yahoo CSV (no key) + optional FRED (`FRED_API_KEY`).
Anomaly engine: 60-day rolling z-score, 1d/5d/20d % change, adverse streak.
Stress composite: weighted equities / USD / VIX / oil dial (0–100).

## Status language
Every feed chip: **Pass | Fail | Warn | Not run** + `evaluated_at` + rule + snapshot id.

## Determinism on glass
UI copy prefers “evaluated at T against rule R on snapshot S” over narrative AI badges.

## Offline vs live
| Path | Offline | Needs network/keys |
|------|---------|-------------------|
| `npm run dev` + seed JSON | Yes | Tiles need network for basemap |
| `ingest:gdelt` / `ingest:markets` | Falls back to seed | Live refresh needs HTTP |
| `agent:x-scroll --dry-run` | Yes | Live Playwright needs browser + X session |
| FRED series | Seed proxy | `FRED_API_KEY` |
