#!/usr/bin/env node
/**
 * Markets ingest via Stooq CSV (no key). Optional FRED if FRED_API_KEY set.
 * On failure, keeps seed series.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const seedSeries = path.join(root, 'data/seed/series.json');
const publicSeries = path.join(root, 'apps/web/public/data/series.json');
const publicAnomalies = path.join(root, 'apps/web/public/data/anomalies.json');
const publicStress = path.join(root, 'apps/web/public/data/stress.json');
const publicSnapshot = path.join(root, 'apps/web/public/data/snapshot.json');

const STOOQ = [
  { id: 'spx', name: 'S&P 500', unit: 'index', symbol: '^spx' },
  { id: 'ndx', name: 'Nasdaq 100', unit: 'index', symbol: '^ndx' },
  { id: 'dax', name: 'DAX', unit: 'index', symbol: '^dax' },
  { id: 'nky', name: 'Nikkei 225', unit: 'index', symbol: '^nkx' },
  { id: 'wti', name: 'WTI Crude', unit: 'USD/bbl', symbol: 'cl.f' },
  { id: 'brent', name: 'Brent Crude', unit: 'USD/bbl', symbol: 'brent.f' },
  { id: 'gold', name: 'Gold', unit: 'USD/oz', symbol: 'xauusd' },
  { id: 'eurusd', name: 'EUR/USD', unit: 'fx', symbol: 'eurusd' },
  { id: 'usdjpy', name: 'USD/JPY', unit: 'fx', symbol: 'usdjpy' },
];

async function fetchStooq(symbol) {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`stooq ${symbol} HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split('\n').slice(1);
  const points = lines
    .map((line) => {
      const [date, , , , close] = line.split(',');
      const v = Number(close);
      if (!date || !Number.isFinite(v)) return null;
      return { t: date, v };
    })
    .filter(Boolean)
    .slice(-90);
  if (points.length < 10) throw new Error(`stooq ${symbol} too few points`);
  return points;
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function std(arr) {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)) || 1e-9);
}

function anomaliesFrom(seriesList) {
  const evaluatedAt = new Date().toISOString();
  return seriesList
    .map((s) => {
      const vals = s.points.map((p) => p.v);
      const window = vals.slice(-60);
      const z = (vals[vals.length - 1] - mean(window)) / std(window);
      const pct = (a, b) => (b === 0 ? 0 : ((a - b) / Math.abs(b)) * 100);
      const last = vals[vals.length - 1];
      const d1 = vals[vals.length - 2] ?? last;
      const d5 = vals[vals.length - 6] ?? last;
      const d20 = vals[vals.length - 21] ?? last;
      const adverseUp = ['vix', 'wti', 'brent', 'dxy', 'usdjpy', 'gold'].includes(s.id);
      let streak = 0;
      for (let i = vals.length - 1; i > 0; i--) {
        const up = vals[i] > vals[i - 1];
        const adverse = adverseUp ? up : !up;
        if (adverse) streak++;
        else break;
      }
      return {
        seriesId: s.id,
        seriesName: s.name,
        zScore: Math.round(z * 100) / 100,
        pctChange1d: Math.round(pct(last, d1) * 100) / 100,
        pctChange5d: Math.round(pct(last, d5) * 100) / 100,
        pctChange20d: Math.round(pct(last, d20) * 100) / 100,
        adverseStreak: streak,
        latestValue: last,
        evaluatedAt,
        rule: 'rolling_z_60d + pct_1/5/20d + adverse_streak',
        snapshot: `live@${evaluatedAt.slice(0, 10)}`,
      };
    })
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

function stressFrom(anoms) {
  const byId = Object.fromEntries(anoms.map((a) => [a.seriesId, a]));
  const clamp = (n) => Math.min(100, Math.max(0, n));
  const eq = clamp(40 + -(byId.spx?.pctChange5d ?? 0) * 8 + Math.max(0, -(byId.spx?.zScore ?? 0)) * 10);
  const usd = clamp(30 + Math.max(0, byId.dxy?.zScore ?? byId.usdjpy?.zScore ?? 0) * 15);
  const vix = clamp(20 + Math.max(0, byId.vix?.zScore ?? 0) * 18);
  const oil = clamp(25 + Math.max(0, byId.wti?.zScore ?? 0) * 14);
  const evaluatedAt = new Date().toISOString();
  return {
    score: Math.round((eq * 0.35 + usd * 0.2 + vix * 0.25 + oil * 0.2) * 10) / 10,
    components: { equities: Math.round(eq), usd: Math.round(usd), vix: Math.round(vix), oil: Math.round(oil) },
    evaluatedAt,
    rule: '0.35*equities_stress + 0.2*usd + 0.25*vix + 0.2*oil',
    snapshot: `live@${evaluatedAt.slice(0, 10)}`,
  };
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(seedSeries, 'utf8'));
  const byId = Object.fromEntries(seed.map((s) => [s.id, s]));
  let liveCount = 0;

  for (const spec of STOOQ) {
    try {
      const points = await fetchStooq(spec.symbol);
      byId[spec.id] = { id: spec.id, name: spec.name, unit: spec.unit, source: 'stooq', points };
      liveCount++;
    } catch (err) {
      console.warn(`  stooq ${spec.symbol}: ${err.message} (keeping seed)`);
    }
  }

  if (process.env.FRED_API_KEY) {
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=${process.env.FRED_API_KEY}&file_type=json&sort_order=desc&limit=90`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`FRED HTTP ${res.status}`);
      const data = await res.json();
      const points = (data.observations ?? [])
        .filter((o) => o.value !== '.')
        .map((o) => ({ t: o.date, v: Number(o.value) }))
        .reverse();
      if (points.length) {
        byId.fedfunds = { id: 'fedfunds', name: 'Fed Funds', unit: '%', source: 'fred', points };
        liveCount++;
      }
    } catch (err) {
      console.warn(`  FRED: ${err.message}`);
    }
  } else {
    console.log('  FRED_API_KEY not set — fed funds remains seed proxy');
  }

  const series = Object.values(byId);
  const anomalies = anomaliesFrom(series);
  const stress = stressFrom(anomalies);

  fs.writeFileSync(publicSeries, JSON.stringify(series, null, 2));
  fs.writeFileSync(seedSeries, JSON.stringify(series, null, 2));
  fs.writeFileSync(publicAnomalies, JSON.stringify(anomalies, null, 2));
  fs.writeFileSync(publicStress, JSON.stringify(stress, null, 2));
  if (fs.existsSync(publicSnapshot)) {
    const snap = JSON.parse(fs.readFileSync(publicSnapshot, 'utf8'));
    snap.series = series;
    snap.anomalies = anomalies;
    snap.stress = stress;
    snap.generatedAt = new Date().toISOString();
    fs.writeFileSync(publicSnapshot, JSON.stringify(snap, null, 2));
  }

  console.log(`ingest:markets ${liveCount > 0 ? 'Pass' : 'Warn'} — live series ${liveCount}/${STOOQ.length}+; anomalies ${anomalies.length}; stress ${stress.score}`);
}

main();
