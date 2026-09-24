# Global Security Pulse — Daily Report 2026-09-24

Generated: 2026-09-24T23:24:59.503Z
Ingest package: daily-2026-09-24

## Stress composite

- **Score:** 31.1 (equities 24, USD 50, VIX 20, oil 39)
- Evaluated at: 2026-09-24T23:24:24.580Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| Nasdaq 100 | 1.88 | 0.03 | 5.3 | 0 |
| Brent Crude | 1.69 | 3.27 | 1.56 | 2 |
| EUR/USD | -1.46 | -0.01 | -0.83 | 4 |
| US Dollar Index | 1.32 | 0.15 | 0.94 | 3 |
| WTI Crude | 0.99 | 2.22 | -7.56 | 1 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| S&P 500 | 0.81 | -0.02 | 2.02 | 2 |

## High / critical fallout events

- **[high]** U.S. Central Command @CENTCOM Sep 21 USS Rafael Peralta (DDG 115) sails in regional waters as the guided-missile destroy — Middle East (x-scroll-curated; [link](https://x.com/CENTCOM/status/2102058017625723237))
- **[high]** Benjamin Netanyahu attacks Israel’s enemies and allies in UN speech — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/news/2026/9/24/benjamin-netanyahu-attacks-israels-enemies-and-allies-in-un-speech?traffic_source=rss))
- **[high]** Croatian court approves extradition in Nord Stream bombing case — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/news/2026/9/24/croatian-court-approves-extradition-in-nord-stream-bombing-case?traffic_source=rss))
- **[high]** Priest killed and four injured in knife attack at Polish abbey — Europe (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/c607lrvm41l3o?at_medium=RSS&at_campaign=rss))
- **[high]** Four civilians killed in Pakistani strikes in Afghanistan, Taliban says — South Asia (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cm86xn0nnw58o?at_medium=RSS&at_campaign=rss))
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
- X allowlist scroll: **Pass** @ 2026-09-24T23:24:54.649Z — live: 5 pointers merged (no X API search); 1 login-wall profile(s)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-24T23:24:37.028Z — merged 30 (added 30); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
