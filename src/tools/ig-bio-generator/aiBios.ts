import { MAX_BIO_CHARS, type BioInput, type BioResult, type GeneratedBio } from './types';
import { countChars, generateBios, generateUsernames, resolveTone, sanitizeHandle } from './generateBios';

/**
 * Gemini-first bios and username ideas with the templated engine as the
 * fallback and top-up. Every bio is checked against Instagram's 150-character
 * limit (grapheme count), dashes and hashtags are removed, usernames are
 * sanitised to handle rules, and anything short is filled from the engine.
 */

export type GenerationSource = 'ai' | 'local';
export interface BioGeneration { result: BioResult; source: GenerationSource }

const REQUEST_TIMEOUT_MS = 20_000;
const BIO_COUNT = 4;
const USERNAME_COUNT = 8;
const cleanText = (s: string) => s.replace(/[–—]/g, ',').replace(/\s*,\s*,/g, ',').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();

export async function generateBiosWithAi(input: BioInput, variant = 0, avoid: BioResult | null = null): Promise<BioGeneration> {
  const tone = resolveTone(input);
  const local: BioResult = { bios: generateBios(input, variant), usernames: generateUsernames(input, variant), tone };
  const ai = await fetchAi(input, tone, variant, avoid);
  if (!ai) return { result: local, source: 'local' };

  const bios: GeneratedBio[] = [];
  for (const raw of ai.bios) {
    const text = cleanText(raw);
    const n = countChars(text);
    if (n < 40 || n > MAX_BIO_CHARS) continue;
    if (bios.some((b) => b.text.toLowerCase() === text.toLowerCase())) continue;
    if (avoid?.bios.some((b) => b.text === text)) continue;
    bios.push({ text, charCount: n });
    if (bios.length >= BIO_COUNT) break;
  }
  const usernames: string[] = [];
  for (const raw of ai.usernames) {
    const h = sanitizeHandle(raw);
    if (h && !usernames.includes(h) && !avoid?.usernames.includes(h)) usernames.push(h);
    if (usernames.length >= USERNAME_COUNT) break;
  }
  if (bios.length === 0 && usernames.length === 0) return { result: local, source: 'local' };

  for (const b of local.bios) if (bios.length < BIO_COUNT && !bios.some((x) => x.text === b.text)) bios.push(b);
  for (const u of local.usernames) if (usernames.length < USERNAME_COUNT && !usernames.includes(u)) usernames.push(u);
  return { result: { bios, usernames, tone }, source: 'ai' };
}

async function fetchAi(input: BioInput, tone: string, variant: number, avoid: BioResult | null): Promise<{ bios: string[]; usernames: string[] } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        tool: 'igbio',
        name: input.name.trim().slice(0, 80),
        businessType: input.businessType,
        yearsExperience: input.yearsExperience.trim().slice(0, 20),
        location: input.location.trim().slice(0, 60),
        specializations: input.specializations,
        targetAudience: input.targetAudience,
        uniqueSellingPoint: input.uniqueSellingPoint.trim().slice(0, 300),
        tone,
        variant,
        avoidBios: avoid?.bios.map((b) => b.text).slice(0, 8) ?? [],
        avoidUsernames: avoid?.usernames.slice(0, 16) ?? [],
      }),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return null;
    const data = (await res.json()) as { bios?: unknown; usernames?: unknown };
    const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    return { bios: strs(data.bios), usernames: strs(data.usernames) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
