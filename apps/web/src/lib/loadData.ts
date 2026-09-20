import type {
  DashboardSnapshot,
  SecurityEvent,
  EconSeries,
  Anomaly,
  FeedStatus,
  Hotspot,
  StressComposite,
} from '@gsp/shared';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function loadSnapshot(): Promise<DashboardSnapshot> {
  try {
    return await getJson<DashboardSnapshot>('/data/snapshot.json');
  } catch {
    const [events, series, anomalies, feeds, stress, hotspots] = await Promise.all([
      getJson<SecurityEvent[]>('/data/events.json'),
      getJson<EconSeries[]>('/data/series.json'),
      getJson<Anomaly[]>('/data/anomalies.json'),
      getJson<FeedStatus[]>('/data/feeds.json'),
      getJson<StressComposite>('/data/stress.json'),
      getJson<Hotspot[]>('/data/hotspots.json'),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      events,
      series,
      anomalies,
      feeds,
      stress,
      hotspots,
      timeWindows: ['6h', '24h', '7d', '30d'],
    };
  }
}
