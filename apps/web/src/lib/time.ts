export type TimeWindow = '6h' | '24h' | '7d' | '30d';

const MS: Record<TimeWindow, number> = {
  '6h': 6 * 3600e3,
  '24h': 24 * 3600e3,
  '7d': 7 * 86400e3,
  '30d': 30 * 86400e3,
};

export function windowCutoff(window: TimeWindow, now = Date.now()): Date {
  return new Date(now - MS[window]);
}

export function ageLabel(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  if (ms < 0) return 'future';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function fmtTs(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return (
      new Date(iso).toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' CT'
    );
  } catch {
    return iso;
  }
}
