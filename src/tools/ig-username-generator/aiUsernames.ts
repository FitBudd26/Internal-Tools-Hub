import { RESULT_COUNT, type UsernameInput, type UsernameResult } from './types';
import { generateUsernames, validHandle } from './generateUsernames';

/**
 * Gemini-first usernames with the ported engine as fallback and top-up.
 * Every handle the model returns is checked against the tool's rules
 * (lowercase letters, at most one period or underscore, 3-18 characters,
 * no numbers), de-duplicated and kept away from the previous set.
 */

export type GenerationSource = 'ai' | 'local';
export interface UsernameGeneration { result: UsernameResult; source: GenerationSource }

const REQUEST_TIMEOUT_MS = 20_000;

export async function generateUsernamesWithAi(input: UsernameInput, variant = 0, avoid: string[] = []): Promise<UsernameGeneration> {
  const local = generateUsernames(input, variant);
  const ai = await fetchAi(input, variant, avoid);
  if (!ai) return { result: { usernames: local }, source: 'local' };

  const out: string[] = [];
  for (const raw of ai) {
    const h = validHandle(raw);
    if (h && !out.includes(h) && !avoid.includes(h)) out.push(h);
    if (out.length >= RESULT_COUNT) break;
  }
  if (out.length === 0) return { result: { usernames: local }, source: 'local' };
  for (const u of local) if (out.length < RESULT_COUNT && !out.includes(u) && !avoid.includes(u)) out.push(u);
  return { result: { usernames: out }, source: 'ai' };
}

async function fetchAi(input: UsernameInput, variant: number, avoid: string[]): Promise<string[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        tool: 'igusername',
        fullName: input.fullName.trim().slice(0, 80),
        niches: input.niches,
        trainerTypes: input.trainerTypes,
        tones: input.tones,
        keyword: input.keyword.trim().slice(0, 30),
        variant,
        avoid: avoid.slice(0, 30),
      }),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return null;
    const data = (await res.json()) as { usernames?: unknown };
    return Array.isArray(data.usernames) ? data.usernames.filter((x): x is string => typeof x === 'string') : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
