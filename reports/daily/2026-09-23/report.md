# Global Security Pulse — Daily Report 2026-09-23

Generated: 2026-09-23T18:47:12.096Z
Ingest package: daily-2026-09-23

## Stress composite

- **Score:** 31.3 (equities 27, USD 47, VIX 20, oil 37)
- Evaluated at: 2026-09-23T18:46:41.906Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| Nasdaq 100 | 1.9 | -0.1 | 5.23 | 1 |
| EUR/USD | -1.39 | -0.68 | -1.31 | 2 |
| US Dollar Index | 1.16 | 0.68 | 1.47 | 2 |
| Brent Crude | 0.92 | -0.63 | -6.81 | 0 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| S&P 500 | 0.87 | -0.73 | 1.61 | 1 |
| VIX | -0.85 | 0.74 | -12.91 | 2 |

## High / critical fallout events

- **[high]** U.S. Central Command @CENTCOM Sep 21 USS Rafael Peralta (DDG 115) sails in regional waters as the guided-missile destroy — Middle East (x-scroll-curated; [link](https://x.com/CENTCOM/status/2102058017625723237))
- **[high]** Artillery exchanges near Kupiansk — Eastern Europe (GDELT/Reuters; [link](https://example.com/kupiansk))
- **[critical]** Houthi attack claim on commercial vessel — Red Sea / Bab el-Mandeb (UKMTO advisory)
- **[high]** Missile test reported on peninsula — East Asia (GDELT/Yonhap)
- **[high]** Ransomware hits regional energy utility — Eastern Europe (GDELT/cyber wire)
- **[high]** IED blast near convoy route in Sahel — Sahel (GDELT/AFP)

## High / critical postures

- **[high]** Air-defense readiness raised along forward corridor — Eastern Europe (Regional air force)
- **[high]** Counter-deployment of coastal anti-ship batteries (reported) — Persian Gulf (Regional coastal forces)
- **[critical]** Armor / mechanized buildup opposite contested line — Eastern Europe (Regional ground forces)

## Supply routes (metadata)

_No supply-route metadata._

## Feed status

- GDELT GEO: **Pass** @ 2026-09-20T15:30:00.000Z — Seed + optional live refresh
- Markets (Stooq/Yahoo): **Pass** @ 2026-09-20T15:36:00.000Z — Seed series loaded
- X allowlist scroll: **Pass** @ 2026-09-23T18:47:07.945Z — live: 5 pointers merged (no X API search); 1 login-wall profile(s)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-23T18:46:42.111Z — merged 30 (added 14); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
