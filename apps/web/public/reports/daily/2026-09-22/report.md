# Global Security Pulse — Daily Report 2026-09-22

Generated: 2026-09-22T18:42:23.471Z
Ingest package: daily-2026-09-22

## Stress composite

- **Score:** 26.8 (equities 21, USD 38, VIX 20, oil 34)
- Evaluated at: 2026-09-22T18:40:51.935Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Nasdaq 100 | 2.24 | 0.64 | 6.01 | 0 |
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| S&P 500 | 1.37 | 0.06 | 2.42 | 0 |
| VIX | -1.34 | -3.9 | -16.92 | 0 |
| Brent Crude | 1.02 | -1.04 | -8.69 | 0 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| EUR/USD | -0.79 | -0.31 | -0.9 | 1 |
| USD/JPY | -0.68 | 0.28 | 2.01 | 6 |

## High / critical fallout events

- **[high]** Lula warns against foreign interference, defends Brazil’s sovereignty at UN — Americas (rss:Al Jazeera; [link](https://www.aljazeera.com/news/2026/9/22/lula-warns-against-foreign-interference-defends-brazils-sovereignty-at-un?traffic_source=rss))
- **[high]** ‘War crime’: Jordan’s king slams Israeli West Bank expansion — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/video/newsfeed/2026/9/22/war-crime-jordans-king-slams-israeli-west-bank-expansion?traffic_source=rss))
- **[high]** Fifteen guilty in 2019 Sri Lanka Easter bombings: What the verdict says — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/features/2026/9/22/fifteen-guilty-in-2019-sri-lanka-easter-bombings-what-the-verdict-says?traffic_source=rss))
- **[high]** Sri Lanka court convicts 15 men over deadly Easter Sunday bombings — Global (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cqy7z275yx65o?at_medium=RSS&at_campaign=rss))
- **[high]** Healthcare in Africa ‘under growing strain’ after US withdrawal from aid programs, report warns — Global (rss:Guardian World; [link](https://www.theguardian.com/us-news/2026/sep/21/africa-healthcare-aid-program-withdrawl))
- **[high]** US strikes on alleged drug boats may constitute ‘crimes against humanity’, UN expert says — Global (rss:Guardian World; [link](https://www.theguardian.com/world/2026/sep/21/us-boat-strikes-crime-against-humanity))
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
- X allowlist scroll: **Pass** @ 2026-09-22T18:42:17.986Z — live: 5 pointers merged (no X API search); 13 login-wall profile(s)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-22T18:41:04.524Z — merged 30 (added 30); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
