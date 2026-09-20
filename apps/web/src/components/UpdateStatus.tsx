import { useEffect, useMemo, useState } from 'react';
import {
  buildDataUpdateMeta,
  formatNextUpdateHint,
  formatUpdatedAtLabel,
  computeNextUpdate,
  type DataUpdateMeta,
} from '@gsp/shared';

const BASE = import.meta.env.BASE_URL || '/';

function url(path: string): string {
  return `${BASE}${path}`.replace(/([^:]\/)\/+/g, '$1');
}

interface Props {
  /** Prefer snapshot.updatedAt when viewing live or archive pack */
  updatedAt?: string | null;
  nextUpdateHint?: string | null;
  /** When viewing an archive, updatedAt is historical; next still follows live cadence */
  archiveMode?: boolean;
}

/**
 * Prominent header status: "Updated 3:20 PM CT Sep 20 · Next update ~1:20 PM CT"
 * Loads public/data/meta.json when props are sparse; recomputes next hint every minute.
 */
export function UpdateStatus({ updatedAt }: Props) {
  const [meta, setMeta] = useState<DataUpdateMeta | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch(url('data/meta.json'))
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<DataUpdateMeta>;
      })
      .then(setMeta)
      .catch(() => {
        setMeta(buildDataUpdateMeta(updatedAt ? new Date(updatedAt) : new Date()));
      });
  }, [updatedAt]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const display = useMemo(() => {
    const iso = updatedAt || meta?.updatedAt || new Date(now).toISOString();
    const updatedLabel = formatUpdatedAtLabel(iso);
    const from = new Date(now);
    const next = computeNextUpdate(from);
    const nextHint = formatNextUpdateHint(next, from);
    return { updatedLabel, nextHint };
  }, [updatedAt, meta, now]);

  return (
    <div
      className="update-status"
      title="Daily injects 8:20 AM / 1:20 PM / 6:20 PM America/Chicago"
    >
      <span className="update-status-updated">{display.updatedLabel}</span>
      <span className="update-status-sep">·</span>
      <span className="update-status-next">{display.nextHint}</span>
    </div>
  );
}
