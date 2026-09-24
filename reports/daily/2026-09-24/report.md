# Global Security Pulse — Daily Report 2026-09-24

Generated: 2026-09-24T18:25:41.608Z
Ingest package: daily-2026-09-24

## Stress composite

- **Score:** 31.5 (equities 24, USD 51, VIX 20, oil 39)
- Evaluated at: 2026-09-24T18:24:58.742Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| Nasdaq 100 | 1.8 | -0.15 | 5.11 | 2 |
| Brent Crude | 1.68 | 3.23 | 1.52 | 2 |
| EUR/USD | -1.56 | -0.66 | -0.85 | 3 |
| US Dollar Index | 1.38 | 0.2 | 0.99 | 3 |
| WTI Crude | 1.03 | 2.62 | -7.2 | 1 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| DAX | -0.88 | -0.57 | -1.06 | 2 |

## High / critical fallout events

- **[high]** U.S. Central Command @CENTCOM Sep 21 USS Rafael Peralta (DDG 115) sails in regional waters as the guided-missile destroy — Middle East (x-scroll-curated; [link](https://x.com/CENTCOM/status/2102058017625723237))
- **[high]** Iranian-American group sues Trump over war — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/news/2026/9/24/iranian-american-group-sues-trump-over-war?traffic_source=rss))
- **[high]** Four civilians killed in Pakistani airstrikes in Afghanistan — South Asia (rss:Al Jazeera; [link](https://www.aljazeera.com/video/newsfeed/2026/9/24/four-civilians-killed-in-pakistani-airstrikes-in-afghanistan?traffic_source=rss))
- **[high]** Poland says fire at Starlink station is sabotage as Denmark warns of rising Russian threat — Europe (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cmp30r1klk37o?at_medium=RSS&at_campaign=rss))
- **[high]** Ethiopia's army says it has repelled attacks in first comment on fresh fighting — Global (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cqevwm09w4xmo?at_medium=RSS&at_campaign=rss))
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
- X allowlist scroll: **Pass** @ 2026-09-24T18:25:37.183Z — live: 5 pointers merged (no X API search); 1 login-wall profile(s)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-24T18:25:10.303Z — merged 30 (added 30); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
