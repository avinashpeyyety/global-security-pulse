/** GSP daily data-inject cadence (America/Chicago). */

export const GSP_TZ = 'America/Chicago';

/** Local wall-clock inject times on every day. */
export const GSP_DAILY_SLOTS: ReadonlyArray<{ hour: number; minute: number }> = [
  { hour: 8, minute: 20 },
  { hour: 13, minute: 20 },
  { hour: 18, minute: 20 },
];

export interface DataUpdateMeta {
  updatedAt: string;
  updatedAtLabel: string;
  nextUpdateAt: string;
  nextUpdateHint: string;
  timezone: typeof GSP_TZ;
  schedule: {
    daily: string[];
    weekendPolicy: string;
  };
}

/** @deprecated Use GSP_DAILY_SLOTS. */
export const GSP_WEEKDAY_SLOTS = GSP_DAILY_SLOTS;

function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    weekday: parts.weekday,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Convert a Chicago wall-clock datetime to a UTC Date. */
export function chicagoWallToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const asChicago = zonedParts(new Date(utcGuess), GSP_TZ);
  const wantMin = hour * 60 + minute;
  const gotMin = asChicago.hour * 60 + asChicago.minute;
  let adjusted = utcGuess + (wantMin - gotMin) * 60_000;
  // Fix day drift across DST edges
  const check = zonedParts(new Date(adjusted), GSP_TZ);
  if (check.day !== day || check.month !== month || check.year !== year) {
    const dayDelta =
      Date.UTC(year, month - 1, day) - Date.UTC(check.year, check.month - 1, check.day);
    adjusted += dayDelta;
  }
  // Second pass for DST
  const again = zonedParts(new Date(adjusted), GSP_TZ);
  const got2 = again.hour * 60 + again.minute;
  adjusted += (wantMin - got2) * 60_000;
  return new Date(adjusted);
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): { year: number; month: number; day: number } {
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}


/**
 * Next scheduled inject from `from` (default now).
 * Every day: 8:20 / 13:20 / 18:20 CT.
 */
export function computeNextUpdate(from: Date = new Date()): Date {
  const p = zonedParts(from, GSP_TZ);
  const nowMin = p.hour * 60 + p.minute;

  for (const slot of GSP_DAILY_SLOTS) {
    const slotMin = slot.hour * 60 + slot.minute;
    if (slotMin > nowMin) {
      return chicagoWallToUtc(p.year, p.month, p.day, slot.hour, slot.minute);
    }
  }

  // Past last slot — roll to tomorrow 8:20, including weekends.
  const d = addCalendarDays(p.year, p.month, p.day, 1);
  return chicagoWallToUtc(d.year, d.month, d.day, 8, 20);
}

/** e.g. "Updated 3:20 PM CT Sep 20" */
export function formatUpdatedAtLabel(iso: string, timeZone: string = GSP_TZ): string {
  const d = new Date(iso);
  const time = d.toLocaleString('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const md = d.toLocaleString('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
  });
  return `Updated ${time} CT ${md}`;
}

/** e.g. "Next update ~1:20 PM CT" (adds weekday if not today in CT) */
export function formatNextUpdateHint(next: Date, from: Date = new Date(), timeZone: string = GSP_TZ): string {
  const time = next.toLocaleString('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const nextParts = zonedParts(next, timeZone);
  const fromParts = zonedParts(from, timeZone);
  const sameDay =
    nextParts.year === fromParts.year &&
    nextParts.month === fromParts.month &&
    nextParts.day === fromParts.day;
  if (sameDay) return `Next update ~${time} CT`;
  return `Next update ~${time} CT ${nextParts.weekday}`;
}

export function buildDataUpdateMeta(updatedAt: Date = new Date()): DataUpdateMeta {
  const next = computeNextUpdate(updatedAt);
  return {
    updatedAt: updatedAt.toISOString(),
    updatedAtLabel: formatUpdatedAtLabel(updatedAt.toISOString()),
    nextUpdateAt: next.toISOString(),
    nextUpdateHint: formatNextUpdateHint(next, updatedAt),
    timezone: GSP_TZ,
    schedule: {
      daily: GSP_DAILY_SLOTS.map(
        (s) => `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`,
      ),
      weekendPolicy: 'daily',
    },
  };
}
