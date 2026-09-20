# Global Security Pulse — Daily Report 2026-09-20

Generated: 2026-09-20T23:32:08.247Z
Ingest package: daily-2026-09-20

## Stress composite

- **Score:** 34.3 (equities 41, USD 32, VIX 20, oil 43)
- Evaluated at: 2026-09-20T23:30:41.175Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| WTI Crude | 1.27 | -4.24 | -5.27 | 0 |
| Brent Crude | 1.06 | -4.28 | -5.92 | 0 |
| VIX | -1.03 | -4.08 | -6.5 | 0 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| USD/JPY | -0.87 | 0.55 | 2.33 | 5 |
| DAX | -0.71 | -1.6 | -1.03 | 1 |
| Nasdaq 100 | 0.7 | 0.67 | 0.94 | 0 |

## High / critical fallout events

- **[high]** U.S. Central Command @CENTCOM 20m Exercise Eager Lion enters its second week at Fort Carson in Colorado, where U.S. and  — Global (x-scroll-curated; [link](https://x.com/CENTCOM/status/2101811536947732659))
- **[high]** U.S. Central Command @CENTCOM 4h A look into the daily operations of U.S. Navy Sailors aboard USS John Finn (DDG 113) as — Global (x-scroll-curated; [link](https://x.com/CENTCOM/status/2101752852917968954))
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
- X allowlist scroll: **Pass** @ 2026-09-20T23:32:01.204Z — live: 5 pointers merged (no X API search); 13 login-wall profile(s)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-20T23:30:40.812Z — merged 30 (added 2); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
