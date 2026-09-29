import type { HashtagFormState, Platform, PlatformHashtags } from '../types';
import { PLATFORM_OPTIONS } from '../types';
import {
  PLATFORM_RANGES,
  captionOwnTags,
  cleanTag,
  generateHashtags,
  isBannedOn,
  platformTip,
} from './generateHashtags';

/**
 * AI-first generation with a guaranteed answer.
 *
 * The serverless route (/api/generate → Gemini) produces caption-specific,
 * non-repeating hashtags. Whatever comes back is pushed through the same
 * rules the local engine follows — lowercase letters/digits, banned and
 * platform-inappropriate tags removed, the caption's own tags skipped, spec
 * count ranges, "at most three platforms per tag" — and any platform the
 * model under-delivers is topped up from the deterministic engine. If the
 * route is missing, unconfigured, rate-limited, slow or returns junk, the
 * deterministic result is used as-is. Results always appear.
 */

export type GenerationSource = 'ai' | 'local';

export interface GenerationResult {
  groups: PlatformHashtags[];
  source: GenerationSource;
}

export interface AiGroup {
  platform: Platform;
  hashtags: string[];
}

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PLATFORMS_PER_TAG = 3;

export async function generateWithAi(
  form: HashtagFormState,
  variant = 0,
  avoid: string[] = [],
): Promise<GenerationResult> {
  const local = generateHashtags(form, variant);
  const ai = await fetchAiGroups(form, avoid);
  if (!ai || ai.length === 0) return { groups: local, source: 'local' };
  return { groups: mergeAiGroups(form, ai, local, avoid), source: 'ai' };
}

/** Apply the local engine's rules to model output; exported for tests. */
export function mergeAiGroups(
  form: HashtagFormState,
  ai: AiGroup[],
  local: PlatformHashtags[],
  avoid: string[] = [],
): PlatformHashtags[] {
  const own = captionOwnTags(form.caption);
  const avoidSet = new Set(avoid);
  const useCount = new Map<string, number>();

  return form.platforms.map((platform, i) => {
    const fallback = local[i]?.tags ?? [];
    const { min, max } = PLATFORM_RANGES[platform];
    const raw = ai.find((g) => g.platform === platform)?.hashtags ?? [];
    const tags: string[] = [];

    const accept = (candidate: string, fromModel: boolean) => {
      const tag = fromModel ? cleanTag(candidate) : candidate;
      if (!tag || tags.includes(tag)) return;
      if (own.has(tag) || isBannedOn(platform, tag)) return;
      if (fromModel && avoidSet.has(tag)) return;
      if ((useCount.get(tag) ?? 0) >= MAX_PLATFORMS_PER_TAG) return;
      tags.push(tag);
    };

    for (const r of raw) {
      if (tags.length >= max) break;
      accept(r, true);
    }

    // Model skipped this platform → use the full local set; came back short →
    // top up to the platform's minimum from the local set.
    const target = tags.length === 0 ? fallback.length : min;
    for (const t of fallback) {
      if (tags.length >= target) break;
      accept(t, false);
    }

    for (const t of tags) useCount.set(t, (useCount.get(t) ?? 0) + 1);
    return { platform, tags, tip: platformTip(platform) };
  });
}

const PLATFORM_ALIASES: Record<string, Platform> = {
  x: 'Twitter/X',
  twitter: 'Twitter/X',
  xtwitter: 'Twitter/X',
};

/** Tolerant platform-name matching ("X", "twitter", "Twitter/X" → Twitter/X). */
export function matchPlatform(raw: unknown): Platform | null {
  if (typeof raw !== 'string') return null;
  const key = raw.toLowerCase().replace(/[^a-z]/g, '');
  return (
    PLATFORM_OPTIONS.find((p) => p.toLowerCase().replace(/[^a-z]/g, '') === key) ??
    PLATFORM_ALIASES[key] ??
    null
  );
}

async function fetchAiGroups(
  form: HashtagFormState,
  avoid: string[],
): Promise<AiGroup[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        caption: form.caption.trim().slice(0, 2000),
        topic: form.topic.trim().slice(0, 120),
        postType: form.postType ?? '',
        platforms: form.platforms,
        tones: form.tones,
        avoid: avoid.slice(0, 150),
      }),
    });
    // A non-JSON 200 (e.g. an SPA fallback page) counts as "no AI available".
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return null;

    const data = (await res.json()) as { groups?: unknown };
    if (!Array.isArray(data.groups)) return null;

    const groups: AiGroup[] = [];
    for (const g of data.groups) {
      if (!g || typeof g !== 'object') continue;
      const platform = matchPlatform((g as { platform?: unknown }).platform);
      const hashtags = (g as { hashtags?: unknown }).hashtags;
      if (!platform || !Array.isArray(hashtags)) continue;
      groups.push({
        platform,
        hashtags: hashtags.filter((h): h is string => typeof h === 'string'),
      });
    }
    return groups;
  } catch {
    return null; // network error, timeout, invalid JSON → local engine
  } finally {
    clearTimeout(timer);
  }
}
