# Global Security Pulse

Dense dark ops dashboard for global **security events** (map + hotspots) and **economic stress** (sparklines, z-score anomalies, composite dial).

**Live:** https://avinashpeyyety.github.io/global-security-pulse/

## Map legend

| Layer | Depiction | Color meaning |
|-------|-----------|---------------|
| Security events | **Circles** | `falloutRisk` / severity → Low (cool muted) → Medium (amber) → High (orange) → Critical (bright red/magenta) |
| Military posture | **Triangles** | `precipitatePotential` on the same risk scale |
| Supply routes | **Dotted lines** | Distinct color by kind (oil chokepoint, oil route, trade chokepoint, alt route) |

Layer toggles include a visible legend (swatch/shape) and a Low → Critical risk-scale strip.

## Dynamic updates (GitHub Pages)

The dashboard is hosted on **GitHub Pages** from the Actions workflow (`.github/workflows/pages.yml`).

Routine data inject:

1. Run ingest / seed scripts so `apps/web/public/data/*.json` is refreshed
2. Commit the JSON
3. Push to `main`

The Pages workflow rebuilds and republishes. Vite `base` is `/global-security-pulse/` so assets resolve on the project site.

## Maps: MapLibre (not Google Maps)

- **MapLibre GL JS**
- Free OpenFreeMap tiles: `https://tiles.openfreemap.org/styles/dark`

No paid Mapbox / Google key is required for v0.1.

## Quick start

```bash
npm install
npm run gen:seed       # writes apps/web/public/data/* from data/seed/
npm run build          # must succeed
npm run dev            # http://localhost:5173/global-security-pulse/
```

Basemap tiles still need network; event/econ panels render from `apps/web/public/data/`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dashboard |
| `npm run build` | shared types + web production build |
| `npm run gen:seed` | Rebuild seed series / anomalies / snapshot |
| `npm run ingest:gdelt` | Refresh GDELT-shaped events (seed fallback) |
| `npm run ingest:markets` | Stooq/Yahoo series refresh (seed fallback) |
| `npm run agent:x-scroll` | Allowlist dry-run → `data/ingest/x-pointers.jsonl` |

## X cost strategy

- **Do not** call expensive `search_posts_all` by default.
- Planned path: Playwright scroll of handles in `agents/x-scroll/allowlist.yaml` only.
- v0.1 ships a **dry-run** that writes sample JSONL from the allowlist (no X API).

See `agents/x-scroll/README.md` for live scroll notes.

## Stack

Vite · React · TypeScript · MapLibre GL JS · npm workspaces · GitHub Pages

## License

All rights reserved.
