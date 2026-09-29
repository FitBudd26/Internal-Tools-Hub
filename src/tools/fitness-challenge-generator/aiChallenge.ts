import type { Challenge, ChallengeInput } from './types';
import { PROGRAMMING_RE, buildPdfSections, generateChallenge, weeksFor } from './generateChallenge';

/**
 * AI-first challenge frameworks with a guaranteed answer. The shared route
 * asks Gemini for the framework in a fixed schema; the answer is checked
 * here (required parts present, weekly themes match the duration, no
 * workout programming, no dashes) and anything that fails falls back to
 * the deterministic engine, in whole or, for the weekly themes, in part.
 */

export type GenerationSource = 'ai' | 'local';
export interface ChallengeGeneration {
  challenge: Challenge;
  source: GenerationSource;
}

const REQUEST_TIMEOUT_MS = 25_000;
const clean = (s: string) => s.replace(/[–—]/g, '-').trim();

interface AiChallenge {
  challengeName: string;
  subtitle: string;
  objective: string;
  howItWorks: string;
  dailyRules: { title: string; details: string[] }[];
  weeklyThemes: { label: string; name: string; focus: string; coachTip: string }[];
  scoringSystem: string[];
  progressTracking: string[];
  coachingNotes: string[];
  clientInstructions: string[];
}

export async function generateChallengeWithAi(
  input: ChallengeInput,
  variant = 0,
  avoidNames: string[] = [],
): Promise<ChallengeGeneration> {
  const local = generateChallenge(input);
  const ai = await fetchAi(input, local.durationDays, variant, avoidNames);
  if (!ai) return { challenge: local, source: 'local' };

  const strs = (a: string[]) => a.map(clean).filter(Boolean);
  const core = {
    challengeName: clean(ai.challengeName),
    subtitle: clean(ai.subtitle),
    designedFor: local.designedFor,
    level: local.level,
    duration: local.duration,
    durationDays: local.durationDays,
    objective: clean(ai.objective),
    howItWorks: clean(ai.howItWorks),
    dailyRules: ai.dailyRules.map((r) => ({ title: clean(r.title), details: strs(r.details) })).filter((r) => r.title && r.details.length),
    weeklyThemes: ai.weeklyThemes.map((t) => ({ label: clean(t.label), name: clean(t.name), focus: clean(t.focus), coachTip: clean(t.coachTip) })),
    scoringSystem: strs(ai.scoringSystem),
    progressTracking: strs(ai.progressTracking),
    coachingNotes: strs(ai.coachingNotes),
    clientInstructions: strs(ai.clientInstructions),
  };

  // The theme count must match the duration; otherwise keep the model's copy but use local themes.
  if (core.weeklyThemes.length !== weeksFor(local.durationDays) || core.weeklyThemes.some((t) => !t.label || !t.name || !t.focus || !t.coachTip)) {
    core.weeklyThemes = local.weeklyThemes;
  }

  const complete =
    core.challengeName && core.subtitle && core.objective && core.howItWorks &&
    core.dailyRules.length >= 3 && core.scoringSystem.length >= 2 &&
    core.progressTracking.length >= 3 && core.coachingNotes.length >= 3 && core.clientInstructions.length >= 3;
  if (!complete || PROGRAMMING_RE.test(JSON.stringify(core))) return { challenge: local, source: 'local' };

  return { challenge: { ...core, pdfSections: buildPdfSections(core) }, source: 'ai' };
}

async function fetchAi(input: ChallengeInput, days: number, variant: number, avoidNames: string[]): Promise<AiChallenge | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        tool: 'challenge',
        challengeTypes: input.challengeTypes,
        audienceTypes: input.audienceTypes,
        fitnessLevels: input.fitnessLevels,
        days,
        equipment: input.equipment,
        measurements: input.measurements,
        variant,
        avoidNames: avoidNames.slice(0, 10),
      }),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return null;
    const data = (await res.json()) as { challenge?: unknown };
    const c = data.challenge;
    if (!c || typeof c !== 'object') return null;
    const o = c as Record<string, unknown>;
    const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    return {
      challengeName: str(o.challengeName),
      subtitle: str(o.subtitle),
      objective: str(o.objective),
      howItWorks: str(o.howItWorks),
      dailyRules: (Array.isArray(o.dailyRules) ? o.dailyRules : []).map((r) => ({ title: str((r as { title?: unknown })?.title), details: arr((r as { details?: unknown })?.details) })),
      weeklyThemes: (Array.isArray(o.weeklyThemes) ? o.weeklyThemes : []).map((t) => {
        const w = (t ?? {}) as Record<string, unknown>;
        return { label: str(w.label), name: str(w.name), focus: str(w.focus), coachTip: str(w.coachTip) };
      }),
      scoringSystem: arr(o.scoringSystem),
      progressTracking: arr(o.progressTracking),
      coachingNotes: arr(o.coachingNotes),
      clientInstructions: arr(o.clientInstructions),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
