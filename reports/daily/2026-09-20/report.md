# Global Security Pulse — Daily Report 2026-09-20

Generated: 2026-09-20T21:00:19.794Z
Ingest package: daily-2026-09-20

## Stress composite

- **Score:** 34.2 (equities 41, USD 31, VIX 20, oil 44)
- Evaluated at: 2026-09-20T21:00:09.331Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| WTI Crude | 1.34 | -5.72 | -3.97 | 0 |
| Brent Crude | 1.1 | -5.28 | -5.09 | 0 |
| VIX | -1.03 | -4.08 | -6.5 | 0 |
| USD/JPY | -0.92 | 0.46 | 2.24 | 5 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| DAX | -0.71 | -1.6 | -1.03 | 1 |
| Nasdaq 100 | 0.7 | 0.67 | 0.94 | 0 |

## High / critical fallout events

- **[high]** Artillery exchanges near Kupiansk — Eastern Europe (GDELT/Reuters; [link](https://example.com/kupiansk))
- **[critical]** Houthi attack claim on commercial vessel — Red Sea / Bab el-Mandeb (UKMTO advisory)
- **[high]** Ransomware hits regional energy utility — Eastern Europe (GDELT/cyber wire)
- **[high]** IED blast near convoy route in Sahel — Sahel (GDELT/AFP)
- **[high]** Missile test reported on peninsula — East Asia (GDELT/Yonhap)
- **[high]** Largest attack on Moscow sees Ukraine fire hundreds of drones, mayor says — Global (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/c34gdjk1ne8yo?at_medium=RSS&at_campaign=rss))
- **[high]** Houthis say they targeted Saudi capital with ballistic missiles — Global (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cwly5d9v7r43o?at_medium=RSS&at_campaign=rss))
- **[high]** Qatar PM describes fallout of US-Israel war on Iran as ‘earthquake’ — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/news/2026/9/20/qatari-pm-warns-against-cycles-of-escalation-in-the-middle-east?traffic_source=rss))

## High / critical postures

- **[high]** Air-defense readiness raised along forward corridor — Eastern Europe (Regional air force)
- **[high]** Counter-deployment of coastal anti-ship batteries (reported) — Persian Gulf (Regional coastal forces)
- **[critical]** Armor / mechanized buildup opposite contested line — Eastern Europe (Regional ground forces)

## Supply routes (metadata)

_No supply-route metadata._

## Feed status

- GDELT GEO: **Pass** @ 2026-09-20T15:30:00.000Z — Seed + optional live refresh
- Markets (Stooq/Yahoo): **Pass** @ 2026-09-20T15:36:00.000Z — Seed series loaded
- X allowlist scroll: **Pass** @ 2026-09-20T21:00:19.363Z — dry-run: 12 pointers merged (no X API search)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-20T21:00:18.943Z — merged 30 (added 30); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Weekday / evening routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
