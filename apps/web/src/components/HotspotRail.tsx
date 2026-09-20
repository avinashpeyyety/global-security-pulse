import type { Hotspot } from '@gsp/shared';
import { ageLabel } from '../lib/time';

export function HotspotRail({ hotspots }: { hotspots: Hotspot[] }) {
  return (
    <aside className="rail">
      <h2>Hotspots · exception-first</h2>
      <div className="rail-table">
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th className="num">N</th>
              <th className="num">Max</th>
              <th>Fresh</th>
            </tr>
          </thead>
          <tbody>
            {hotspots.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: 'var(--muted)' }}>
                  No events in window/layers
                </td>
              </tr>
            )}
            {hotspots.map((h) => (
              <tr key={h.region}>
                <td>
                  {h.region}
                  <div style={{ color: 'var(--muted)', fontSize: 9 }}>
                    {h.layers.join(', ')}
                  </div>
                </td>
                <td className="num">{h.count}</td>
                <td className={`num sev sev-${h.maxSeverity}`}>{h.maxSeverity}</td>
                <td>
                  {ageLabel(h.freshestAt)}
                  <div style={{ color: 'var(--muted)', fontSize: 9 }}>
                    {h.freshestSource}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
