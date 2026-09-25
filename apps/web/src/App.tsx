import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TransitionEvent } from 'react';
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
import { usePanelOpen, usePanelShortcuts } from './lib/panels';

/** Keep in sync with --side-transition in ops.css (fallback if transitionend never fires). */
const SIDE_TRANSITION_MS = 220;

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
  const [leftOpen, toggleLeft] = usePanelOpen('left');
  const [rightOpen, toggleRight] = usePanelOpen('right');
  const [mapResizeSignal, setMapResizeSignal] = useState(0);
  usePanelShortcuts(toggleLeft, toggleRight);

  // After a panel collapses/expands, tell MapLibre to re-layout once the slide settles.
  const bumpMapResize = useCallback(() => setMapResizeSignal((n) => n + 1), []);
  const firstPanelRender = useRef(true);
  useEffect(() => {
    if (firstPanelRender.current) {
      firstPanelRender.current = false;
      return;
    }
    const t = globalThis.setTimeout(bumpMapResize, SIDE_TRANSITION_MS + 80);
    return () => globalThis.clearTimeout(t);
  }, [leftOpen, rightOpen, bumpMapResize]);
  const onSideTransitionEnd = useCallback(
    (e: TransitionEvent<HTMLElement>) => {
      if (e.target === e.currentTarget && e.propertyName === 'width') bumpMapResize();
    },
    [bumpMapResize],
  );

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
        <aside
          id="gsp-panel-left"
          className={`side side-left${leftOpen ? '' : ' collapsed'}`}
          aria-label="Layers and legend"
          onTransitionEnd={onSideTransitionEnd}
        >
          <div className="side-inner" aria-hidden={!leftOpen}>
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
          {!leftOpen && (
            <button
              type="button"
              className="side-handle"
              onClick={toggleLeft}
              aria-label="Show layers panel ([)"
              title="Show layers panel ( [ )"
            />
          )}
        </aside>

        <div className="map-wrap">
          <SecurityMap
            events={filtered}
            postures={filteredPostures}
            showSupplyRoutes={showSupplyRoutes}
            resizeSignal={mapResizeSignal}
          />
          <button
            type="button"
            className="panel-tab panel-tab-left"
            onClick={toggleLeft}
            aria-controls="gsp-panel-left"
            aria-expanded={leftOpen}
            title={`${leftOpen ? 'Hide' : 'Show'} layers panel ( [ )`}
          >
            {leftOpen ? '«' : '»'}
          </button>
          <button
            type="button"
            className="panel-tab panel-tab-right"
            onClick={toggleRight}
            aria-controls="gsp-panel-right"
            aria-expanded={rightOpen}
            title={`${rightOpen ? 'Hide' : 'Show'} hotspots panel ( ] )`}
          >
            {rightOpen ? '»' : '«'}
          </button>
          <div className="map-overlay scrubber">
            <TimeScrubber value={window} onChange={setWindow} />
          </div>
        </div>

        <aside
          id="gsp-panel-right"
          className={`side side-right${rightOpen ? '' : ' collapsed'}`}
          aria-label="Hotspots"
          onTransitionEnd={onSideTransitionEnd}
        >
          <div className="side-inner" aria-hidden={!rightOpen}>
            <HotspotRail hotspots={hotspots} />
          </div>
          {!rightOpen && (
            <button
              type="button"
              className="side-handle"
              onClick={toggleRight}
              aria-label="Show hotspots panel (])"
              title="Show hotspots panel ( ] )"
            />
          )}
        </aside>
      </div>

      <EconPanel
        series={snap.series}
        anomalies={snap.anomalies}
        stress={snap.stress}
      />
    </div>
  );
}
