import type {
  DashboardSnapshot,
  SecurityEvent,
  MilitaryPosture,
  EconSeries,
  Anomaly,
  FeedStatus,
  Hotspot,
  StressComposite,
} from '@gsp/shared';
import { severityToFallout } from '@gsp/shared';

const BASE = import.meta.env.BASE_URL || '/';

function dataUrl(file: string): string {
  return `${BASE}${file}`.replace(/([^:]\/)\/+/g, '$1');
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

function ensureFallout(events: SecurityEvent[]): SecurityEvent[] {
  return events.map((e) => ({
    ...e,
    falloutRisk: e.falloutRisk ?? severityToFallout(e.severity),
  }));
}

export async function loadMeta(): Promise<{
  updatedAt?: string;
  nextUpdateAt?: string;
  nextUpdateHint?: string;
} | null> {
  try {
    return await getJson(dataUrl('data/meta.json'));
  } catch {
    return null;
  }
}

export function normalizeSnapshot(snap: DashboardSnapshot): DashboardSnapshot {
  return {
    ...snap,
    events: ensureFallout(snap.events ?? []),
    postures: snap.postures ?? [],
    hotspots: snap.hotspots ?? [],
    feeds: snap.feeds ?? [],
    series: snap.series ?? [],
    anomalies: snap.anomalies ?? [],
    timeWindows: snap.timeWindows ?? ['6h', '24h', '7d', '30d'],
  };
}

export async function loadSnapshot(): Promise<DashboardSnapshot> {
  try {
    const snap = await getJson<DashboardSnapshot>(dataUrl('data/snapshot.json'));
    if (!snap.postures) {
      try {
        snap.postures = await getJson<MilitaryPosture[]>(dataUrl('data/postures.json'));
      } catch {
        snap.postures = [];
      }
    }
    const meta = await loadMeta();
    if (meta) {
      snap.updatedAt = snap.updatedAt ?? meta.updatedAt;
      snap.nextUpdateAt = snap.nextUpdateAt ?? meta.nextUpdateAt;
      snap.nextUpdateHint = snap.nextUpdateHint ?? meta.nextUpdateHint;
    }
    return normalizeSnapshot(snap);
  } catch {
    const [events, series, anomalies, feeds, stress, hotspots, postures] = await Promise.all([
      getJson<SecurityEvent[]>(dataUrl('data/events.json')),
      getJson<EconSeries[]>(dataUrl('data/series.json')),
      getJson<Anomaly[]>(dataUrl('data/anomalies.json')),
      getJson<FeedStatus[]>(dataUrl('data/feeds.json')),
      getJson<StressComposite>(dataUrl('data/stress.json')),
      getJson<Hotspot[]>(dataUrl('data/hotspots.json')),
      getJson<MilitaryPosture[]>(dataUrl('data/postures.json')).catch(() => [] as MilitaryPosture[]),
    ]);
    return normalizeSnapshot({
      generatedAt: new Date().toISOString(),
      events,
      postures,
      series,
      anomalies,
      feeds,
      stress,
      hotspots,
      timeWindows: ['6h', '24h', '7d', '30d'],
    });
  }
}

/** Load a dated archive pack from public/reports/daily/YYYY-MM-DD/pack.json */
export async function loadArchivePack(date: string): Promise<DashboardSnapshot> {
  const pack = await getJson<DashboardSnapshot & { supplyRoutes?: unknown }>(
    dataUrl(`reports/daily/${date}/pack.json`),
  );
  return normalizeSnapshot(pack);
}
