import type { Anomaly, EconSeries, StressComposite } from '@gsp/shared';
import { Sparkline } from './Sparkline';
import { StressDial } from './StressDial';
import { fmtTs } from '../lib/time';

const SPARK_IDS = ['spx', 'ndx', 'dax', 'nky', 'dxy', 'vix', 'wti', 'brent', 'gold', 'eurusd'];

export function EconPanel({
  series,
  anomalies,
  stress,
}: {
  series: EconSeries[];
  anomalies: Anomaly[];
  stress: StressComposite;
}) {
  const byId = Object.fromEntries(series.map((s) => [s.id, s]));
  const sparks = SPARK_IDS.map((id) => byId[id]).filter(Boolean);

  return (
    <section className="econ">
      <div className="econ-panel">
        <h2>Markets · sparklines</h2>
        <div className="sparks">
          {sparks.map((s) => (
            <Sparkline key={s.id} series={s} />
          ))}
        </div>
      </div>

      <div className="econ-panel">
        <h2>Anomalies · |z| sorted</h2>
        <table>
          <thead>
            <tr>
              <th>Series</th>
              <th className="num">z60</th>
              <th className="num">1d%</th>
              <th className="num">5d%</th>
              <th className="num">20d%</th>
              <th className="num">Streak</th>
              <th className="num">Last</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a) => {
              const zCls = Math.abs(a.zScore) >= 2 ? 'anomaly-neg' : a.zScore < 0 ? 'anomaly-neg' : 'anomaly-pos';
              return (
                <tr key={a.seriesId} title={`rule: ${a.rule} · snapshot: ${a.snapshot} · ${fmtTs(a.evaluatedAt)}`}>
                  <td>{a.seriesName}</td>
                  <td className={`num ${zCls}`}>{a.zScore.toFixed(2)}</td>
                  <td className="num">{fmtPct(a.pctChange1d)}</td>
                  <td className="num">{fmtPct(a.pctChange5d)}</td>
                  <td className="num">{fmtPct(a.pctChange20d)}</td>
                  <td className="num">{a.adverseStreak}</td>
                  <td className="num">{formatVal(a.latestValue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="econ-panel">
        <h2>Stress composite</h2>
        <StressDial stress={stress} />
      </div>
    </section>
  );
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function formatVal(n: number): string {
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(2);
  return n.toFixed(4);
}
