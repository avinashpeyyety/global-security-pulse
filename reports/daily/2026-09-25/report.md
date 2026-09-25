# Global Security Pulse — Daily Report 2026-09-25

Generated: 2026-09-25T23:22:00.182Z
Ingest package: daily-2026-09-25

## Stress composite

- **Score:** 32 (equities 30, USD 47, VIX 20, oil 36)
- Evaluated at: 2026-09-25T23:21:26.037Z
- Rule: `0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil`

## Top anomalies (|z|)

| Series | z | 1d% | 5d% | Streak |
|--------|---|-----|-----|--------|
| Shanghai Composite | -2.03 | -0.22 | -0.3 | 1 |
| Nasdaq 100 | 1.95 | 0.42 | 3.25 | 0 |
| EUR/USD | -1.32 | 0.15 | -0.76 | 0 |
| US Dollar Index | 1.1 | -0.25 | 0.81 | 0 |
| S&P 500 | 1.07 | 0.51 | 1.21 | 0 |
| Copper | 0.92 | -0.24 | -1.18 | 5 |
| DAX | -0.88 | -0.57 | -1.75 | 2 |
| VIX | -0.86 | -5.11 | 0.41 | 0 |

## High / critical fallout events

- **[high]** Houthi attack on Mecca, Medina would cross ‘red line’, Pakistan PM tells UN — Middle East (rss:Al Jazeera; [link](https://www.aljazeera.com/news/2026/9/25/houthi-attack-on-mecca-medina-would-cross-red-line-pakistan-pm-tells-un?traffic_source=rss))
- **[high]** Russia targeting 'ordinary life' with attacks on Ukraine's data centres, Zelensky says — Eastern Europe (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/c84gkwgk7d06o?at_medium=RSS&at_campaign=rss))
- **[high]** Students strike across Germany in protest against military service — Europe (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cxnvlnve52qdo?at_medium=RSS&at_campaign=rss))
- **[high]** Pope warns against 'losing humanity' to AI machines — Europe (rss:BBC World; [link](https://www.bbc.co.uk/news/articles/cmq8j904212po?at_medium=RSS&at_campaign=rss))
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
- X allowlist scroll: **Pass** @ 2026-09-25T23:21:54.768Z — live: 5 pointers merged (no X API search); 1 login-wall profile(s)
- FRED macros: **Warn** @ 2026-09-20T15:00:00.000Z — No FRED_API_KEY; using seed proxy for fed funds
- RSS wires: **Pass** @ 2026-09-25T23:21:38.447Z — merged 30 (added 30); bbc-world:10, guardian-world:10, aljazeera:10
- Baltic Dry: **Not run** @ n/a — No free reliable source wired

## Notes

- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.
- Daily routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.
