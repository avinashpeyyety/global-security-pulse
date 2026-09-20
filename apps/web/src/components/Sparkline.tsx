import type { EconSeries } from '@gsp/shared';

export function Sparkline({ series }: { series: EconSeries }) {
  const pts = series.points.slice(-60);
  if (pts.length < 2) return null;

  const vals = pts.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const w = 120;
  const h = 28;
  const d = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const last = vals[vals.length - 1];
  const prev = vals[vals.length - 2];
  const up = last >= prev;

  return (
    <div className="spark">
      <div className="meta">
        <span>{series.name}</span>
        <span className="val" style={{ color: up ? 'var(--pass)' : 'var(--fail)' }}>
          {formatVal(last)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={d} />
      </svg>
    </div>
  );
}

function formatVal(n: number): string {
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(2);
  return n.toFixed(4);
}
