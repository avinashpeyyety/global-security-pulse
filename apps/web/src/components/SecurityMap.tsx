import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { SecurityEvent } from '@gsp/shared';
import { ageLabel } from '../lib/time';

const STYLE = 'https://tiles.openfreemap.org/styles/dark';

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

export function SecurityMap({ events }: { events: SecurityEvent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [20, 20],
      zoom: 1.4,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

  return <div ref={containerRef} className="map-el" />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
