import type { TimeWindow } from '../lib/time';

const WINDOWS: TimeWindow[] = ['6h', '24h', '7d', '30d'];

export function TimeScrubber({
  value,
  onChange,
}: {
  value: TimeWindow;
  onChange: (w: TimeWindow) => void;
}) {
  return (
    <>
      {WINDOWS.map((w) => (
        <button
          key={w}
          type="button"
          className={w === value ? 'active' : ''}
          onClick={() => onChange(w)}
        >
          {w}
        </button>
      ))}
    </>
  );
}
