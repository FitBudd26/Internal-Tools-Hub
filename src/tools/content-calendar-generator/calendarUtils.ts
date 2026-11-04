import type { Calendar, Platform, Post, Slot } from './types.js';
import { ANGLES } from './contentStrategy.js';
import { isValidISODate, longDate, weekdayName } from './dateScheduler.js';

/** Pure helpers over the calendar object. The grid, the list, the editor and every export use the same object. */

export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));
}

export function updatePost(c: Calendar, id: string, patch: Partial<Post>): Calendar {
  return { ...c, posts: sortPosts(c.posts.map((p) => (p.id === id ? normalizePost({ ...p, ...patch }) : p))) };
}

export function replacePost(c: Calendar, next: Post): Calendar {
  return { ...c, posts: sortPosts(c.posts.map((p) => (p.id === next.id ? normalizePost(next) : p))) };
}

/** Keeps a post internally consistent after an edit (weekday follows the date; text trimmed). */
export function normalizePost(p: Post): Post {
  const date = isValidISODate(p.date) ? p.date : p.date;
  return {
    ...p,
    date,
    day: isValidISODate(date) ? weekdayName(date) : p.day,
    topic: p.topic.trim(),
    hook: p.hook.trim(),
    caption: p.caption.trim(),
    creativeDirection: p.creativeDirection.trim(),
    cta: p.cta.trim(),
  };
}

/** Why an edited post cannot be saved, or null when it can. */
export function postProblem(p: Pick<Post, 'topic' | 'hook' | 'caption' | 'date'>): string | null {
  if (p.topic.trim().length < 5) return 'Write the topic first (at least 5 characters).';
  if (p.hook.trim().length < 5) return 'The hook needs at least 5 characters.';
  if (p.caption.trim().length < 20) return 'The caption needs at least 20 characters.';
  if (!isValidISODate(p.date)) return 'Pick a valid publishing date.';
  return null;
}

/** The slot to send when one post is rewritten: same date, pillar, platform and format, a fresh angle. */
export function slotFromPost(p: Post, variant: number): Slot {
  const angles = ANGLES[p.pillar];
  return {
    id: p.id,
    date: p.date,
    day: p.day,
    pillar: p.pillar,
    angle: angles[(variant + 1) % angles.length],
    platform: p.platforms[0],
    format: p.format,
    adaptFor: p.platforms.slice(1),
  };
}

export function platformsInUse(c: Calendar): Platform[] {
  const seen = new Set<Platform>();
  for (const p of c.posts) for (const x of p.platforms) seen.add(x);
  return c.contentStrategy.platforms.filter((p) => seen.has(p));
}

/** "22 Planned Posts · Instagram + Facebook" */
export function summaryLine(c: Calendar): string {
  const n = c.posts.length;
  return `${n} Planned Post${n === 1 ? '' : 's'} · ${c.contentStrategy.platforms.join(' + ')}`;
}

export function postsByDate(c: Calendar): Map<string, Post[]> {
  const map = new Map<string, Post[]>();
  for (const p of sortPosts(c.posts)) map.set(p.date, [...(map.get(p.date) ?? []), p]);
  return map;
}

/** Caption text for the clipboard: the caption, then the hashtags on their own line when there are any. */
export function captionText(p: Post): string {
  return p.hashtags.length ? `${p.caption}\n\n${p.hashtags.join(' ')}` : p.caption;
}

export function hashtagText(p: Post): string {
  return p.hashtags.join(' ');
}

/** Everything about one post as plain text (for the list and tests). */
export function postToText(p: Post): string {
  const lines = [
    `${longDate(p.date)} · ${p.platforms.join(' + ')} · ${p.format} · ${p.pillar}`,
    `Topic: ${p.topic}`,
    `Hook: ${p.hook}`,
    '',
    p.caption,
    '',
    `Visual direction: ${p.creativeDirection}`,
    `CTA: ${p.cta}`,
  ];
  if (p.hashtags.length) lines.push(`Hashtags: ${p.hashtags.join(' ')}`);
  if (p.productionNotes) lines.push(`Production notes: ${p.productionNotes}`);
  for (const a of p.adaptations) lines.push('', `${a.platform} version (${a.format})`, a.hook ? `Hook: ${a.hook}` : '', a.caption);
  return lines.filter((l) => l !== undefined).join('\n');
}

export const PLATFORM_SHORT: Record<Platform, string> = {
  Instagram: 'IG',
  TikTok: 'TT',
  Facebook: 'FB',
  LinkedIn: 'LI',
  YouTube: 'YT',
  Pinterest: 'PIN',
  Threads: 'TH',
  'Twitter/X': 'X',
};
