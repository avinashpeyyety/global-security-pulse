/** GSP daily data-inject cadence (America/Chicago). Mirrors packages/shared/src/schedule.ts */

export const GSP_TZ = 'America/Chicago';
export const GSP_DAILY_SLOTS = [
  { hour: 8, minute: 20 },
  { hour: 13, minute: 20 },
  { hour: 18, minute: 20 },
];

/** @deprecated Use GSP_DAILY_SLOTS. */
export const GSP_WEEKDAY_SLOTS = GSP_DAILY_SLOTS;

function zonedParts(date, timeZone) {
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
  );
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

export function chicagoWallToUtc(year, month, day, hour, minute) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const asChicago = zonedParts(new Date(utcGuess), GSP_TZ);
  const wantMin = hour * 60 + minute;
  const gotMin = asChicago.hour * 60 + asChicago.minute;
  let adjusted = utcGuess + (wantMin - gotMin) * 60_000;
  const check = zonedParts(new Date(adjusted), GSP_TZ);
  if (check.day !== day || check.month !== month || check.year !== year) {
    const dayDelta =
      Date.UTC(year, month - 1, day) - Date.UTC(check.year, check.month - 1, check.day);
    adjusted += dayDelta;
  }
  const again = zonedParts(new Date(adjusted), GSP_TZ);
  const got2 = again.hour * 60 + again.minute;
  adjusted += (wantMin - got2) * 60_000;
  return new Date(adjusted);
}

function addCalendarDays(year, month, day, delta) {
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}


export function computeNextUpdate(from = new Date()) {
  const p = zonedParts(from, GSP_TZ);
  const nowMin = p.hour * 60 + p.minute;

  for (const slot of GSP_DAILY_SLOTS) {
    const slotMin = slot.hour * 60 + slot.minute;
    if (slotMin > nowMin) {
      return chicagoWallToUtc(p.year, p.month, p.day, slot.hour, slot.minute);
    }
  }

  const d = addCalendarDays(p.year, p.month, p.day, 1);
  return chicagoWallToUtc(d.year, d.month, d.day, 8, 20);
}

export function formatUpdatedAtLabel(iso, timeZone = GSP_TZ) {
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

export function formatNextUpdateHint(next, from = new Date(), timeZone = GSP_TZ) {
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

export function buildDataUpdateMeta(updatedAt = new Date()) {
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
