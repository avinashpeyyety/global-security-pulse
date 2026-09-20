import type { EventLayer } from '@gsp/shared';

export function LayerToggles({
  layers,
  labels,
  active,
  onToggle,
}: {
  layers: EventLayer[];
  labels: Record<EventLayer, string>;
  active: Set<EventLayer>;
  onToggle: (layer: EventLayer) => void;
}) {
  return (
    <>
      {layers.map((layer) => (
        <label key={layer}>
          <input
            type="checkbox"
            checked={active.has(layer)}
            onChange={() => onToggle(layer)}
          />
          {labels[layer]}
        </label>
      ))}
    </>
  );
}
