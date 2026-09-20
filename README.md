# Global Security Pulse

Dense dark ops dashboard for global **security events** (map + hotspots) and **economic stress** (sparklines, z-score anomalies, composite dial).

Private repo · v0.1

## Maps: MapLibre (not Google Maps)

There is **no Google Maps MCP** in this account’s Cursor catalog. The web app uses:

- **MapLibre GL JS**
- Free OpenFreeMap tiles: `https://tiles.openfreemap.org/styles/dark`

No paid Mapbox / Google key is required for v0.1. Optional later: MapTiler / Amazon Location via env.

> **GeoLibre Desktop** on the Mac is available for offline GIS; the *web* dashboard is MapLibre only.

## Quick start

```bash
npm install
npm run build          # must succeed
npm run dev            # http://localhost:5173 — works offline on seed JSON
```

Basemap tiles still need network; event/econ panels render from `apps/web/public/data/`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dashboard |
| `npm run build` | shared types + web production build |
| `npm run ingest:gdelt` | Refresh GDELT-shaped events (seed fallback) |
| `npm run ingest:markets` | Stooq/Yahoo series refresh (seed fallback) |
| `npm run agent:x-scroll` | Allowlist dry-run → `data/ingest/x-pointers.jsonl` |

## X cost strategy

- **Do not** call expensive `search_posts_all` by default.
- Planned path: Playwright scroll of handles in `agents/x-scroll/allowlist.yaml` only.
- v0.1 ships a **dry-run** that writes sample JSONL from the allowlist (no X API).
- Optional enrichment via `get_posts_by_ids` only if an X connector env is present later.

See `agents/x-scroll/README.md` for live scroll notes.

## FRED (optional)

```bash
export FRED_API_KEY=…
npm run ingest:markets
```

Without a key, seed / Stooq / Yahoo cover markets; Fed Funds uses a seed proxy (feed chip **Warn**).

## Status chips

Pass / Fail / Warn / Not run — same language everywhere.

## Stack

Vite · React · TypeScript · MapLibre GL JS · npm workspaces

## License

Private / all rights reserved.
