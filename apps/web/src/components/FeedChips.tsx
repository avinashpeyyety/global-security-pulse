import type { FeedStatus } from '@gsp/shared';
import { fmtTs } from '../lib/time';

export function FeedChips({ feeds }: { feeds: FeedStatus[] }) {
  return (
    <div className="feeds" title="Feed status: Pass / Fail / Warn / Not run">
      {feeds.map((f) => {
        const cls = f.status === 'Not run' ? 'Notrun' : f.status;
        return (
          <div
            key={f.id}
            className={`chip ${cls}`}
            data-status={f.status}
            title={`${f.detail ?? ''}\nrule: ${f.rule ?? '—'}\nsnapshot: ${f.snapshot ?? '—'}\nevaluated: ${fmtTs(f.lastEvaluatedAt)}`}
          >
            <span className="dot" />
            <span className="name">{f.name}</span>
            <span className="status">{f.status}</span>
          </div>
        );
      })}
    </div>
  );
}
