import type { IntakeQuestion, Questionnaire, TrainerConfig } from './types';
import { CHOICE_TYPES, QUESTION_TYPES } from './types';

/**
 * Browser side of the generation: posts the trainer's business profile (and
 * nothing else: no name, no email, no consent) to /api/generate-intake and
 * checks the questionnaire that comes back. There is no canned fallback
 * form: when Gemini cannot answer, the tool says so and offers a retry.
 */

export type IntakeFailure = 'rate_limited' | 'unavailable' | 'invalid' | 'network' | 'not_configured';
export type IntakeResult =
  | { ok: true; questionnaire: Questionnaire; model: string; trimmed: boolean }
  | { ok: false; error: IntakeFailure };

export const FAILURE_MESSAGES: Record<IntakeFailure, string> = {
  rate_limited: "We're experiencing high demand. Please try generating your form again shortly.",
  unavailable: "We couldn't build your form just now. Please try again in a moment.",
  invalid: "The generated form didn't pass our quality checks. Please try again.",
  network: 'The request did not go through. Check your connection and try again.',
  // Dev names the fix; production users only see that it is unavailable.
  not_configured: import.meta.env.DEV
    ? 'Generation is not configured on this server: add GEMINI_API_KEY to .env and restart the dev server.'
    : 'Form generation is temporarily unavailable. Please try again later.',
};

const REQUEST_TIMEOUT_MS = 50_000;

export async function generateIntakeForm(config: TrainerConfig, variant = 0, avoidTitles: string[] = []): Promise<IntakeResult> {
  if (!config.businessType || !config.format || !config.specializations.length || !config.clientele.length) {
    return { ok: false, error: 'invalid' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('/api/generate-intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        businessType: config.businessType,
        specializations: config.specializations,
        clientele: config.clientele,
        format: config.format,
        length: config.length,
        requirements: config.requirements.trim().slice(0, 500),
        variant,
        avoidTitles: avoidTitles.slice(0, 5),
      }),
    });
    if (res.status === 429) return { ok: false, error: 'rate_limited' };
    if (res.status === 503) return { ok: false, error: 'not_configured' };
    const type = res.headers.get('content-type') ?? '';
    const data = type.includes('application/json') ? ((await res.json().catch(() => null)) as Record<string, unknown> | null) : null;
    if (!res.ok) return { ok: false, error: data?.error === 'invalid' ? 'invalid' : 'unavailable' };
    const questionnaire = checkQuestionnaire(data?.questionnaire);
    if (!questionnaire) return { ok: false, error: 'invalid' };
    return { ok: true, questionnaire, model: typeof data?.model === 'string' ? data.model : '', trimmed: data?.trimmed === true };
  } catch {
    return { ok: false, error: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strs = (v: unknown, max: number, len: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((s) => s.trim().slice(0, len)).filter(Boolean).slice(0, max) : [];

/** Structural check of the route's answer, so a malformed payload can never reach the editor or the PDF. */
export function checkQuestionnaire(v: unknown): Questionnaire | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const formTitle = str(o.formTitle, 120);
  if (formTitle.length < 3 || !Array.isArray(o.sections)) return null;
  const ids = new Set<string>();
  const sections = o.sections
    .map((s, si) => {
      const so = (s ?? {}) as Record<string, unknown>;
      const questions = (Array.isArray(so.questions) ? so.questions : [])
        .map((q): IntakeQuestion | null => {
          const qo = (q ?? {}) as Record<string, unknown>;
          const type = QUESTION_TYPES.find((t) => t === qo.type);
          const question = str(qo.question, 240);
          const id = str(qo.id, 40);
          if (!type || question.length < 5 || !id || ids.has(id)) return null;
          ids.add(id);
          const options = CHOICE_TYPES.has(type) ? strs(qo.options, 12, 80) : [];
          if (CHOICE_TYPES.has(type) && options.length < 2) return null;
          const out: IntakeQuestion = { id, question, type, required: qo.required === true, options, helpText: str(qo.helpText, 240) };
          if (type === 'rating') {
            const labels = strs(qo.scaleLabels, 2, 40);
            out.scaleLabels = [labels[0] || 'Low', labels[1] || 'High'];
          }
          return out;
        })
        .filter((q): q is IntakeQuestion => q !== null);
      const title = str(so.title, 80);
      return title && questions.length ? { id: str(so.id, 40) || `s_${si + 1}`, title, description: str(so.description, 240), questions } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  if (!sections.length) return null;
  return {
    formTitle,
    formDescription: str(o.formDescription, 400),
    sections,
    coachNotes: strs(o.coachNotes, 6, 300),
    reviewNotice: str(o.reviewNotice, 400),
  };
}
