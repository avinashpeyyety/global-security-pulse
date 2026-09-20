import type { EventLayer } from '@gsp/shared';
import {
  FALLOUT_LEVELS,
  FALLOUT_LABELS,
  RISK_COLORS,
  ROUTE_KIND_COLORS,
  ROUTE_KIND_LABELS,
} from '@gsp/shared';

const ROUTE_KINDS = Object.keys(ROUTE_KIND_LABELS);

export function LayerToggles({
  layers,
  labels,
  active,
  onToggle,
  showSupplyRoutes,
  onToggleSupply,
  showPosture,
  onTogglePosture,
}: {
  layers: EventLayer[];
  labels: Record<EventLayer, string>;
  active: Set<EventLayer>;
  onToggle: (layer: EventLayer) => void;
  showSupplyRoutes: boolean;
  onToggleSupply: () => void;
  showPosture: boolean;
  onTogglePosture: () => void;
}) {
  return (
    <div className="legend-panel">
      <div className="legend-title">Layers · Legend</div>

      <div className="legend-section">
        <div className="legend-section-lbl">Security events · circles</div>
        {layers.map((layer) => (
          <label key={layer} className="legend-row">
            <input
              type="checkbox"
              checked={active.has(layer)}
              onChange={() => onToggle(layer)}
            />
            <span className="swatch swatch-circle" aria-hidden />
            <span className="legend-label">{labels[layer]}</span>
          </label>
        ))}
      </div>

      <div className="legend-section">
        <div className="legend-section-lbl">Military posture · triangles</div>
        <label className="legend-row">
          <input type="checkbox" checked={showPosture} onChange={onTogglePosture} />
          <span className="swatch swatch-triangle" aria-hidden />
          <span className="legend-label">Military posture</span>
        </label>
      </div>

      <div className="legend-section">
        <div className="legend-section-lbl">Supply routes · dotted</div>
        <label className="legend-row">
          <input type="checkbox" checked={showSupplyRoutes} onChange={onToggleSupply} />
          <span className="swatch swatch-dash" aria-hidden />
          <span className="legend-label">Supply routes</span>
        </label>
        <div className="route-kinds">
          {ROUTE_KINDS.map((kind) => (
            <div key={kind} className="legend-row legend-row-static">
              <span
                className="swatch swatch-dash"
                style={{ borderColor: ROUTE_KIND_COLORS[kind], backgroundImage: `repeating-linear-gradient(90deg, ${ROUTE_KIND_COLORS[kind]} 0 4px, transparent 4px 7px)` }}
                aria-hidden
              />
              <span className="legend-label">{ROUTE_KIND_LABELS[kind]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="legend-section">
        <div className="legend-section-lbl">Fallout / precipitate risk</div>
        <div className="risk-scale" role="img" aria-label="Risk scale from low to critical">
          {FALLOUT_LEVELS.map((level) => (
            <div key={level} className="risk-step">
              <span className="risk-swatch" style={{ background: RISK_COLORS[level] }} />
              <span className="risk-lbl">{level}</span>
            </div>
          ))}
        </div>
        <div className="risk-hint">
          Circles = event fallout · Triangles = posture precipitate · {FALLOUT_LABELS.low} → {FALLOUT_LABELS.critical}
        </div>
        <div className="risk-hint" style={{ marginTop: 6 }}>
          Popup briefs are agent/wire curated · X posts are supporting evidence (collapsible)
        </div>
      </div>
    </div>
  );
}
