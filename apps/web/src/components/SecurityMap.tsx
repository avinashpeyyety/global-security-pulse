import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { FalloutRisk, MilitaryPosture, SecurityEvent, XPostRef } from '@gsp/shared';
import {
  PRECIPITATE_LABELS,
  RISK_COLORS,
  ROUTE_KIND_COLORS,
  eventFalloutRisk,
  FALLOUT_LABELS,
} from '@gsp/shared';
import { ageLabel } from '../lib/time';
import { isEventMapPlottable, isPostureMapPlottable } from '../lib/mapCoords';

const STYLE = 'https://tiles.openfreemap.org/styles/dark';
const ROUTES_URL = `${import.meta.env.BASE_URL}data/supply-routes.json`;

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

function markerRadius(severity: number, confidence: number): number {
  return 4 + severity * 2.2 + confidence * 2;
}

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

/** White triangle SDF for icon-color tinting. */
function makeTriangleImageData(size = 32): { data: Uint8Array; width: number; height: number } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.moveTo(size / 2, 1);
  ctx.lineTo(size - 1, size - 1);
  ctx.lineTo(1, size - 1);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  const imageData = ctx.getImageData(0, 0, size, size);
  return { data: new Uint8Array(imageData.data.buffer), width: size, height: size };
}

const CIRCLE_COLOR: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'risk'],
  'low',
  RISK_COLORS.low,
  'medium',
  RISK_COLORS.medium,
  'high',
  RISK_COLORS.high,
  'critical',
  RISK_COLORS.critical,
  RISK_COLORS.medium,
];

const CIRCLE_OPACITY: maplibregl.ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['get', 'confidence'],
  0,
  0.55,
  1,
  0.95,
];

const CIRCLE_RADIUS: maplibregl.ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  1,
  ['*', ['get', 'baseRadius'], 0.55],
  3,
  ['get', 'baseRadius'],
  6,
  ['*', ['get', 'baseRadius'], 1.35],
  10,
  ['*', ['get', 'baseRadius'], 1.9],
];

const ICON_COLOR: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'risk'],
  'low',
  RISK_COLORS.low,
  'medium',
  RISK_COLORS.medium,
  'high',
  RISK_COLORS.high,
  'critical',
  RISK_COLORS.critical,
  RISK_COLORS.medium,
];

function eventsToFeatureCollection(events: SecurityEvent[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const e of events) {
    if (!isEventMapPlottable(e) || isDryRunXScroll(e) || isRawXScrollMarker(e)) continue;
    const lat = Number(e.lat);
    const lon = Number(e.lon);
    const risk = eventFalloutRisk(e);
    features.push({
      type: 'Feature',
      id: e.id,
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: {
        id: e.id,
        risk,
        severity: e.severity,
        confidence: e.confidence,
        baseRadius: markerRadius(e.severity, e.confidence),
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
}: {
  events: SecurityEvent[];
  postures?: MilitaryPosture[];
  showSupplyRoutes?: boolean;
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
      map.setPaintProperty('events-circle', 'circle-stroke-opacity', dimmed ? 0.2 : 0.85);
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

    if (!map.hasImage('posture-triangle')) {
      const img = makeTriangleImageData(32);
      map.addImage('posture-triangle', img, { sdf: true });
    }

    if (!map.getSource('events')) {
      map.addSource('events', { type: 'geojson', data: EMPTY_FC });
    }
    if (!map.getLayer('events-circle')) {
      map.addLayer({
        id: 'events-circle',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-color': CIRCLE_COLOR,
          'circle-radius': CIRCLE_RADIUS,
          'circle-opacity': CIRCLE_OPACITY,
          'circle-stroke-width': 1.2,
          'circle-stroke-color': 'rgba(255,255,255,0.45)',
          'circle-stroke-opacity': 0.85,
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
          'icon-image': 'posture-triangle',
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1,
            0.45,
            3,
            0.65,
            6,
            0.9,
            10,
            1.15,
          ],
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-color': ICON_COLOR,
          'icon-opacity': 0.92,
          'icon-halo-color': 'rgba(0,0,0,0.75)',
          'icon-halo-width': 1.2,
        },
      });
    }

    map.on('click', 'events-circle', (e) => {
      const f = e.features?.[0];
      if (!f || f.geometry.type !== 'Point') return;
      const id = String(f.properties?.id ?? '');
      const ev = eventsByIdRef.current.get(id);
      if (!ev) return;
      const risk = eventFalloutRisk(ev);
      const color = RISK_COLORS[risk];
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
      const color = RISK_COLORS[p.precipitatePotential as FalloutRisk] ?? RISK_COLORS.medium;
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
            'events-circle',
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
            'events-circle',
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
