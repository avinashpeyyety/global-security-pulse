# Global Security Pulse — Daily Report 2026-09-21

Generated: 2026-09-21T18:44:55.590Z
Ingest package: daily-2026-09-21

## Stress composite

- **Score:** 28 (equities 24, USD 35, VIX 20, oil 37)
- Evaluated at: 2026-09-21T18:43:33.178Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| Nasdaq 100 | 2.01 | 2.74 | 4.56 | 0 |
| S&P 500 | 1.4 | 1.55 | 1.96 | 0 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| WTI Crude | 0.87 | -8.14 | -9.12 | 0 |
| VIX | -0.85 | 1.49 | -12.11 | 1 |
| Brent Crude | 0.72 | -7.53 | -9.11 | 0 |
| USD/JPY | -0.71 | 0.86 | 2.64 | 5 |

## High / critical fallout events

- **[high]** U.S. Central Command @CENTCOM 3h USS Rafael Peralta (DDG 115) sails in regional waters as the guided-missile destroyer c — Middle East (x-scroll-curated; [link](https://x.com/CENTCOM/status/2102058017625723237))
- **[high]** U.S. Central Command @CENTCOM 19h Exercise Eager Lion enters its second week at Fort Carson in Colorado, where U.S. and  — Global (x-scroll-curated; [link](https://x.com/CENTCOM/status/2101811536947732659))
- **[high]** U.S. Central Command @CENTCOM 23h A look into the daily operations of U.S. Navy Sailors aboard USS John Finn (DDG 113) a — Global (x-scroll-curated; [link](https://x.com/CENTCOM/status/2101752852917968954))
- **[critical]** First UK charges brought over 1994 Rwanda genocide — Global (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cr2092216nywo?at_medium=RSS&at_campaign=rss))
- **[high]** Paramount settles with US states in step towards merger with Warner Bros — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/economy/2026/9/21/paramount-settles-with-us-states-in-step-towards-merger-with-warner-bros?traffic_source=rss))
- **[high]** Jerusalem Daily: Ben-Gvir demands death penalty for Palestinian who killed — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/video/newsfeed/2026/9/21/jerusalem-daily-ben-gvir-demands-death-penalty-for-palestinian-who-killed?traffic_source=rss))
- **[high]** How is Europe dealing with ‘hybrid war’? — Europe (rss:Al Jazeera; [link](https://www.aljazeera.com/video/inside-story/2026/9/21/how-is-europe-dealing-with-hybrid-war?traffic_source=rss))
- **[high]** US strikes on alleged drug boats may constitute ‘crimes against humanity’, UN expert says — Global (rss:Guardian World; [link](https://www.theguardian.com/world/2026/sep/21/us-boat-strikes-crime-against-humanity))
- **[high]** Yemenis flee across Red Sea as Houthis and Saudi-backed forces escalate war — Red Sea / Bab el-Mandeb (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cw4gm7l742dmo?at_medium=RSS&at_campaign=rss))
- **[high]** US strikes on alleged drug boats could be crimes against humanity, says UN — Global (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/ck5ye7v88qy7o?at_medium=RSS&at_campaign=rss))
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
- X allowlist scroll: **Pass** @ 2026-09-21T18:44:51.206Z — live: 5 pointers merged (no X API search); 13 login-wall profile(s)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-21T18:43:44.999Z — merged 30 (added 30); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
