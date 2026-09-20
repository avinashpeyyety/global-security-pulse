import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { MilitaryPosture, PrecipitatePotential, SecurityEvent } from '@gsp/shared';
import { PRECIPITATE_LABELS } from '@gsp/shared';
import { ageLabel } from '../lib/time';

const STYLE = 'https://tiles.openfreemap.org/styles/dark';
const ROUTES_URL = '/data/supply-routes.json';

const LAYER_COLOR: Record<string, string> = {
  conflict: '#ff6b6b',
  cyber: '#c084fc',
  maritime: '#38bdf8',
  sanctions: '#f0c14b',
  terrorism: '#fb7185',
  unrest: '#fb923c',
  disaster: '#94a3b8',
};

function markerRadius(severity: number, confidence: number): number {
  return 4 + severity * 2.2 + confidence * 2;
}

const PRECIP_COLOR: Record<PrecipitatePotential, string> = {
  low: '#34d399',
  medium: '#fbbf24',
  high: '#fb923c',
  critical: '#ef4444',
};

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
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const postureMarkersRef = useRef<maplibregl.Marker[]>([]);
  const routesReady = useRef(false);

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
      try {
        const res = await fetch(ROUTES_URL);
        const geojson = await res.json();
        if (!map.getSource('supply-routes')) {
          map.addSource('supply-routes', { type: 'geojson', data: geojson });
          map.addLayer({
            id: 'supply-routes-glow',
            type: 'line',
            source: 'supply-routes',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#38bdf8',
              'line-width': 6,
              'line-opacity': 0.18,
            },
          });
          map.addLayer({
            id: 'supply-routes-dash',
            type: 'line',
            source: 'supply-routes',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': [
                'match',
                ['get', 'kind'],
                'oil-chokepoint',
                '#fbbf24',
                'oil-route',
                '#f59e0b',
                'alt-route',
                '#34d399',
                '#38bdf8',
              ],
              'line-width': 2.6,
              'line-opacity': 0.95,
              'line-dasharray': [1.2, 2.2],
            },
          });
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
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      postureMarkersRef.current.forEach((m) => m.remove());
      postureMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      routesReady.current = false;
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

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const e of events) {
      const el = document.createElement('div');
      const r = markerRadius(e.severity, e.confidence);
      el.style.width = `${r * 2}px`;
      el.style.height = `${r * 2}px`;
      el.style.borderRadius = '50%';
      el.style.background = LAYER_COLOR[e.layer] ?? '#5b9fd4';
      el.style.border = '1px solid rgba(255,255,255,0.35)';
      el.style.opacity = String(0.55 + e.confidence * 0.4);
      el.style.cursor = 'pointer';
      el.title = e.title;

      const popup = new maplibregl.Popup({ offset: 12, maxWidth: '280px' }).setHTML(
        `<div>
          <span style="font-family:monospace;font-size:9px;border:1px solid #2a343f;padding:1px 4px;color:#8b9aab">REL ${e.sourceReliability}</span>
          <span style="font-family:monospace;font-size:9px;color:#8b9aab;margin-left:6px">${e.layer} · sev ${e.severity} · ${ageLabel(e.observedAt)}</span>
          <div style="font-weight:600;margin:4px 0">${escapeHtml(e.title)}</div>
          <div style="color:#8b9aab">${escapeHtml(e.summary)}</div>
          <div style="font-family:monospace;font-size:9px;color:#6b7c8f;margin-top:4px">${escapeHtml(e.source)}</div>
        </div>`,
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([e.lon, e.lat])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [events]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    postureMarkersRef.current.forEach((m) => m.remove());
    postureMarkersRef.current = [];

    for (const p of postures) {
      const el = document.createElement('div');
      el.className = 'posture-marker';
      const color = PRECIP_COLOR[p.precipitatePotential] ?? '#fbbf24';
      el.style.width = '0';
      el.style.height = '0';
      el.style.borderLeft = '8px solid transparent';
      el.style.borderRight = '8px solid transparent';
      el.style.borderBottom = `14px solid ${color}`;
      el.style.filter = 'drop-shadow(0 0 3px rgba(0,0,0,0.8))';
      el.style.cursor = 'pointer';
      el.style.opacity = String(0.75 + p.confidence * 0.25);
      el.title = `[POSTURE] ${p.title}`;

      const popup = new maplibregl.Popup({ offset: 14, maxWidth: '300px' }).setHTML(
        `<div>
          <span style="font-family:monospace;font-size:9px;border:1px solid #fbbf24;padding:1px 4px;color:#fbbf24">POSTURE · ${escapeHtml(p.kind)}</span>
          <span style="font-family:monospace;font-size:9px;color:${color};margin-left:6px">${escapeHtml(PRECIPITATE_LABELS[p.precipitatePotential])}</span>
          <div style="font-weight:600;margin:4px 0">${escapeHtml(p.title)}</div>
          <div style="color:#8b9aab">${escapeHtml(p.summary)}</div>
          <div style="font-family:monospace;font-size:9px;color:#6b7c8f;margin-top:4px">Actors: ${escapeHtml(p.actors.join(', '))}</div>
          ${p.inResponseTo ? `<div style="font-family:monospace;font-size:9px;color:#6b7c8f">In response to: ${escapeHtml(p.inResponseTo)}</div>` : ''}
          <div style="font-family:monospace;font-size:9px;color:#6b7c8f;margin-top:2px">REL ${p.sourceReliability} · ${escapeHtml(p.source)} · ${ageLabel(p.observedAt)}</div>
        </div>`,
      );

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([p.lon, p.lat])
        .setPopup(popup)
        .addTo(map);
      postureMarkersRef.current.push(marker);
    }
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
