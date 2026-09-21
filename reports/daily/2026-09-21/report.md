# Global Security Pulse — Daily Report 2026-09-21

Generated: 2026-09-21T14:07:52.974Z
Ingest package: daily-2026-09-21

## Stress composite

- **Score:** 30.4 (equities 31, USD 34, VIX 20, oil 38)
- Evaluated at: 2026-09-21T14:06:28.645Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| Nasdaq 100 | 1.47 | 1.59 | 3.39 | 0 |
| Brent Crude | 1.19 | -3.06 | -4.72 | 0 |
| WTI Crude | 0.93 | -7.57 | -8.56 | 0 |
| VIX | -0.93 | 0.68 | -12.81 | 1 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| S&P 500 | 0.87 | 0.67 | 1.08 | 0 |
| USD/JPY | -0.72 | 0.85 | 2.63 | 5 |

## High / critical fallout events

- **[high]** U.S. Central Command @CENTCOM 14h Exercise Eager Lion enters its second week at Fort Carson in Colorado, where U.S. and  — Global (x-scroll-curated; [link](https://x.com/CENTCOM/status/2101811536947732659))
- **[high]** U.S. Central Command @CENTCOM 18h A look into the daily operations of U.S. Navy Sailors aboard USS John Finn (DDG 113) a — Global (x-scroll-curated; [link](https://x.com/CENTCOM/status/2101752852917968954))
- **[high]** NFL’s Azeez Al-Shaair honours another Palestinian girl killed by Israel — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/video/newsfeed/2026/9/21/nfls-azeez-al-shaair-honours-another-palestinian-girl-killed-by-israel?traffic_source=rss))
- **[high]** Israeli attacks on Gaza kill three, including a child — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/news/2026/9/21/israeli-attacks-on-gaza-kill-three-including-a-child?traffic_source=rss))
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
- X allowlist scroll: **Pass** @ 2026-09-21T14:07:49.140Z — live: 5 pointers merged (no X API search); 13 login-wall profile(s)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-21T14:06:40.908Z — merged 30 (added 30); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
