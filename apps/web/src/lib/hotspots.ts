import type { SecurityEvent, Hotspot, EventLayer, Severity } from '@gsp/shared';

export function computeHotspots(events: SecurityEvent[]): Hotspot[] {
  const by = new Map<
    string,
    {
      region: string;
      count: number;
      maxSeverity: Severity;
      freshestSource: string;
      freshestAt: string;
      layers: Set<EventLayer>;
    }
  >();

  for (const e of events) {
    const h = by.get(e.region) ?? {
      region: e.region,
      count: 0,
      maxSeverity: 1 as Severity,
      freshestSource: '',
      freshestAt: '1970-01-01T00:00:00.000Z',
      layers: new Set<EventLayer>(),
    };
    h.count += 1;
    h.maxSeverity = Math.max(h.maxSeverity, e.severity) as Severity;
    if (e.observedAt > h.freshestAt) {
      h.freshestAt = e.observedAt;
      h.freshestSource = e.source;
    }
    h.layers.add(e.layer);
    by.set(e.region, h);
  }

  return [...by.values()]
    .map((h) => ({
      region: h.region,
      count: h.count,
      maxSeverity: h.maxSeverity,
      freshestSource: h.freshestSource,
      freshestAt: h.freshestAt,
      layers: [...h.layers],
    }))
    .sort((a, b) => b.maxSeverity - a.maxSeverity || b.count - a.count);
}
