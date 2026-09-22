# Global Security Pulse — Daily Report 2026-09-22

Generated: 2026-09-22T23:37:11.034Z
Ingest package: daily-2026-09-22

## Stress composite

- **Score:** 26.5 (equities 21, USD 38, VIX 20, oil 33)
- Evaluated at: 2026-09-22T23:35:45.746Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Nasdaq 100 | 2.32 | 0.82 | 6.2 | 0 |
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| VIX | -1.4 | -4.44 | -17.38 | 0 |
| S&P 500 | 1.34 | 0 | 2.36 | 1 |
| Brent Crude | 0.94 | -1.81 | -9.41 | 0 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| EUR/USD | -0.74 | -0.12 | -0.75 | 2 |
| USD/JPY | -0.66 | 0.06 | 1.41 | 7 |

## High / critical fallout events

- **[high]** U.S. Central Command @CENTCOM Sep 21 USS Rafael Peralta (DDG 115) sails in regional waters as the guided-missile destroy — Middle East (x-scroll-curated; [link](https://x.com/CENTCOM/status/2102058017625723237))
- **[high]** U.S. Central Command @CENTCOM Sep 20 Exercise Eager Lion enters its second week at Fort Carson in Colorado, where U.S. a — Global (x-scroll-curated; [link](https://x.com/CENTCOM/status/2101811536947732659))
- **[high]** U.S. Central Command @CENTCOM Sep 20 A look into the daily operations of U.S. Navy Sailors aboard USS John Finn (DDG 113 — Global (x-scroll-curated; [link](https://x.com/CENTCOM/status/2101752852917968954))
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
- X allowlist scroll: **Pass** @ 2026-09-22T23:37:06.728Z — live: 5 pointers merged (no X API search); 13 login-wall profile(s)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-22T23:35:45.651Z — merged 30 (added 17); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
