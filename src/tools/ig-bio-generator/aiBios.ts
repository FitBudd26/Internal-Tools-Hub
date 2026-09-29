import { MAX_BIO_CHARS, type BioInput, type BioResult, type GeneratedBio } from './types';
import { countChars, generateBios, resolveTone } from './generateBios';

/**
 * Gemini-first bios with the templated engine as the fallback and top-up.
 * Every bio is checked against Instagram's 150-character limit (grapheme
 * count), dashes and hashtags are removed, duplicates and repeats of the
 * previous set are dropped, and anything short is filled from the engine.
 */

export type GenerationSource = 'ai' | 'local';
export interface BioGeneration { result: BioResult; source: GenerationSource }

const REQUEST_TIMEOUT_MS = 20_000;
const BIO_COUNT = 4;
const cleanText = (s: string) => s.replace(/[\u2013\u2014]/g, ',').replace(/\s*,\s*,/g, ',').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();

export async function generateBiosWithAi(input: BioInput, variant = 0, avoid: BioResult | null = null): Promise<BioGeneration> {
  const tone = resolveTone(input);
  const local: BioResult = { bios: generateBios(input, variant), tone };
  const ai = await fetchAi(input, tone, variant, avoid);
  if (!ai) return { result: local, source: 'local' };

  const bios: GeneratedBio[] = [];
  for (const raw of ai) {
    const text = cleanText(raw);
    const n = countChars(text);
    if (n < 40 || n > MAX_BIO_CHARS) continue;
    if (bios.some((b) => b.text.toLowerCase() === text.toLowerCase())) continue;
    if (avoid?.bios.some((b) => b.text === text)) continue;
    bios.push({ text, charCount: n });
    if (bios.length >= BIO_COUNT) break;
  }
  if (bios.length === 0) return { result: local, source: 'local' };
  for (const b of local.bios) if (bios.length < BIO_COUNT && !bios.some((x) => x.text === b.text)) bios.push(b);
  return { result: { bios, tone }, source: 'ai' };
}

async function fetchAi(input: BioInput, tone: string, variant: number, avoid: BioResult | null): Promise<string[] | null> {
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
      }),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return null;
    const data = (await res.json()) as { bios?: unknown };
    return Array.isArray(data.bios) ? data.bios.filter((x): x is string => typeof x === 'string') : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
