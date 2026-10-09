import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { FalloutRisk, MilitaryPosture, SecurityEvent, XPostRef } from '@gsp/shared';
import {
  PRECIPITATE_LABELS,
  MARKER_RISK_COLORS,
  RISK_RANK,
  ROUTE_KIND_COLORS,
  eventFalloutRisk,
  FALLOUT_LABELS,
  FALLOUT_LEVELS,
} from '@gsp/shared';
import { ageLabel } from '../lib/time';
import { isEventMapPlottable, isPostureMapPlottable } from '../lib/mapCoords';
import { ACCENT, MARKER_BG, makeTriangleImage, markerRadius, postureImageId } from '../lib/markers';

const STYLE = 'https://tiles.openfreemap.org/styles/dark';
const ROUTES_URL = `${import.meta.env.BASE_URL}data/supply-routes.json`;

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

/** Dry-run x-scroll placeholders must never be primary map markers. */
function isDryRunXScroll(e: SecurityEvent): boolean {
  const src = String(e.source || '').toLowerCase();
  if (!src.startsWith('x-scroll')) return false;
  if (src === 'x-scroll-curated') return false;
  const id = String(e.id || '');
  const summary = String(e.summary || '');
  return id.includes('dry') || /\[dry-run\]/i.test(summary) || /dry-run/i.test(summary);
}

/** Standalone raw x-scroll rows (pre-curation) — prefer curated wrappers / attachments. */
function isRawXScrollMarker(e: SecurityEvent): boolean {
  const src = String(e.source || '').toLowerCase();
  return src === 'x-scroll' || (src.startsWith('x-scroll') && src !== 'x-scroll-curated');
}

function primaryBrief(e: SecurityEvent): string {
  return (e.curatedSummary || e.summary || '').trim();
}

function buildEventPopupHtml(e: SecurityEvent, risk: ReturnType<typeof eventFalloutRisk>, color: string): string {
  const brief = primaryBrief(e);
  const xPosts: XPostRef[] = Array.isArray(e.xPosts) ? e.xPosts : [];
  const briefNote =
    e.briefSource === 'agent'
      ? 'agent brief'
      : e.briefSource === 'wire'
        ? 'wire brief'
        : '';
  const link = e.url
    ? `<div class="popup-link"><a href="${escapeAttr(e.url)}" target="_blank" rel="noopener noreferrer">Primary source</a></div>`
    : '';
  const xSection =
    xPosts.length > 0
      ? `<details class="x-posts">
          <summary>X posts (${xPosts.length})</summary>
          <ul class="x-posts-list">
            ${xPosts
              .map(
                (p) => `<li>
                  <a class="x-handle" href="${escapeAttr(p.url)}" target="_blank" rel="noopener noreferrer">@${escapeHtml(p.author)}</a>
                  <span class="x-text">${escapeHtml(p.text)}</span>
                  ${p.observedAt ? `<span class="x-age">${escapeHtml(ageLabel(p.observedAt))}</span>` : ''}
                </li>`,
              )
              .join('')}
          </ul>
        </details>`
      : '';

  return `<div class="evt-popup">
    <span style="font-family:monospace;font-size:9px;border:1px solid #2a343f;padding:1px 4px;color:#8b9aab">REL ${e.sourceReliability}</span>
    <span style="font-family:monospace;font-size:9px;color:${color};margin-left:6px">${escapeHtml(FALLOUT_LABELS[risk])}</span>
    <span style="font-family:monospace;font-size:9px;color:#8b9aab;margin-left:6px">${e.layer} · sev ${e.severity} · ${ageLabel(e.observedAt)}</span>
    <div style="font-weight:600;margin:4px 0">${escapeHtml(e.title)}</div>
    <div class="popup-brief">${escapeHtml(brief)}</div>
    <div style="font-family:monospace;font-size:9px;color:#6b7c8f;margin-top:4px">${escapeHtml(e.source)}${briefNote ? ` · ${briefNote}` : ''}</div>
    ${link}
    ${xSection}
  </div>`;
}

function buildPosturePopupHtml(p: MilitaryPosture, color: string): string {
  return `<div>
    <span style="font-family:monospace;font-size:9px;border:1px solid ${color};padding:1px 4px;color:${color}">POSTURE · ${escapeHtml(p.kind)}</span>
    <span style="font-family:monospace;font-size:9px;color:${color};margin-left:6px">${escapeHtml(PRECIPITATE_LABELS[p.precipitatePotential])}</span>
    <div style="font-weight:600;margin:4px 0">${escapeHtml(p.title)}</div>
    <div style="color:#8b9aab">${escapeHtml(p.summary)}</div>
    <div style="font-family:monospace;font-size:9px;color:#6b7c8f;margin-top:4px">Actors: ${escapeHtml(p.actors.join(', '))}</div>
    ${p.inResponseTo ? `<div style="font-family:monospace;font-size:9px;color:#6b7c8f">In response to: ${escapeHtml(p.inResponseTo)}</div>` : ''}
    <div style="font-family:monospace;font-size:9px;color:#6b7c8f;margin-top:2px">REL ${p.sourceReliability} · ${escapeHtml(p.source)} · ${ageLabel(p.observedAt)}</div>
  </div>`;
}

const RISK_EXPR = (key: 'fill' | 'ring'): maplibregl.ExpressionSpecification => [
  'match',
  ['get', 'risk'],
  'low',
  MARKER_RISK_COLORS.low[key],
  'medium',
  MARKER_RISK_COLORS.medium[key],
  'high',
  MARKER_RISK_COLORS.high[key],
  'critical',
  MARKER_RISK_COLORS.critical[key],
  MARKER_RISK_COLORS.medium[key],
];

const CIRCLE_OPACITY: maplibregl.ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['get', 'confidence'],
  0,
  0.72,
  1,
  0.98,
];

/** Gentle zoom scaling; radius stays small and crisp (Traceburst node scale). */
const zoomScaled = (prop: string): maplibregl.ExpressionSpecification => [
  'interpolate',
  ['linear'],
  ['zoom'],
  1,
  ['*', ['get', prop], 0.8],
  3,
  ['get', prop],
  6,
  ['*', ['get', prop], 1.25],
  10,
  ['*', ['get', prop], 1.6],
];

const CIRCLE_RADIUS = zoomScaled('baseRadius');
const HALO_RADIUS = zoomScaled('haloRadius');

const IS_POINT: maplibregl.FilterSpecification = ['!', ['has', 'point_count']];
const IS_CLUSTER: maplibregl.FilterSpecification = ['has', 'point_count'];

function eventsToFeatureCollection(events: SecurityEvent[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const e of events) {
    if (!isEventMapPlottable(e) || isDryRunXScroll(e) || isRawXScrollMarker(e)) continue;
    const lat = Number(e.lat);
    const lon = Number(e.lon);
    const risk = eventFalloutRisk(e);
    const r = markerRadius(e.severity, risk);
    features.push({
      type: 'Feature',
      id: e.id,
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: {
        id: e.id,
        risk,
        rank: RISK_RANK[risk],
        severity: e.severity,
        confidence: e.confidence,
        baseRadius: r,
        haloRadius: r + 4.5,
        title: e.title,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

function posturesToFeatureCollection(postures: MilitaryPosture[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const p of postures) {
    if (!isPostureMapPlottable(p)) continue;
    features.push({
      type: 'Feature',
      id: p.id,
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: {
        id: p.id,
        risk: p.precipitatePotential,
        icon: postureImageId((p.precipitatePotential as FalloutRisk) ?? 'medium'),
        confidence: p.confidence,
        title: p.title,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

export function SecurityMap({
  events,
  postures = [],
  showSupplyRoutes = true,
  resizeSignal = 0,
}: {
  events: SecurityEvent[];
  postures?: MilitaryPosture[];
  showSupplyRoutes?: boolean;
  /** Bump to force map.resize() (e.g. after a side-panel collapse transition). */
  resizeSignal?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const routesReady = useRef(false);
  const layersReady = useRef(false);
  const openPopupCount = useRef(0);
  const eventsByIdRef = useRef(new Map<string, SecurityEvent>());
  const posturesByIdRef = useRef(new Map<string, MilitaryPosture>());
  const activePopupRef = useRef<maplibregl.Popup | null>(null);

  const setLayersDimmed = (dimmed: boolean) => {
    const root = containerRef.current;
    if (root) root.classList.toggle('popup-open', dimmed);
    const map = mapRef.current;
    if (!map || !layersReady.current) return;
    if (map.getLayer('events-circle')) {
      map.setPaintProperty('events-circle', 'circle-opacity', dimmed ? 0.22 : CIRCLE_OPACITY);
      map.setPaintProperty('events-circle', 'circle-stroke-opacity', dimmed ? 0.2 : 0.9);
    }
    if (map.getLayer('events-halo')) {
      map.setPaintProperty('events-halo', 'circle-stroke-opacity', dimmed ? 0.1 : 0.5);
    }
    if (map.getLayer('events-cluster')) {
      map.setPaintProperty('events-cluster', 'circle-opacity', dimmed ? 0.25 : 0.92);
      map.setPaintProperty('events-cluster', 'circle-stroke-opacity', dimmed ? 0.2 : 0.95);
    }
    if (map.getLayer('events-cluster-count')) {
      map.setPaintProperty('events-cluster-count', 'text-opacity', dimmed ? 0.25 : 1);
    }
    if (map.getLayer('postures-symbol')) {
      map.setPaintProperty('postures-symbol', 'icon-opacity', dimmed ? 0.25 : 0.92);
    }
  };

  const onPopupOpen = () => {
    openPopupCount.current += 1;
    setLayersDimmed(true);
    requestAnimationFrame(() => {
      const pops = containerRef.current?.querySelectorAll('.maplibregl-popup');
      pops?.forEach((el, i) => {
        (el as HTMLElement).style.zIndex = String(20 + i);
      });
    });
  };

  const onPopupClose = () => {
    openPopupCount.current = Math.max(0, openPopupCount.current - 1);
    if (openPopupCount.current === 0) setLayersDimmed(false);
  };

  const closeActivePopup = () => {
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }
  };

  const ensureEventPostureLayers = (map: maplibregl.Map) => {
    if (layersReady.current) return;

    for (const risk of FALLOUT_LEVELS) {
      const id = postureImageId(risk);
      if (!map.hasImage(id)) {
        const img = makeTriangleImage(risk);
        map.addImage(id, { width: img.width, height: img.height, data: img.data }, { pixelRatio: img.pixelRatio });
      }
    }

    if (!map.getSource('events')) {
      map.addSource('events', {
        type: 'geojson',
        data: EMPTY_FC,
        cluster: true,
        clusterRadius: 22,
        clusterMaxZoom: 3,
        clusterProperties: { maxRank: ['max', ['get', 'rank']] },
      });
    }
    if (!map.getLayer('events-cluster')) {
      // Cluster = dark disc + thin ring tinted by the worst member; count in mono-ish label.
      map.addLayer({
        id: 'events-cluster',
        type: 'circle',
        source: 'events',
        filter: IS_CLUSTER,
        paint: {
          'circle-color': '#10151b',
          'circle-opacity': 0.92,
          'circle-radius': ['step', ['get', 'point_count'], 9, 4, 11, 10, 13.5, 25, 16],
          'circle-stroke-width': 1,
          'circle-stroke-color': [
            'match',
            ['get', 'maxRank'],
            3,
            ACCENT,
            2,
            MARKER_RISK_COLORS.high.ring,
            1,
            MARKER_RISK_COLORS.medium.ring,
            MARKER_RISK_COLORS.low.ring,
          ],
          'circle-stroke-opacity': 0.95,
        },
      });
    }
    if (!map.getLayer('events-cluster-count')) {
      map.addLayer({
        id: 'events-cluster-count',
        type: 'symbol',
        source: 'events',
        filter: IS_CLUSTER,
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10.5,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': ['match', ['get', 'maxRank'], 3, '#e0f2fe', '#cbd5e1'],
        },
      });
    }
    if (!map.getLayer('events-halo')) {
      // Critical only: a single crisp outer ring (no blur), Traceburst-style.
      map.addLayer({
        id: 'events-halo',
        type: 'circle',
        source: 'events',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'rank'], 3]],
        paint: {
          'circle-radius': HALO_RADIUS,
          'circle-color': ACCENT,
          'circle-opacity': 0.06,
          'circle-stroke-width': 0.8,
          'circle-stroke-color': ACCENT,
          'circle-stroke-opacity': 0.5,
        },
      });
    }
    if (!map.getLayer('events-circle')) {
      map.addLayer({
        id: 'events-circle',
        type: 'circle',
        source: 'events',
        filter: IS_POINT,
        layout: { 'circle-sort-key': ['get', 'rank'] },
        paint: {
          'circle-color': RISK_EXPR('fill'),
          'circle-radius': CIRCLE_RADIUS,
          'circle-opacity': CIRCLE_OPACITY,
          'circle-blur': 0,
          'circle-stroke-width': 0.8,
          'circle-stroke-color': RISK_EXPR('ring'),
          'circle-stroke-opacity': 0.9,
          'circle-pitch-alignment': 'map',
        },
      });
    }

    if (!map.getSource('postures')) {
      map.addSource('postures', { type: 'geojson', data: EMPTY_FC });
    }
    if (!map.getLayer('postures-symbol')) {
      map.addLayer({
        id: 'postures-symbol',
        type: 'symbol',
        source: 'postures',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.85, 4, 1, 8, 1.2],
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-opacity': 0.95,
        },
      });
    }

    map.on('click', 'events-cluster', async (e) => {
      const f = e.features?.[0];
      if (!f || f.geometry.type !== 'Point') return;
      const src = map.getSource('events') as maplibregl.GeoJSONSource;
      try {
        const zoom = await src.getClusterExpansionZoom(Number(f.properties?.cluster_id));
        map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: zoom + 0.2 });
      } catch {
        /* ignore */
      }
    });
    map.on('mouseenter', 'events-cluster', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'events-cluster', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('click', 'events-circle', (e) => {
      const f = e.features?.[0];
      if (!f || f.geometry.type !== 'Point') return;
      const id = String(f.properties?.id ?? '');
      const ev = eventsByIdRef.current.get(id);
      if (!ev) return;
      const risk = eventFalloutRisk(ev);
      const color = MARKER_RISK_COLORS[risk].ring;
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      closeActivePopup();
      const popup = new maplibregl.Popup({
        offset: 12,
        maxWidth: '340px',
        closeOnClick: true,
        className: 'gsp-event-popup',
      })
        .setLngLat(coords)
        .setHTML(buildEventPopupHtml(ev, risk, color))
        .addTo(map);
      popup.on('open', onPopupOpen);
      popup.on('close', () => {
        if (activePopupRef.current === popup) activePopupRef.current = null;
        onPopupClose();
      });
      activePopupRef.current = popup;
      requestAnimationFrame(() => {
        const popupEl = popup.getElement();
        if (popupEl) popupEl.style.zIndex = '30';
      });
    });

    map.on('click', 'postures-symbol', (e) => {
      const f = e.features?.[0];
      if (!f || f.geometry.type !== 'Point') return;
      const id = String(f.properties?.id ?? '');
      const p = posturesByIdRef.current.get(id);
      if (!p) return;
      const color = (MARKER_RISK_COLORS[p.precipitatePotential as FalloutRisk] ?? MARKER_RISK_COLORS.medium).ring;
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      closeActivePopup();
      const popup = new maplibregl.Popup({
        offset: 14,
        maxWidth: '320px',
        closeOnClick: true,
        className: 'gsp-event-popup',
      })
        .setLngLat(coords)
        .setHTML(buildPosturePopupHtml(p, color))
        .addTo(map);
      popup.on('open', onPopupOpen);
      popup.on('close', () => {
        if (activePopupRef.current === popup) activePopupRef.current = null;
        onPopupClose();
      });
      activePopupRef.current = popup;
      requestAnimationFrame(() => {
        const popupEl = popup.getElement();
        if (popupEl) popupEl.style.zIndex = '30';
      });
    });

    map.on('mouseenter', 'events-circle', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'events-circle', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'postures-symbol', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'postures-symbol', () => {
      map.getCanvas().style.cursor = '';
    });

    layersReady.current = true;
  };

  const pushEventsData = (map: maplibregl.Map, list: SecurityEvent[]) => {
    ensureEventPostureLayers(map);
    const byId = new Map<string, SecurityEvent>();
    for (const e of list) {
      if (!isEventMapPlottable(e) || isDryRunXScroll(e) || isRawXScrollMarker(e)) continue;
      byId.set(e.id, e);
    }
    eventsByIdRef.current = byId;
    const src = map.getSource('events') as maplibregl.GeoJSONSource | undefined;
    src?.setData(eventsToFeatureCollection(list));
  };

  const pushPosturesData = (map: maplibregl.Map, list: MilitaryPosture[]) => {
    ensureEventPostureLayers(map);
    const byId = new Map<string, MilitaryPosture>();
    for (const p of list) {
      if (!isPostureMapPlottable(p)) continue;
      byId.set(p.id, p);
    }
    posturesByIdRef.current = byId;
    const src = map.getSource('postures') as maplibregl.GeoJSONSource | undefined;
    src?.setData(posturesToFeatureCollection(list));
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [40, 18],
      zoom: 1.55,
      // Explicit HiDPI: render the GL canvas at the device pixel ratio so markers stay razor-sharp.
      pixelRatio: Math.max(1, window.devicePixelRatio || 1),
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('load', async () => {
      ensureEventPostureLayers(map);

      try {
        const res = await fetch(ROUTES_URL);
        const geojson = await res.json();
        if (!map.getSource('supply-routes')) {
          map.addSource('supply-routes', { type: 'geojson', data: geojson });
          map.addLayer(
            {
              id: 'supply-routes-glow',
              type: 'line',
              source: 'supply-routes',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: {
                'line-color': '#38bdf8',
                'line-width': 6,
                'line-opacity': 0.18,
              },
            },
            'events-cluster',
          );
          map.addLayer(
            {
              id: 'supply-routes-dash',
              type: 'line',
              source: 'supply-routes',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: {
                'line-color': [
                  'match',
                  ['get', 'kind'],
                  'oil-chokepoint',
                  ROUTE_KIND_COLORS['oil-chokepoint'],
                  'oil-route',
                  ROUTE_KIND_COLORS['oil-route'],
                  'trade-chokepoint',
                  ROUTE_KIND_COLORS['trade-chokepoint'],
                  'alt-route',
                  ROUTE_KIND_COLORS['alt-route'],
                  '#38bdf8',
                ],
                'line-width': 2.6,
                'line-opacity': 0.95,
                'line-dasharray': [1.2, 2.2],
              },
            },
            'events-cluster',
          );
          map.on('click', 'supply-routes-dash', (e) => {
            const f = e.features?.[0];
            if (!f || f.geometry.type !== 'LineString') return;
            const p = f.properties as { name?: string; note?: string; kind?: string };
            new maplibregl.Popup({ offset: 8, maxWidth: '260px' })
              .setLngLat(e.lngLat)
              .setHTML(
                `<div>
                  <div style="font-family:monospace;font-size:9px;color:#8b9aab">${escapeHtml(p.kind ?? 'route')}</div>
                  <div style="font-weight:600;margin:2px 0">${escapeHtml(p.name ?? 'Supply route')}</div>
                  <div style="color:#8b9aab">${escapeHtml(p.note ?? '')}</div>
                </div>`,
              )
              .addTo(map);
          });
          map.on('mouseenter', 'supply-routes-dash', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'supply-routes-dash', () => {
            map.getCanvas().style.cursor = '';
          });
        }
        routesReady.current = true;
        const vis = showSupplyRoutes ? 'visible' : 'none';
        if (map.getLayer('supply-routes-dash')) map.setLayoutProperty('supply-routes-dash', 'visibility', vis);
        if (map.getLayer('supply-routes-glow')) map.setLayoutProperty('supply-routes-glow', 'visibility', vis);
      } catch (err) {
        console.warn('supply routes load failed', err);
      }
    });

    return () => {
      closeActivePopup();
      map.remove();
      mapRef.current = null;
      routesReady.current = false;
      layersReady.current = false;
      openPopupCount.current = 0;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const vis = showSupplyRoutes ? 'visible' : 'none';
      if (map.getLayer('supply-routes-dash')) map.setLayoutProperty('supply-routes-dash', 'visibility', vis);
      if (map.getLayer('supply-routes-glow')) map.setLayoutProperty('supply-routes-glow', 'visibility', vis);
    };
    if (map.isStyleLoaded() && map.getLayer('supply-routes-dash')) apply();
    else map.once('idle', apply);
  }, [showSupplyRoutes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    openPopupCount.current = 0;
    setLayersDimmed(false);
    closeActivePopup();

    const apply = () => pushEventsData(map, events);
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [events]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => pushPosturesData(map, postures);
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [postures]);

  useEffect(() => {
    if (!resizeSignal) return;
    mapRef.current?.resize();
  }, [resizeSignal]);

  return <div ref={containerRef} className="map-el" />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
