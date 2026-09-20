# Global Security Pulse — Daily Report 2026-09-20

Generated: 2026-09-20T22:08:26.111Z
Ingest package: daily-2026-09-20

## Stress composite

- **Score:** 86 (equities 100, USD 30, VIX 100, oil 100)
- Evaluated at: 2026-09-20T16:00:00.000Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| VIX | 6.46 | 37.07 | 39.41 | 1 |
| WTI Crude | 6.14 | 7.87 | 8.98 | 5 |
| S&P 500 | -3.72 | -3.17 | -3.01 | 2 |
| Nikkei 225 | 3.17 | 0.02 | 0.27 | 0 |
| DAX | 2.32 | -0.09 | 0.34 | 2 |
| USD/JPY | 2.12 | 0.11 | 0.14 | 1 |
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| US Dollar Index | -1.73 | 0.08 | 0.14 | 1 |

## High / critical fallout events

- **[critical]** UBS CEO Ermotti warns against harsh capital rules ahead of vote — Global (x-scroll-curated; [link](https://x.com/Reuters/status/2101759578471809390))
- **[high]** Qatar PM describes fallout of US-Israel war on Iran as ‘earthquake’ — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/news/2026/9/20/qatari-pm-warns-against-cycles-of-escalation-in-the-middle-east?traffic_source=rss))
- **[high]** A look into the daily operations of U.S. Navy Sailors aboard USS John Finn — Global (x-scroll-curated; [link](https://x.com/CENTCOM/status/2101752852917968954))
- **[high]** Artillery exchanges near Kupiansk — Eastern Europe (GDELT/Reuters; [link](https://example.com/kupiansk))
- **[critical]** Houthi attack claim on commercial vessel — Red Sea / Bab el-Mandeb (UKMTO advisory)
- **[high]** Largest attack on Moscow sees Ukraine fire hundreds of drones, mayor says — Europe (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/c34gdjk1ne8yo?at_medium=RSS&at_campaign=rss))
- **[high]** Missile test reported on peninsula — East Asia (GDELT/Yonhap)
- **[high]** Houthis say they targeted Saudi capital with ballistic missiles — Middle East (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cwly5d9v7r43o?at_medium=RSS&at_campaign=rss))
- **[high]** Ransomware hits regional energy utility — Eastern Europe (GDELT/cyber wire)
- **[high]** IED blast near convoy route in Sahel — Africa (GDELT/AFP)
- **[critical]** UKMTO Warning 139/26 PDF — Global (x-scroll-curated; [link](https://x.com/UK_MTO/status/2100855389034000842))

## High / critical postures

- **[high]** Air-defense readiness raised along forward corridor — Eastern Europe (Regional air force)
- **[high]** Counter-deployment of coastal anti-ship batteries (reported) — Persian Gulf (Regional coastal forces)
- **[critical]** Armor / mechanized buildup opposite contested line — Eastern Europe (Regional ground forces)

## Supply routes (metadata)

_No supply-route metadata._

## Feed status

- GDELT GEO: **Pass** @ 2026-09-20T15:30:00.000Z — Seed + optional live refresh
- Markets (Stooq/Yahoo): **Pass** @ 2026-09-20T15:36:00.000Z — Seed series loaded
- X allowlist scroll: **Pass** @ 2026-09-20T22:08:25.324Z — browser: 49 pointers
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- Wire RSS: **Not run** @ n/a — RSS ingest stubbed for v0.1
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
