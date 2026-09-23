# Global Security Pulse — Daily Report 2026-09-23

Generated: 2026-09-23T14:05:39.060Z
Ingest package: daily-2026-09-23

## Stress composite

- **Score:** 29.9 (equities 24, USD 46, VIX 20, oil 36)
- Evaluated at: 2026-09-23T14:04:52.477Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Nasdaq 100 | 2.03 | 0.18 | 5.52 | 0 |
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| VIX | -1.33 | -3.77 | -16.8 | 0 |
| EUR/USD | -1.24 | -0.55 | -1.18 | 2 |
| S&P 500 | 1.09 | -0.39 | 1.97 | 1 |
| US Dollar Index | 1.09 | 0.61 | 1.4 | 2 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| Brent Crude | 0.79 | -1.92 | -8.02 | 0 |

## High / critical fallout events

- **[high]** Eleven killed in mass shooting at house in South Africa — Global (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/crgjqxzl097eo?at_medium=RSS&at_campaign=rss))
- **[critical]** Priests Against Genocide hold shroud with names of children killed in Gaza — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/video/newsfeed/2026/9/23/priests-against-genocide-hold-shroud-with-names-of-children-killed-in-gaza?traffic_source=rss))
- **[high]** Ethiopia and Tigray accuse each of launching offensives, fuelling fears of new war — Global (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cry8zwwq21pxo?at_medium=RSS&at_campaign=rss))
- **[high]** As Xi meets Trump, who’s winning their trade war? — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/features/2026/9/23/as-xi-meets-trump-whos-winning-their-trade-war?traffic_source=rss))
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
- X allowlist scroll: **Pass** @ 2026-09-23T14:05:28.820Z — live: 5 pointers merged (no X API search); 1 login-wall profile(s)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-23T14:05:05.055Z — merged 30 (added 30); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
