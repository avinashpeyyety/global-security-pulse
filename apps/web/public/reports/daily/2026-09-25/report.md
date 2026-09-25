# Global Security Pulse — Daily Report 2026-09-25

Generated: 2026-09-25T13:34:28.425Z
Ingest package: daily-2026-09-25

## Stress composite

- **Score:** 32.8 (equities 33, USD 45, VIX 20, oil 36)
- Evaluated at: 2026-09-25T13:33:54.945Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| Nasdaq 100 | 1.86 | 0.2 | 3.03 | 0 |
| EUR/USD | -1.23 | 0.19 | -0.63 | 0 |
| US Dollar Index | 1.02 | -0.33 | 0.74 | 0 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| S&P 500 | 0.89 | 0.23 | 0.93 | 0 |
| Brent Crude | 0.83 | -7.45 | -5.02 | 0 |
| WTI Crude | 0.82 | -1.72 | -7.3 | 0 |

## High / critical fallout events

- **[high]** U.S. Central Command @CENTCOM Sep 21 USS Rafael Peralta (DDG 115) sails in regional waters as the guided-missile destroy — Middle East (x-scroll-curated; [link](https://x.com/CENTCOM/status/2102058017625723237))
- **[high]** Pope warns against 'losing humanity' to AI machines — Europe (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cmq8j904212po?at_medium=RSS&at_campaign=rss))
- **[high]** Pakistan, Turkiye edge closer towards joining Saudi war against Houthis — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/news/2026/9/25/pakistan-turkiye-edge-closer-towards-joining-saudi-war-against-houthis?traffic_source=rss))
- **[high]** Trump and Xi exchange warm words at state dinner but little progress on key issues — Global (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cxq63dqp93n1o?at_medium=RSS&at_campaign=rss))
- **[high]** Hurricane Polo barrels towards Baja California region of Mexico — Global (rss:Guardian World; [link](https://www.theguardian.com/world/2026/sep/25/weather-tracker-hurricane-polo-baja-california-mexico))
- **[high]** Rebel offensive against Ethiopian army stokes fears of return to civil war — Global (rss:Guardian World; [link](https://www.theguardian.com/world/2026/sep/24/fears-return-to-war-tigray-rebels-launch-offensive-against-ethiopian-army))
- **[high]** Healthcare in Africa ‘under growing strain’ after US withdrawal from aid programs, report warns — Global (rss:Guardian World; [link](https://www.theguardian.com/us-news/2026/sep/21/africa-healthcare-aid-program-withdrawl))
- **[high]** Artillery exchanges near Kupiansk — Eastern Europe (GDELT/Reuters; [link](https://example.com/kupiansk))
- **[critical]** Houthi attack claim on commercial vessel — Red Sea / Bab el-Mandeb (UKMTO advisory)
- **[high]** Missile test reported on peninsula — East Asia (GDELT/Yonhap)
- **[high]** Ransomware hits regional energy utility — Eastern Europe (GDELT/cyber wire)
- **[high]** IED blast near convoy route in Sahel — Africa (GDELT/AFP)

## High / critical postures

- **[high]** Air-defense readiness raised along forward corridor — Eastern Europe (Regional air force)
- **[high]** Counter-deployment of coastal anti-ship batteries (reported) — Persian Gulf (Regional coastal forces)
- **[critical]** Armor / mechanized buildup opposite contested line — Eastern Europe (Regional ground forces)

## Supply routes (metadata)

_No supply-route metadata._

## Feed status

- GDELT GEO: **Pass** @ 2026-09-20T15:30:00.000Z — Seed + optional live refresh
- Markets (Stooq/Yahoo): **Pass** @ 2026-09-20T15:36:00.000Z — Seed series loaded
- X allowlist scroll: **Pass** @ 2026-09-25T13:34:21.832Z — live: 5 pointers merged (no X API search); 1 login-wall profile(s)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-25T13:34:07.432Z — merged 30 (added 30); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
