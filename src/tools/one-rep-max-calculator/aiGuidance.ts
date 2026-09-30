import { maxRepsAt } from './calculate';
import { generateGuidance } from './generateGuidance';
import type { Guidance, OneRmResult, PlanWeek, WarmupStep } from './types';

/**
 * Gemini-first training guidance with a guaranteed answer. The one rep
 * max, the formula comparison and the training chart always come from the
 * formulas (calculate.ts). Gemini writes the coaching layer in percentages
 * of the max, and the answer is checked here: a percentage must be a real
 * training percentage, the reps must be possible at it, the warm-up must
 * climb, and the text may only quote weights the tool calculated. Anything
 * that fails is replaced by the built-in guidance, part by part.
 */

export type GenerationSource = 'ai' | 'local';
export interface GuidanceGeneration { guidance: Guidance; source: GenerationSource }

const REQUEST_TIMEOUT_MS = 22_000;

const tidy = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().slice(0, max).trim() : '';
const int = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v.trim()) : null);
/** Percentages move in steps of 2.5. */
const pct = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v / 2.5) * 2.5 : null);

/** Every weight a sentence quotes ("263 lbs", "120 kg"). */
export function quotedWeights(text: string): number[] {
  return [...text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s?(?:lbs?|pounds?|kgs?|kilos?|kilograms?)\b/gi)].map((m) => Number(m[1].replace(/,/g, '')));
}

/** The only weights the text may quote: the set that was lifted and what the formulas gave. */
export function allowedWeights(result: OneRmResult): Set<number> {
  return new Set([result.input.weight, result.oneRm, result.low, result.high, result.average]);
}

const quotesOnlyKnownWeights = (text: string, result: OneRmResult): boolean => {
  const allowed = allowedWeights(result);
  return quotedWeights(text).every((w) => allowed.has(w));
};

function cleanWarmup(raw: unknown, firstWorkingPercent: number): WarmupStep[] | null {
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > 6) return null;
  const steps: WarmupStep[] = [];
  for (const x of raw) {
    const o = (x ?? {}) as Record<string, unknown>;
    const percent = pct(o.percent);
    const reps = int(o.reps);
    const prev = steps[steps.length - 1];
    // A ramp: heavier each step, never more reps than the step before, and always below the working sets.
    if (percent === null || reps === null || percent < 25 || percent > 92.5 || reps < 1 || reps > 15) return null;
    if (prev && (percent <= prev.percent || reps > prev.reps)) return null;
    steps.push({ percent, reps });
  }
  // A warm-up leads up to the work: it may touch the first working load, not pass it by more than a step.
  return steps[steps.length - 1].percent <= firstWorkingPercent + 5 ? steps : null;
}

function cleanPlan(raw: unknown, result: OneRmResult): PlanWeek[] | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const weeks: PlanWeek[] = [];
  for (const [i, x] of raw.entries()) {
    const o = (x ?? {}) as Record<string, unknown>;
    const percent = pct(o.percent);
    const sets = int(o.sets);
    const reps = tidy(o.reps, 8).replace(/\s/g, '');
    const focus = tidy(o.focus, 32);
    const note = tidy(o.note, 170);
    if (percent === null || sets === null || percent < 40 || percent > 97.5 || sets < 1 || sets > 8 || !focus) return null;
    if (!/^\d{1,2}(-\d{1,2})?$/.test(reps)) return null;
    const top = Math.max(...reps.split('-').map(Number));
    // Ten reps at 90 percent cannot be done: reject the whole plan rather than show an impossible week.
    if (top < 1 || top > maxRepsAt(percent) + 1) return null;
    if (!quotesOnlyKnownWeights(`${focus} ${note}`, result)) return null;
    weeks.push({ week: i + 1, focus, sets, reps, percent, note });
  }
  return weeks;
}

/** The model's guidance made safe to show, part by part. Null when nothing of it is usable. */
export function cleanGuidance(raw: unknown, result: OneRmResult, local: Guidance): Guidance | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  let kept = 0;

  const summaryRaw = tidy(o.summary, 360);
  const summaryOk = summaryRaw.length >= 40 && quotesOnlyKnownWeights(summaryRaw, result);
  if (summaryOk) kept++;

  const plan = cleanPlan(o.plan, result);
  if (plan) kept++;
  const finalPlan = plan ?? local.plan;
  const warmup = cleanWarmup(o.warmup, finalPlan[0].percent);
  if (warmup) kept++;

  const tips: string[] = [];
  for (const t of Array.isArray(o.tips) ? o.tips : []) {
    const tip = tidy(t, 200);
    if (tip.length >= 20 && quotedWeights(tip).length === 0 && !tips.includes(tip)) tips.push(tip);
    if (tips.length >= 3) break;
  }
  const tipsOk = tips.length >= 2;
  if (tipsOk) kept++;

  if (kept === 0) return null;
  return { summary: summaryOk ? summaryRaw : local.summary, warmup: warmup ?? local.warmup, plan: finalPlan, tips: tipsOk ? tips : local.tips };
}

export async function generateGuidanceWithAi(result: OneRmResult, variant = 0): Promise<GuidanceGeneration> {
  const local = generateGuidance(result);
  const raw = await fetchAi(result, variant);
  const guidance = raw ? cleanGuidance(raw, result, local) : null;
  return guidance ? { guidance, source: 'ai' } : { guidance: local, source: 'local' };
}

async function fetchAi(result: OneRmResult, variant: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const { input } = result;
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ tool: 'onerm', exercise: input.exercise, weight: input.weight, reps: input.reps, unit: input.unit, goal: input.goal ?? '', variant }),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return null;
    const data = (await res.json()) as { guidance?: unknown };
    return data.guidance ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
