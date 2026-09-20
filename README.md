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

## Update status (header)

The top bar always shows:

- **Updated … CT …** — latest data inject (`meta.json` / `snapshot.updatedAt`, America/Chicago)
- **Next update ~… CT** — next daily slot **8:20 AM / 1:20 PM / 6:20 PM** CT

`npm run report:daily` (and each ingest) stamps `apps/web/public/data/meta.json`.

## Dynamic updates (GitHub Pages)

The dashboard is hosted on **GitHub Pages** from the Actions workflow (`.github/workflows/pages.yml`).

Routine data inject (every day):

1. `npm run ingest:all` — markets + GDELT + RSS + X-scroll dry + **daily snapshot**
2. Commit refreshed `apps/web/public/data/*`, `apps/web/public/reports/daily/*`, and `reports/daily/*`
3. Push to `main` → Pages rebuilds

Vite `base` is `/global-security-pulse/` so assets resolve on the project site.

### Daily report snapshots

`npm run report:daily` archives the current dashboard JSON into versioned history:

| Location | Purpose |
|----------|---------|
| `reports/daily/YYYY-MM-DD/` | Git-versioned archive (`report.md`, `pack.json`, data files, `meta.json`) |
| `apps/web/public/reports/daily/YYYY-MM-DD/` | Same tree served by Pages |
| `reports/daily/index.json` | Date list (repo) |
| `apps/web/public/data/reports-index.json` | Date list for the UI archive picker |

`report.md` summarizes top \|z\| anomalies, high/critical fallout events, and high/critical postures.

Optional: `node ingest/daily-snapshot.mjs --with-ingest` runs `ingest:all` first.  
Optional: `--date YYYY-MM-DD` overrides the folder date.

Pages serves anything under `apps/web/public/` after build (including `reports/daily/…`).

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
| `npm run ingest:markets` | Stooq/Yahoo series refresh (seed fallback) |
| `npm run ingest:gdelt` | Refresh GDELT-shaped events (seed fallback) |
| `npm run ingest:rss` | BBC / Reuters / Al Jazeera RSS → merge by id |
| `npm run ingest:x-scroll` | Allowlist dry-run (default) → merge events; `-- --live` if Playwright present |
| `npm run ingest:all` | markets → gdelt → rss → x-scroll → daily snapshot |
| `npm run report:daily` | Archive dated snapshot + update indexes |
| `npm run agent:x-scroll` | Legacy agent dry-run → `data/ingest/x-pointers.jsonl` |

## X cost strategy

- **Do not** call expensive `search_posts_all` / do not spend X API credits from automation.
- Allowlist: `ingest/allowlists/x-security.json` (editorial list of defense / wire / think / UN / maritime handles).
- Default path is **dry-run**; live Playwright scroll is optional and budgeted.
- See `docs/PIPELINE.md` for cadence, budgets, merge rules, and falloutRisk mapping.
- Agent notes: `agents/x-scroll/README.md`.

## Stack

Vite · React · TypeScript · MapLibre GL JS · npm workspaces · GitHub Pages

## License

All rights reserved.
