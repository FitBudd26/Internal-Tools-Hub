import { HANDLE_MAX_LEN, HANDLE_MIN_LEN, RESULT_COUNT, type UsernameInput } from './types';

/**
 * Deterministic username engine, ported from the original tool and made
 * seedable (Regenerate rotates variants). Fallback and top-up for Gemini.
 * Every handle: lowercase letters plus at most one period or underscore,
 * 3-18 characters, no numbers, readable and brandable.
 */

const NICHE_TERMS: Record<string, string[]> = {
  'Weight Loss': ['lean', 'shred', 'burn'],
  'Fat Loss': ['shred', 'lean', 'burn'],
  'Muscle Building': ['gains', 'build', 'muscle'],
  'Strength Training': ['strength', 'barbell', 'lift'],
  Yoga: ['flow', 'yoga', 'zen'],
  Pilates: ['pilates', 'core', 'align'],
  CrossFit: ['wod', 'cross', 'box'],
  Mobility: ['mobility', 'move', 'flex'],
  Nutrition: ['fuel', 'nutrition', 'nourish'],
  'Athletic Performance': ['athletic', 'perform', 'elite'],
  "Women's Fitness": ['strong', 'fit', 'empower'],
  'Senior Fitness': ['vital', 'active', 'ageless'],
  'Functional Training': ['functional', 'move', 'primal'],
};

const ROLE_TERMS: Record<string, string[]> = {
  'Personal Trainer': ['coach', 'trainer', 'pt'],
  'Online Coach': ['coach', 'online', 'coaching'],
  'Gym Owner': ['gym', 'coach', 'training'],
  'Fitness Influencer': ['fit', 'daily', 'life'],
  'Yoga Coach': ['yoga', 'coach', 'flow'],
  'Pilates Instructor': ['pilates', 'coach', 'studio'],
  'CrossFit Coach': ['coach', 'wod', 'box'],
  'Nutrition Coach': ['coach', 'fuel', 'nutrition'],
  'Strength Coach': ['coach', 'strength', 'lift'],
  'Group Fitness Instructor': ['coach', 'group', 'studio'],
};

const TONE_MODIFIERS: Record<string, { prefix: string[]; suffix: string[] }> = {
  Professional: { prefix: ['coach', 'train'], suffix: ['coaching', 'method', 'pro'] },
  Trendy: { prefix: ['the', 'go'], suffix: ['fit', 'moves', 'daily'] },
  Playful: { prefix: ['get', 'go'], suffix: ['moves', 'vibes', 'fitclub'] },
  Minimalist: { prefix: [''], suffix: ['fit', 'co', 'lab'] },
  Unique: { prefix: ['iam', 'the'], suffix: ['forge', 'lab', 'atlas'] },
};

const MOVEMENT_WORDS = ['moves', 'motion', 'flow', 'lift', 'forge'];
const PERFORMANCE_WORDS = ['power', 'peak', 'elite', 'prime', 'pro'];
const TRAIN_PREFIXES = ['trainwith', 'coach', 'train'];

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Lowercase letters and at most one period or underscore; accents folded; numbers and symbols dropped. */
export function cleanHandle(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z._]/g, '')
    .replace(/[._]{2,}/g, (m) => m[0])
    .replace(/^[._]+|[._]+$/g, '');
}

const separators = (s: string) => (s.match(/[._]/g) || []).length;

/** A handle that meets every rule, else null. Also used to gate model output. */
export function validHandle(raw: string): string | null {
  const h = cleanHandle(raw.replace(/^@/, ''));
  if (h.length < HANDLE_MIN_LEN || h.length > HANDLE_MAX_LEN) return null;
  if (separators(h) > 1) return null;
  return h;
}

function fitLength(name: string, extra: string): string | null {
  let u = cleanHandle(name + extra);
  if (u.length <= HANDLE_MAX_LEN) return u;
  let trimmed = extra;
  while (trimmed.length > 2) {
    trimmed = trimmed.slice(0, -1);
    u = cleanHandle(name + trimmed);
    if (u.length <= HANDLE_MAX_LEN) return u;
  }
  u = cleanHandle(name);
  return u.length >= HANDLE_MIN_LEN && u.length <= HANDLE_MAX_LEN ? u : null;
}

export function firstName(fullName: string): string {
  return cleanHandle(fullName.trim().split(/\s+/)[0] || '');
}

export function generateUsernames(data: UsernameInput, variant = 0, count = RESULT_COUNT): string[] {
  const name = firstName(data.fullName) || 'coach';
  const keyword = cleanHandle(data.keyword || '');
  const seed = hashString(JSON.stringify(data)) + variant;
  const at = (arr: string[], i: number) => arr[(i + seed) % arr.length];

  const niches = data.niches.length ? data.niches : ['Strength Training'];
  const roles = data.trainerTypes.length ? data.trainerTypes : ['Personal Trainer'];
  const tones = data.tones.length ? data.tones : ['Professional'];
  const nicheTerms = niches.flatMap((n) => NICHE_TERMS[n] ?? ['fit']);
  const roleTerms = roles.flatMap((r) => ROLE_TERMS[r] ?? ['coach']);
  const toneMods = tones.map((t) => TONE_MODIFIERS[t] ?? TONE_MODIFIERS.Professional);

  const candidates: string[] = [];
  const push = (a: string, b: string) => {
    const u = fitLength(a, b);
    if (u && u.length >= HANDLE_MIN_LEN && separators(u) <= 1) candidates.push(u);
  };
  for (let i = 0; i < 4; i++) {
    const tone = toneMods[i % toneMods.length];
    push(at(roleTerms, i), name);
    push(name, at(nicheTerms, i));
    push(name, at(roleTerms, i));
    push(at(TRAIN_PREFIXES, i), name);
    push(name, at(PERFORMANCE_WORDS, i));
    push(name, at(MOVEMENT_WORDS, i));
    push(at(tone.prefix, i), name);
    push(name, at(tone.suffix, i));
    push(at(nicheTerms, i), name);
    push(name, '.' + at(nicheTerms, i + 1));
    push(at(roleTerms, i + 1), '.' + name);
  }
  if (keyword) {
    push(keyword, name);
    push(name, keyword);
    push(name, '.' + keyword);
    push(name, keyword.slice(0, 4));
  }

  const unique = [...new Set(candidates)];
  const ranked = unique
    .map((u, idx) => {
      let score = 0;
      if (name.length >= 2 && u.includes(name)) score += 5;
      if (u.length >= 6 && u.length <= 14) score += 4;
      if (!/[._]/.test(u)) score += 3;
      if (keyword && u.includes(keyword)) score += 2;
      score += Math.max(0, 8 - Math.abs(10 - u.length));
      score += ((seed + idx * 7) % 5) / 10; // seeded tie-break so variants differ
      return { u, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.u);
  // Rotate the top slice per variant so Regenerate shows a different mix.
  const offset = variant % Math.max(1, Math.min(4, ranked.length - count + 1));
  return ranked.slice(offset, offset + count).length >= count ? ranked.slice(offset, offset + count) : ranked.slice(0, count);
}
