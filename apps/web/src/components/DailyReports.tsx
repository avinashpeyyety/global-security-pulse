import { useEffect, useState } from 'react';
import type { DashboardSnapshot } from '@gsp/shared';

const BASE = import.meta.env.BASE_URL || '/';

function url(path: string): string {
  return `${BASE}${path}`.replace(/([^:]\/)\/+/g, '$1');
}

export interface ReportIndexEntry {
  date: string;
  path?: string;
  publicPath?: string;
  generatedAt?: string;
  packageId?: string;
  stressScore?: number | null;
  eventCount?: number;
  anomalyCount?: number;
}

export interface ReportsIndex {
  updatedAt?: string;
  latest?: string;
  dates: ReportIndexEntry[];
}

interface Props {
  /** Currently selected archive date, or null for live/latest public data */
  selectedDate: string | null;
  onSelectLive: () => void;
  onSelectDate: (date: string, pack: DashboardSnapshot) => void;
}

export function DailyReports({ selectedDate, onSelectLive, onSelectDate }: Props) {
  const [index, setIndex] = useState<ReportsIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadingDate, setLoadingDate] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(url('data/reports-index.json'))
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ReportsIndex>;
      })
      .then(setIndex)
      .catch((e: Error) => setErr(e.message));
  }, []);

  async function loadDate(date: string) {
    setLoadingDate(date);
    setErr(null);
    try {
      const res = await fetch(url(`reports/daily/${date}/pack.json`));
      if (!res.ok) throw new Error(`pack ${date}: HTTP ${res.status}`);
      const pack = (await res.json()) as DashboardSnapshot & { date?: string };
      onSelectDate(date, pack);
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingDate(null);
    }
  }

  const dates = index?.dates ?? [];

  return (
    <div className="daily-reports">
      <button
        type="button"
        className="daily-reports-toggle"
        onClick={() => setOpen((v) => !v)}
        title="Daily report archive"
      >
        Daily reports
        {selectedDate ? ` · ${selectedDate}` : ' · live'}
        <span className="caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="daily-reports-panel">
          <div className="daily-reports-head">Archive (read-only)</div>
          <button
            type="button"
            className={!selectedDate ? 'active' : undefined}
            onClick={() => {
              onSelectLive();
              setOpen(false);
            }}
          >
            Live / latest public data
          </button>
          {dates.length === 0 && !err && (
            <div className="daily-reports-empty">No archived dates yet — run npm run report:daily</div>
          )}
          {dates.map((d) => (
            <button
              key={d.date}
              type="button"
              className={selectedDate === d.date ? 'active' : undefined}
              disabled={loadingDate === d.date}
              onClick={() => loadDate(d.date)}
            >
              <span>{d.date}</span>
              <span className="meta">
                {d.stressScore != null ? `stress ${d.stressScore}` : ''}
                {d.eventCount != null ? ` · ${d.eventCount} evt` : ''}
              </span>
            </button>
          ))}
          {err && <div className="daily-reports-err">{err}</div>}
        </div>
      )}
    </div>
  );
}
