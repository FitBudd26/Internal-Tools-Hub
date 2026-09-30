import { contentWords, generateGymNames, nameKey, validGymName } from './generateGymNames';
import { RESULT_COUNT, type GymNameInput, type GymNameResult } from './types';

/**
 * Gemini-first gym names with the ported engine as fallback and top-up.
 * Every name the model returns is checked against the tool's rules (Title
 * Case, 4-24 characters, at most 4 words, no digits, no existing gym
 * brands or filler words), de-duplicated, kept away from the previous set,
 * and no single word is allowed to carry more than three names.
 */

export type GenerationSource = 'ai' | 'local';
export interface GymNameGeneration { result: GymNameResult; source: GenerationSource }

const REQUEST_TIMEOUT_MS = 20_000;
/** One word (Forge, Iron) may appear in this many names of a set; the user's keyword is exempt. */
const WORD_CAP = 3;

/** Reorder so no word carries more than two of the leading names; the overflow keeps its order at the back. */
function varied(names: string[]): string[] {
  const picked: string[] = [];
  const overflow: string[] = [];
  const use = new Map<string, number>();
  for (const name of names) {
    const words = contentWords(name);
    if (words.some((w) => (use.get(w) ?? 0) >= 2)) {
      overflow.push(name);
      continue;
    }
    for (const w of words) use.set(w, (use.get(w) ?? 0) + 1);
    picked.push(name);
  }
  return [...picked, ...overflow];
}

/** The engine's names for this variant, freshest first: anything in `avoid` goes to the back. */
function localNames(input: GymNameInput, variant: number, avoid: Set<string>): string[] {
  const { pool, display } = generateGymNames(input, variant);
  const ordered = [...new Set([...display, ...pool])];
  const fresh = ordered.filter((n) => !avoid.has(nameKey(n)));
  const seen = ordered.filter((n) => avoid.has(nameKey(n)));
  return [...varied(fresh), ...seen];
}

export async function generateGymNamesWithAi(input: GymNameInput, variant = 0, avoid: string[] = []): Promise<GymNameGeneration> {
  const avoidKeys = new Set(avoid.map(nameKey));
  const local = localNames(input, variant, avoidKeys);
  const ai = await fetchAi(input, variant, avoid);
  if (!ai) return { result: { names: local.slice(0, RESULT_COUNT) }, source: 'local' };

  const keywordWords = new Set(contentWords(input.keyword));
  const out: string[] = [];
  const keys = new Set<string>();
  const wordUse = new Map<string, number>();
  const take = (name: string): void => {
    out.push(name);
    keys.add(nameKey(name));
    for (const w of contentWords(name)) wordUse.set(w, (wordUse.get(w) ?? 0) + 1);
  };

  for (const raw of ai) {
    if (out.length >= RESULT_COUNT) break;
    const name = validGymName(raw);
    if (!name) continue;
    const key = nameKey(name);
    if (keys.has(key) || avoidKeys.has(key)) continue;
    if (contentWords(name).some((w) => !keywordWords.has(w) && (wordUse.get(w) ?? 0) >= WORD_CAP)) continue;
    take(name);
  }
  if (out.length === 0) return { result: { names: local.slice(0, RESULT_COUNT) }, source: 'local' };

  for (const name of local) {
    if (out.length >= RESULT_COUNT) break;
    if (!keys.has(nameKey(name))) take(name);
  }
  return { result: { names: out }, source: 'ai' };
}

async function fetchAi(input: GymNameInput, variant: number, avoid: string[]): Promise<string[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        tool: 'gymname',
        fullName: input.fullName.trim().slice(0, 80),
        gymTypes: input.gymTypes,
        audiences: input.audiences,
        tones: input.tones,
        keyword: input.keyword.trim().slice(0, 30),
        variant,
        avoid: avoid.slice(0, 30),
      }),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return null;
    const data = (await res.json()) as { names?: unknown };
    return Array.isArray(data.names) ? data.names.filter((x): x is string => typeof x === 'string') : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
