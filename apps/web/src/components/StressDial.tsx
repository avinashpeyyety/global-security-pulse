import type { StressComposite } from '@gsp/shared';
import { fmtTs } from '../lib/time';

export function StressDial({ stress }: { stress: StressComposite }) {
  const pct = Math.max(0, Math.min(100, stress.score));
  return (
    <div className="stress">
      <div className="dial" style={{ ['--pct' as string]: pct }}>
        <div className="score">{pct.toFixed(0)}</div>
        <div className="lbl">stress</div>
      </div>
      <div className="stress-comps">
        <div>
          <label>Equities</label>
          <span>{stress.components.equities}</span>
        </div>
        <div>
          <label>USD</label>
          <span>{stress.components.usd}</span>
        </div>
        <div>
          <label>VIX</label>
          <span>{stress.components.vix}</span>
        </div>
        <div>
          <label>Oil</label>
          <span>{stress.components.oil}</span>
        </div>
      </div>
      <div className="trace">
        evaluated {fmtTs(stress.evaluatedAt)} against rule “{stress.rule}” on snapshot {stress.snapshot}
      </div>
    </div>
  );
}
