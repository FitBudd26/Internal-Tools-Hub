import type { CalendarConfig, Frequency } from './types.js';
import { DURATION_DAYS, FREQUENCY_POSTS } from './types.js';

/**
 * Pure date maths for the calendar. Everything works on local calendar dates
 * written as YYYY-MM-DD (never UTC timestamps), so a post planned for
 * "Monday" is a Monday wherever the user is. The model never computes dates:
 * the scheduler decides the publishing days first and the model fills them.
 */

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD of a Date. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** YYYY-MM-DD → local Date at noon (so DST changes never shift the day). */
export function parseISODate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`bad date ${iso}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = parseISODate(iso);
  return toISODate(d) === iso;
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function todayISO(now = new Date()): string {
  return toISODate(now);
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[parseISODate(iso).getDay()];
}

/** "Monday, November 9" */
export function longDate(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Nov 9" */
export function shortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/** "Nov 9 - Dec 8, 2026" */
export function dateRange(startIso: string, endIso: string): string {
  const a = parseISODate(startIso);
  const b = parseISODate(endIso);
  const sameYear = a.getFullYear() === b.getFullYear();
  return `${MONTHS[a.getMonth()].slice(0, 3)} ${a.getDate()}${sameYear ? '' : `, ${a.getFullYear()}`} - ${MONTHS[b.getMonth()].slice(0, 3)} ${b.getDate()}, ${b.getFullYear()}`;
}

/** Which weekdays carry a post for each frequency (0 = Sunday). */
export const POSTING_DAYS: Record<Frequency, readonly number[]> = {
  '3 Posts Per Week': [1, 3, 5],
  '4 Posts Per Week': [1, 2, 4, 5],
  '5 Posts Per Week': [1, 2, 3, 4, 5],
  Daily: [0, 1, 2, 3, 4, 5, 6],
};

/** The publishing dates inside the window, following the frequency's weekday pattern (partial weeks included). */
export function publishingDates(startIso: string, durationDays: number, frequency: Frequency): string[] {
  const days = POSTING_DAYS[frequency];
  const out: string[] = [];
  for (let i = 0; i < durationDays; i++) {
    const iso = addDays(startIso, i);
    if (days.includes(parseISODate(iso).getDay())) out.push(iso);
  }
  return out;
}

export interface ScheduleWindow {
  startDate: string;
  endDate: string;
  durationDays: number;
  postsPerWeek: number;
  dates: string[];
}

/** The window and dates for a configuration (start date defaults to today in the user's local calendar). */
export function scheduleWindow(c: Pick<CalendarConfig, 'duration' | 'frequency' | 'startDate'>, now = new Date()): ScheduleWindow {
  const startDate = c.startDate && isValidISODate(c.startDate) ? c.startDate : todayISO(now);
  const durationDays = DURATION_DAYS[c.duration];
  return {
    startDate,
    endDate: addDays(startDate, durationDays - 1),
    durationDays,
    postsPerWeek: FREQUENCY_POSTS[c.frequency],
    dates: publishingDates(startDate, durationDays, c.frequency),
  };
}

/** The IANA time zone of this browser (for the prompt's context only). */
export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Weeks (Monday to Sunday) covering the window, for the calendar grid; days outside the window are null. */
export function gridWeeks(startIso: string, endIso: string): (string | null)[][] {
  const start = parseISODate(startIso);
  const lead = (start.getDay() + 6) % 7; // days since Monday
  let cursor = addDays(startIso, -lead);
  const weeks: (string | null)[][] = [];
  while (cursor <= endIso) {
    const week: (string | null)[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor >= startIso && cursor <= endIso ? cursor : null);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}
