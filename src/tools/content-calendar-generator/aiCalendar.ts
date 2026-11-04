import type { Adaptation, Calendar, CalendarConfig, Post, Slot } from './types.js';
import { AUDIENCES, BUSINESS_TYPES, GOALS, LANGUAGES, NICHES, PILLARS, PLATFORMS, POST_FORMATS, TONES } from './types.js';
import { isValidISODate, localTimezone, scheduleWindow } from './dateScheduler.js';

/**
 * Browser side of the generation: posts the strategy inputs (and nothing
 * else: no name, no email) to /api/generate-calendar and checks the calendar
 * that comes back. There is no canned calendar: when Gemini cannot answer,
 * the tool says so and offers a retry.
 */

export type CalendarFailure = 'rate_limited' | 'unavailable' | 'invalid' | 'network' | 'not_configured';
export type CalendarResult = { ok: true; calendar: Calendar; model: string } | { ok: false; error: CalendarFailure };
export type PostResult = { ok: true; post: Post } | { ok: false; error: CalendarFailure };

export const FAILURE_MESSAGES: Record<CalendarFailure, string> = {
  rate_limited: "We're experiencing high demand. Please try again in a moment.",
  unavailable: "We couldn't build your calendar just now. Please try again.",
  invalid: "The generated calendar didn't pass our quality checks. Please try again.",
  network: 'The request did not go through. Check your connection and try again.',
  // Dev names the fix; production users only see that it is unavailable.
  not_configured: import.meta.env.DEV
    ? 'Generation is not configured on this server: add GEMINI_API_KEY to .env and restart the dev server.'
    : 'Calendar generation is temporarily unavailable. Please try again later.',
};

const REQUEST_TIMEOUT_MS = 70_000;

export function isConfigComplete(c: CalendarConfig): boolean {
  return Boolean(c.businessType && c.niches.length && c.audiences.length && c.platforms.length && c.goals.length && c.duration && c.frequency && (!c.startDate || isValidISODate(c.startDate)));
}

function requestBody(config: CalendarConfig, variant: number, avoidTopics: string[]) {
  const window = scheduleWindow(config);
  return {
    businessType: config.businessType,
    niches: config.niches,
    audiences: config.audiences,
    platforms: config.platforms,
    goals: config.goals,
    duration: config.duration,
    frequency: config.frequency,
    tone: config.tone,
    formats: config.formats,
    offer: config.offer.trim().slice(0, 120),
    promotions: config.promotions.trim().slice(0, 120),
    instructions: config.instructions.trim().slice(0, 300),
    startDate: window.startDate,
    timezone: localTimezone(),
    language: config.language,
    variant,
    avoidTopics: avoidTopics.slice(0, 60),
  };
}

async function call(body: Record<string, unknown>): Promise<{ status: number; data: Record<string, unknown> | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('/api/generate-calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify(body) });
    const type = res.headers.get('content-type') ?? '';
    const data = type.includes('application/json') ? ((await res.json().catch(() => null)) as Record<string, unknown> | null) : null;
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

function failure(status: number, data: Record<string, unknown> | null): CalendarFailure {
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'not_configured';
  return data?.error === 'invalid' ? 'invalid' : 'unavailable';
}

export async function generateCalendar(config: CalendarConfig, variant = 0, avoidTopics: string[] = []): Promise<CalendarResult> {
  if (!isConfigComplete(config)) return { ok: false, error: 'invalid' };
  const r = await call({ mode: 'calendar', ...requestBody(config, variant, avoidTopics) });
  if (r.status === 0) return { ok: false, error: 'network' };
  if (r.status !== 200) return { ok: false, error: failure(r.status, r.data) };
  const calendar = checkCalendar(r.data?.calendar);
  if (!calendar) return { ok: false, error: 'invalid' };
  return { ok: true, calendar, model: typeof r.data?.model === 'string' ? r.data.model : '' };
}

/** Rewrites one post in place (same date, pillar, platform and format). */
export async function regeneratePost(config: CalendarConfig, slot: Slot, variant: number, avoidTopics: string[]): Promise<PostResult> {
  const r = await call({ mode: 'post', slot, ...requestBody(config, variant, avoidTopics) });
  if (r.status === 0) return { ok: false, error: 'network' };
  if (r.status !== 200) return { ok: false, error: failure(r.status, r.data) };
  const post = checkPost(r.data?.post);
  if (!post) return { ok: false, error: 'invalid' };
  return { ok: true, post };
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strs = (v: unknown, max: number, len: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((s) => s.trim().slice(0, len)).filter(Boolean).slice(0, max) : [];
const pick = <T extends string>(list: readonly T[], v: unknown): T | null => list.find((x) => x === v) ?? null;

function checkAdaptation(v: unknown): Adaptation | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const platform = pick(PLATFORMS, o.platform);
  const caption = str(o.caption, 2500);
  if (!platform || caption.length < 10) return null;
  return { platform, format: pick(POST_FORMATS, o.format) ?? 'Static Image', hook: str(o.hook, 300), caption };
}

export function checkPost(v: unknown): Post | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const id = str(o.id, 20);
  const date = str(o.date, 10);
  const pillar = pick(PILLARS, o.pillar);
  const format = pick(POST_FORMATS, o.format);
  const platforms = strs(o.platforms, 4, 20).map((p) => pick(PLATFORMS, p)).filter((p): p is NonNullable<typeof p> => p !== null);
  const topic = str(o.topic, 160);
  const hook = str(o.hook, 300);
  const caption = str(o.caption, 2500);
  if (!/^post_\d{3}$/.test(id) || !isValidISODate(date) || !pillar || !format || !platforms.length || topic.length < 3 || hook.length < 3 || caption.length < 20) return null;
  return {
    id,
    date,
    day: str(o.day, 10),
    platforms,
    pillar,
    format,
    topic,
    hook,
    caption,
    creativeDirection: str(o.creativeDirection, 700),
    cta: str(o.cta, 200),
    hashtags: strs(o.hashtags, 12, 40),
    productionNotes: str(o.productionNotes, 400),
    status: 'draft',
    adaptations: (Array.isArray(o.adaptations) ? o.adaptations : []).map(checkAdaptation).filter((a): a is Adaptation => a !== null),
  };
}

/** Structural check of the route's answer, so a malformed payload can never reach the modal or the exports. */
export function checkCalendar(v: unknown): Calendar | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const businessType = pick(BUSINESS_TYPES, o.businessType);
  const s = (o.contentStrategy ?? {}) as Record<string, unknown>;
  const primaryGoal = pick(GOALS, s.primaryGoal);
  const posts = (Array.isArray(o.posts) ? o.posts : []).map(checkPost).filter((p): p is Post => p !== null);
  const ids = new Set(posts.map((p) => p.id));
  if (!businessType || !primaryGoal || posts.length === 0 || ids.size !== posts.length || !isValidISODate(str(o.startDate, 10)) || !isValidISODate(str(o.endDate, 10))) return null;
  const pillars = (Array.isArray(s.contentPillars) ? s.contentPillars : [])
    .map((p) => {
      const x = (p ?? {}) as Record<string, unknown>;
      const name = pick(PILLARS, x.name);
      return name ? { name, targetPercentage: Number(x.targetPercentage) || 0, plannedPosts: Number(x.plannedPosts) || 0 } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
  return {
    calendarTitle: str(o.calendarTitle, 80) || 'Fitness Content Calendar',
    businessType,
    niches: strs(o.niches, 6, 40).map((n) => pick(NICHES, n)).filter((n): n is NonNullable<typeof n> => n !== null),
    durationDays: Number(o.durationDays) || posts.length,
    postsPerWeek: Number(o.postsPerWeek) || 0,
    startDate: str(o.startDate, 10),
    endDate: str(o.endDate, 10),
    timezone: str(o.timezone, 64),
    language: pick(LANGUAGES, o.language) ?? 'English',
    tone: pick(TONES, o.tone),
    contentStrategy: {
      primaryGoal,
      goals: strs(s.goals, 4, 40).map((g) => pick(GOALS, g)).filter((g): g is NonNullable<typeof g> => g !== null),
      targetAudience: strs(s.targetAudience, 4, 40).map((a) => pick(AUDIENCES, a)).filter((a): a is NonNullable<typeof a> => a !== null),
      platforms: strs(s.platforms, 4, 20).map((p) => pick(PLATFORMS, p)).filter((p): p is NonNullable<typeof p> => p !== null),
      contentPillars: pillars,
      summary: str(s.summary, 700),
    },
    posts,
    unfilled: Math.max(0, Number(o.unfilled) || 0),
  };
}
