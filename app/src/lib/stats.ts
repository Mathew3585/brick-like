import type { SessionRecord } from './data';

const DAY = 86_400_000;

export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Monday 00:00 of the week containing `t`. */
export const startOfWeek = (t: number) => {
  const d = new Date(startOfDay(t));
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d.getTime();
};

/** Seconds of focus between two instants, cutting sessions that straddle the edges. */
export function focusBetween(history: SessionRecord[], from: number, to: number) {
  let ms = 0;
  for (const s of history) {
    const a = Math.max(s.startedAt, from);
    const b = Math.min(s.endedAt, to);
    if (b > a) ms += b - a;
  }
  return Math.floor(ms / 1000);
}

export type DayBar = { label: string; seconds: number; state: 'past' | 'today' | 'future' };

export function weekBars(history: SessionRecord[], now = Date.now()): DayBar[] {
  const monday = startOfWeek(now);
  const today = startOfDay(now);
  return ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, i) => {
    const from = monday + i * DAY;
    const state = from < today ? 'past' : from === today ? 'today' : 'future';
    return { label, seconds: state === 'future' ? 0 : focusBetween(history, from, from + DAY), state };
  });
}

/** Days in a row with at least one session closed at the Socle (today counts once it has one). */
export function streak(history: SessionRecord[], now = Date.now()) {
  const days = new Set(history.filter((s) => s.how === 'socle').map((s) => startOfDay(s.endedAt)));
  let day = startOfDay(now);
  if (!days.has(day)) day -= DAY;
  let n = 0;
  while (days.has(day)) {
    n++;
    day -= DAY;
  }
  return n;
}

export function topAttempts(history: SessionRecord[], from: number) {
  const totals = new Map<string, number>();
  for (const s of history) {
    if (s.endedAt < from) continue;
    for (const [pkg, n] of Object.entries(s.attempts)) totals.set(pkg, (totals.get(pkg) ?? 0) + n);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}
