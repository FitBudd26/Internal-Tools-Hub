import {
  MAX_BIO_CHARS,
  TONES,
  type BioInput,
  type BioResult,
  type GeneratedBio,
  type Specialization,
  type TargetAudience,
  type Tone,
} from './types';

/**
 * Deterministic bio engine, ported from the original IG Bio Generator and
 * made seedable so Regenerate rotates through variants. Used only as the
 * fallback when Gemini is unavailable and to top up short answers.
 */

/** Grapheme-aware count so a multi-codepoint emoji counts as one character, like Instagram's counter. */
export function countChars(text: string): number {
  const AnyIntl = Intl as unknown as {
    Segmenter?: new (locale?: string, opts?: { granularity: 'grapheme' }) => { segment: (s: string) => Iterable<unknown> };
  };
  if (typeof AnyIntl.Segmenter === 'function') {
    let n = 0;
    for (const _ of new AnyIntl.Segmenter('en', { granularity: 'grapheme' }).segment(text)) n++;
    return n;
  }
  return Array.from(text).length;
}

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Style = 'authority' | 'results' | 'community' | 'value';

const AUDIENCE_PHRASES: Record<TargetAudience, string[]> = {
  'Busy Parents': ['busy parents', 'parents on the clock', 'time-strapped parents'],
  'Young Professionals': ['busy pros', 'young professionals', '9-to-5 hustlers'],
  'Seniors (55+)': ['the active 55+ crowd', 'strong-at-55 movers', 'seniors who mean it'],
  Athletes: ['driven athletes', 'competitors', 'athletes'],
  Beginners: ['beginners', 'day-one lifters', 'first-timers'],
  'Women Only': ['strong women', 'women who lift', 'women'],
  'General Population': ['everyday lifters', 'everyday humans', 'real people'],
};

const SPEC_PHRASES: Record<Specialization, string[]> = {
  'Weight Loss': ['fat-loss', 'lean results', 'sustainable weight loss'],
  'Muscle Building': ['real gains', 'strength and size', 'muscle'],
  'Athletic Performance': ['performance', 'athletic power', 'game-day strength'],
  'Senior Fitness': ['mobility', 'joint-friendly strength', 'strong-for-life training'],
  "Women's Health": ["women's strength", 'hormone-smart training', "women's health"],
  'Youth Training': ['young-athlete development', 'foundational strength', 'youth athletics'],
  'Injury Recovery': ['pain-free movement', 'rehab-to-strong', 'return-to-strength'],
  'Nutrition Coaching': ['macros', 'smart fueling', 'no-BS nutrition'],
  'Mental Health & Fitness': ['mind and muscle', 'stress-proof training', 'mental strength'],
  'Functional Movement': ['functional movement', 'move-better training', 'everyday strength'],
};

const FITNESS_VERBS = ['reps', 'strength', 'form', 'mobility', 'habits', 'coaching', 'accountability', 'sweat', 'gains'];
const RESULT_PHRASES = ['results you can measure', 'real, lasting results', 'progress that sticks', 'PRs worth chasing', 'lean, strong, capable'];

const TONE: Record<Tone, { descriptors: string[]; emojiPairs: [string, string][] }> = {
  'Professional & Credible': {
    descriptors: ['proven programming', 'structured coaching', 'experience plus evidence'],
    emojiPairs: [['📈', '💪'], ['🎯', '🏋️‍♀️'], ['📊', '💪'], ['✅', '💪']],
  },
  'Motivational & Energetic': {
    descriptors: ['high-energy sessions', 'full-send effort', 'relentless consistency'],
    emojiPairs: [['🔥', '⚡'], ['💪', '🔥'], ['⚡', '🏋️‍♀️'], ['🚀', '🔥']],
  },
  'Friendly & Approachable': {
    descriptors: ['zero judgment', 'real-people coaching', 'come-as-you-are vibes'],
    emojiPairs: [['💪', '🙌'], ['🥗', '💪'], ['😊', '🔥'], ['🙌', '🔥']],
  },
  'Scientific & Educational': {
    descriptors: ['evidence-based training', 'data-driven programming', 'science-backed methods'],
    emojiPairs: [['🧠', '💪'], ['📊', '🔬'], ['📈', '🧠'], ['🔬', '💪']],
  },
};

/** Auto tone: the tone that best fits business type, audience, specialisations and USP wording. */
export function inferTone(data: BioInput): Tone {
  const score: Record<Tone, number> = { 'Professional & Credible': 0, 'Motivational & Energetic': 0, 'Friendly & Approachable': 0, 'Scientific & Educational': 0 };
  switch (data.businessType) {
    case 'Nutrition Coach': score['Scientific & Educational'] += 2; break;
    case 'CrossFit Coach': case 'Group Fitness Instructor': case 'Fitness Influencer': score['Motivational & Energetic'] += 2; break;
    case 'Yoga/Pilates Instructor': score['Friendly & Approachable'] += 2; break;
    case 'Gym Owner': case 'Boutique Studio Owner': case 'Online Fitness Coach': case 'Personal Trainer': score['Professional & Credible'] += 1; break;
  }
  switch (data.targetAudience) {
    case 'Athletes': score['Motivational & Energetic'] += 2; break;
    case 'Beginners': case 'Busy Parents': score['Friendly & Approachable'] += 2; break;
    case 'Seniors (55+)': score['Friendly & Approachable'] += 1; score['Scientific & Educational'] += 1; break;
    case 'Young Professionals': score['Professional & Credible'] += 1; break;
  }
  for (const spec of data.specializations) {
    if (spec === 'Athletic Performance' || spec === 'Muscle Building') score['Motivational & Energetic'] += 1;
    else if (spec === 'Nutrition Coaching' || spec === 'Injury Recovery' || spec === 'Senior Fitness' || spec === 'Functional Movement') score['Scientific & Educational'] += 1;
    else if (spec === 'Mental Health & Fitness' || spec === "Women's Health") score['Friendly & Approachable'] += 1;
  }
  const usp = data.uniqueSellingPoint.toLowerCase();
  const has = (words: string[]) => words.some((w) => usp.includes(w));
  if (has(['science', 'evidence', 'research', 'study', 'data', 'phd', 'physio', 'rd ', 'dietitian'])) score['Scientific & Educational'] += 2;
  if (has(['certified', 'certification', 'years', 'experience', 'proven', 'licensed', 'accredited'])) score['Professional & Credible'] += 2;
  if (has(['fun', 'energy', 'hype', 'motivat', 'passion', 'intense'])) score['Motivational & Energetic'] += 2;
  if (has(['welcoming', 'friendly', 'judgment', 'judgement', 'community', 'supportive', 'safe space'])) score['Friendly & Approachable'] += 2;
  let best: Tone = 'Professional & Credible';
  let bestScore = -1;
  for (const tone of TONES) if (score[tone] > bestScore) { bestScore = score[tone]; best = tone; }
  return best;
}

/** The tone a request actually uses (Auto or empty → inferred). */
export function resolveTone(data: BioInput): Tone {
  return data.tone && data.tone !== 'Auto (based on your input)' ? (data.tone as Tone) : inferTone(data);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function uspSnippet(usp: string): string | null {
  const trimmed = usp.trim().replace(/\s+/g, ' ').replace(/[.。]+$/, '');
  return trimmed && countChars(trimmed) <= 45 ? trimmed : null;
}

interface Ctx { audience: string; spec: string; descriptor: string; usp: string | null; verbs: string[]; result: string }

const TEMPLATES: Record<Style, (c: Ctx) => string[]> = {
  authority: (c) => {
    const [v1, v2] = c.verbs;
    return [
      ...(c.usp ? [`${cap(c.usp)}. Coaching ${c.audience} to real ${c.spec} with ${c.descriptor}.`, `${cap(c.usp)}: ${c.spec} coaching for ${c.audience}, built on ${v1} that counts.`] : []),
      `Coaching ${c.audience} to real ${c.spec} with ${c.descriptor} and smarter ${v1}.`,
      `${cap(c.spec)} coaching built on ${c.descriptor}. No fluff, just ${v1} and ${v2}.`,
      `Helping ${c.audience} train with intent: dialed-in ${v1}, honest ${v2}.`,
      `${cap(c.descriptor)} for ${c.audience}. ${cap(c.spec)} done right.`,
    ];
  },
  results: (c) => {
    const [v1, v2] = c.verbs;
    return [
      ...(c.usp ? [`${cap(c.usp)}. ${cap(c.spec)} for ${c.audience}: ${c.result}.`, `${cap(c.usp)} turning consistent ${v1} into ${c.result} for ${c.audience}.`] : []),
      `${cap(c.spec)} that sticks. Smarter ${v1}, better ${v2}, ${c.result}.`,
      `Turning consistent ${v1} into visible ${c.spec} for ${c.audience}.`,
      `Less guessing, more ${v1}. ${cap(c.result)} for ${c.audience} who show up.`,
      `${cap(c.spec)} for ${c.audience}. Smarter ${v1}, ${c.result}.`,
    ];
  },
  community: (c) => {
    const [v1] = c.verbs;
    return [
      ...(c.usp ? [`${cap(c.usp)}. A crew of ${c.audience} chasing ${c.spec} and keeping it honest.`, `${cap(c.usp)}: ${c.audience} who train together and get strong for good.`] : []),
      `Building a crew of ${c.audience} who chase ${c.spec} and keep each other honest.`,
      `Where ${c.audience} train together, laugh often, and get strong for good.`,
      `${cap(c.spec)} with a team that has your back: ${v1}, accountability, momentum.`,
      `A home for ${c.audience} chasing ${c.spec}, together.`,
    ];
  },
  value: (c) => {
    const [v1, v2] = c.verbs;
    return [
      ...(c.usp ? [`${cap(c.usp)}. Real ${c.spec} for ${c.audience}, minus the fluff.`, `${cap(c.usp)}: smarter ${v1}, steadier ${v2}, better results.`] : []),
      `${cap(c.spec)} without the guesswork: just ${v1}, ${v2}, and momentum.`,
      `Helping ${c.audience} move better, feel stronger, and keep the ${v1}.`,
      `Real ${c.spec} for ${c.audience}. Sustainable ${v1}, zero fluff.`,
      `${cap(c.spec)} built around your life, not the other way around.`,
    ];
  },
};

function buildBio(style: Style, ctx: Ctx, emojis: [string, string]): GeneratedBio {
  const suffix = ` ${emojis[0]}${emojis[1]}`;
  for (const text of TEMPLATES[style](ctx)) {
    const full = text + suffix;
    if (countChars(full) <= MAX_BIO_CHARS) return { text: full, charCount: countChars(full) };
  }
  const safe = `${cap(ctx.spec)} coaching for ${ctx.audience}.` + suffix;
  return { text: safe, charCount: countChars(safe) };
}

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = <T,>(arr: readonly T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

export function generateBios(data: BioInput, variant = 0): GeneratedBio[] {
  const rng = mulberry32(hashString(JSON.stringify(data)) ^ (variant * 0x9e3779b9));
  const audienceList = data.targetAudience ? AUDIENCE_PHRASES[data.targetAudience] : ['everyday lifters'];
  const specPool = data.specializations.length ? data.specializations.flatMap((s) => SPEC_PHRASES[s]) : ['strength', 'lean results', 'real gains', 'mobility'];
  const tone = TONE[resolveTone(data)];
  const usp = uspSnippet(data.uniqueSellingPoint);
  const emojiPairs = shuffle(tone.emojiPairs, rng);
  const seen = new Set<string>();
  // The selling point leads at most two of the four bios, so the set does not read as four copies.
  const uspStyles = new Set(shuffle(['authority', 'results', 'community', 'value'] as Style[], rng).slice(0, 2));
  return (['authority', 'results', 'community', 'value'] as Style[]).map((style, i) => {
    const uspHere = uspStyles.has(style) ? usp : null;
    let bio = buildBio(style, { audience: pick(audienceList, rng), spec: pick(specPool, rng), descriptor: pick(tone.descriptors, rng), usp: uspHere, verbs: shuffle(FITNESS_VERBS, rng), result: pick(RESULT_PHRASES, rng) }, emojiPairs[i % emojiPairs.length]);
    let attempts = 0;
    while (seen.has(bio.text) && attempts < 5) {
      bio = buildBio(style, { audience: pick(audienceList, rng), spec: pick(specPool, rng), descriptor: pick(tone.descriptors, rng), usp: uspHere, verbs: shuffle(FITNESS_VERBS, rng), result: pick(RESULT_PHRASES, rng) }, emojiPairs[i % emojiPairs.length]);
      attempts++;
    }
    seen.add(bio.text);
    return bio;
  });
}

export function generateBioResult(data: BioInput, variant = 0): BioResult {
  return { bios: generateBios(data, variant), tone: resolveTone(data) };
}
