import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardSnapshot, EventLayer } from '@gsp/shared';
import { EVENT_LAYERS, LAYER_LABELS } from '@gsp/shared';
import { loadSnapshot, normalizeSnapshot } from './lib/loadData';
import { computeHotspots } from './lib/hotspots';
import { windowCutoff, type TimeWindow } from './lib/time';
import { SecurityMap } from './components/SecurityMap';
import { LayerToggles } from './components/LayerToggles';
import { TimeScrubber } from './components/TimeScrubber';
import { HotspotRail } from './components/HotspotRail';
import { FeedChips } from './components/FeedChips';
import { EconPanel } from './components/EconPanel';
import { DailyReports } from './components/DailyReports';
import { UpdateStatus } from './components/UpdateStatus';

/** Anchor "now" to snapshot generation so seed windows stay populated. */
function snapshotNow(snap: DashboardSnapshot): number {
  return new Date(snap.generatedAt).getTime();
}

export default function App() {
  const [liveSnap, setLiveSnap] = useState<DashboardSnapshot | null>(null);
  const [archiveSnap, setArchiveSnap] = useState<DashboardSnapshot | null>(null);
  const [archiveDate, setArchiveDate] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [window, setWindow] = useState<TimeWindow>('7d');
  const [layers, setLayers] = useState<Set<EventLayer>>(() => new Set(EVENT_LAYERS));
  const [showSupplyRoutes, setShowSupplyRoutes] = useState(true);
  const [showPosture, setShowPosture] = useState(true);

  useEffect(() => {
    loadSnapshot()
      .then(setLiveSnap)
      .catch((e: Error) => setErr(e.message));
  }, []);

  const snap = archiveSnap ?? liveSnap;

  const onSelectLive = useCallback(() => {
    setArchiveSnap(null);
    setArchiveDate(null);
  }, []);

  const onSelectDate = useCallback((date: string, pack: DashboardSnapshot) => {
    setArchiveDate(date);
    setArchiveSnap(normalizeSnapshot(pack));
  }, []);

  const filtered = useMemo(() => {
    if (!snap) return [];
    const cut = windowCutoff(window, snapshotNow(snap)).toISOString();
    return snap.events.filter(
      (e) => layers.has(e.layer) && e.observedAt >= cut,
    );
  }, [snap, window, layers]);

  const filteredPostures = useMemo(() => {
    if (!snap || !showPosture) return [];
    const cut = windowCutoff(window, snapshotNow(snap)).toISOString();
    return (snap.postures ?? []).filter((p) => p.observedAt >= cut);
  }, [snap, window, showPosture]);

  const hotspots = useMemo(() => computeHotspots(filtered), [filtered]);

  if (err) return <div className="error">Load failed: {err}</div>;
  if (!snap) return <div className="loading">Loading snapshot…</div>;

  function toggleLayer(layer: EventLayer) {
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          Global Security Pulse
          <span>
            v0.1{archiveDate ? ` · archive ${archiveDate}` : ''}
          </span>
        </div>
        <UpdateStatus
          updatedAt={snap.updatedAt ?? snap.generatedAt}
          nextUpdateHint={snap.nextUpdateHint}
          archiveMode={Boolean(archiveDate)}
        />
        <DailyReports
          selectedDate={archiveDate}
          onSelectLive={onSelectLive}
          onSelectDate={onSelectDate}
        />
        <FeedChips feeds={snap.feeds} />
      </header>

      <div className="main">
        <div className="map-wrap">
          <SecurityMap events={filtered} postures={filteredPostures} showSupplyRoutes={showSupplyRoutes} />
          <div className="map-overlay layers">
            <LayerToggles
              layers={EVENT_LAYERS}
              labels={LAYER_LABELS}
              active={layers}
              onToggle={toggleLayer}
              showSupplyRoutes={showSupplyRoutes}
              onToggleSupply={() => setShowSupplyRoutes((v) => !v)}
              showPosture={showPosture}
              onTogglePosture={() => setShowPosture((v) => !v)}
            />
          </div>
          <div className="map-overlay scrubber">
            <TimeScrubber value={window} onChange={setWindow} />
          </div>
        </div>
        <HotspotRail hotspots={hotspots} />
      </div>

      <EconPanel
        series={snap.series}
        anomalies={snap.anomalies}
        stress={snap.stress}
      />
    </div>
  );
}
