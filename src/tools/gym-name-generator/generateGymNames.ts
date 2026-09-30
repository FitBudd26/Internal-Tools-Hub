import {
  NAME_MAX_LEN,
  NAME_MAX_WORDS,
  NAME_MIN_LEN,
  RESULT_COUNT,
  type Audience,
  type GymNameInput,
  type GymType,
  type Tone,
} from './types';

/**
 * Deterministic gym name engine, ported from the standalone Gym Name
 * Generator. In the hub it is the fallback and the top-up behind Gemini
 * (see aiGymNames.ts). Same inputs always produce the same pool; the
 * `variant` argument (used by Regenerate) reshuffles which 10 of the
 * internal pool of 20 are shown.
 */

const MAX_LEN = NAME_MAX_LEN;
const MIN_LEN = NAME_MIN_LEN;
const MAX_WORDS = NAME_MAX_WORDS;
const POOL_SIZE = 20;
const DISPLAY_SIZE = RESULT_COUNT;

export interface EngineResult {
  /** Full internal pool (up to 20 names). */
  pool: string[];
  /** The 10 names shown to the user. */
  display: string[];
}

/** Existing gym brands and cheap filler that must never appear. */
const BANNED_NORMALIZED = [
  'goldsgym',
  'planetfitness',
  'anytimefitness',
  'equinox',
  'crunch',
  'orangetheory',
  'barrys',
  'snapfitness',
  'soulcycle',
  'curves',
  'ymca',
  'worldgym',
  'lafitness',
  'hyrox',
  'lifetimefitness',
  'puregym',
  'virginactive',
  'fitnessfirst',
  'blinkfitness',
  'fitbudd',
  'bestgym',
  'ultimate',
  'xtreme',
  'extreme',
];

const CORE_NOUNS = [
  'Forge',
  'Grit',
  'Iron',
  'Pulse',
  'Summit',
  'Apex',
  'Anvil',
  'Momentum',
  'Engine',
  'Haven',
  'Atlas',
  'Stride',
];

const ADJECTIVES = ['Prime', 'Elite', 'Pure', 'Bold', 'Solid', 'True', 'Peak', 'Urban'];

const SUFFIXES = [
  'Fitness',
  'Gym',
  'Athletics',
  'Performance',
  'Strength',
  'Studio',
  'Club',
  'Lab',
  'Collective',
];

const ROOM_WORDS = ['Yard', 'Room', 'House', 'Den', 'Loft', 'Box'];

const COMPOUND_TAILS = ['House', 'Lab', 'Works', 'Club', 'Culture'];

interface TypeData {
  nouns: string[];
  anchors: string[];
}

const TYPE_DATA: Record<GymType, TypeData> = {
  'Traditional Gym': {
    nouns: ['Iron', 'Steel', 'Flex', 'Muscle'],
    anchors: ['Gym', 'Fitness', 'Club'],
  },
  'CrossFit Box': {
    nouns: ['Forge', 'Engine', 'Grit', 'Surge'],
    anchors: ['CrossFit', 'Athletics'],
  },
  // HYROX is a registered race brand, so names are built from the sport (running + sleds), never the mark.
  'HYROX Training Gym': {
    nouns: ['Pace', 'Sled', 'Hybrid', 'Engine'],
    anchors: ['Racing', 'Endurance', 'Athletics'],
  },
  'Boutique Fitness Studio': {
    nouns: ['Pulse', 'Tempo', 'Sculpt', 'Glow'],
    anchors: ['Studio', 'Collective', 'Club'],
  },
  'Strength & Powerlifting': {
    nouns: ['Barbell', 'Iron', 'Anvil', 'Power'],
    anchors: ['Strength', 'Powerhouse', 'Barbell Club'],
  },
  'Yoga Studio': {
    nouns: ['Flow', 'Zen', 'Soul', 'Bloom', 'Breathe'],
    anchors: ['Yoga', 'Studio', 'Space'],
  },
  'Pilates Studio': {
    nouns: ['Align', 'Reform', 'Balance', 'Core'],
    anchors: ['Pilates', 'Studio'],
  },
  'MMA & Boxing': {
    nouns: ['Combat', 'Rumble', 'Ring', 'Clutch'],
    anchors: ['Boxing', 'MMA', 'Academy'],
  },
  'Functional Training': {
    nouns: ['Primal', 'Motion', 'Engine', 'Forge'],
    anchors: ['Training', 'Performance', 'Athletics'],
  },
  'Calisthenics Training Gym': {
    nouns: ['Gravity', 'Lever', 'Rings', 'Bars'],
    anchors: ['Calisthenics', 'Movement', 'Athletics'],
  },
  'Personal Training Studio': {
    nouns: ['Method', 'Precision', 'Progress', 'Momentum'],
    anchors: ['Training Co.', 'Studio', 'Lab'],
  },
  'Wellness & Recovery': {
    nouns: ['Thrive', 'Renew', 'Restore', 'Balance'],
    anchors: ['Wellness', 'Studio', 'Space'],
  },
  'Women’s Fitness Studio': {
    nouns: ['Bloom', 'Grace', 'Empower', 'Sculpt'],
    anchors: ['Studio', 'Collective', 'Fitness'],
  },
  'Sports Performance': {
    nouns: ['Apex', 'Velocity', 'Prime', 'Podium'],
    anchors: ['Performance', 'Athletics', 'Lab'],
  },
};

const AUDIENCE_WORDS: Record<Audience, string[]> = {
  'Everyone / General Fitness': ['True', 'Daily', 'Prime'],
  'Serious Athletes': ['Elite', 'Peak', 'Podium'],
  Women: ['Bloom', 'Grace', 'Empower'],
  'Busy Professionals': ['Momentum', 'Express', 'Prime'],
  Beginners: ['Foundation', 'Kickstart', 'First Rep'],
  'Seniors & Active Aging': ['Vital', 'Evergreen', 'Ageless'],
  'Youth & Teens': ['Rise', 'Spark', 'NextGen'],
  Bodybuilders: ['Titan', 'Physique', 'Sculpt'],
  'Combat Sports Athletes': ['Warrior', 'Combat', 'Ring'],
  'Families & Community': ['Community', 'Tribe', 'Village'],
};

/** Extra flavor unlocked by tone selection. */
const TONE_EXTRAS: Record<Tone, { nouns: string[]; rooms: string[] }> = {
  Professional: { nouns: [], rooms: ['Lab'] },
  Trendy: { nouns: [], rooms: ['Society', 'District'] },
  Playful: { nouns: ['Sweat', 'Flex', 'Hustle'], rooms: ['Shack', 'Factory', 'Spot'] },
  Minimalist: { nouns: [], rooms: [] },
  Unique: { nouns: [], rooms: ['Foundry', 'Vault', 'Republic'] },
};

type Fmt =
  | 'nounSuffix'
  | 'adjNoun'
  | 'theRoom'
  | 'compound'
  | 'houseOf'
  | 'soloNoun'
  | 'nameSuffix'
  | 'nameMethod'
  | 'possessive'
  | 'nameCo'
  | 'keyword';

/** Extra points for the more distinctive, brandable formats. */
const FMT_BONUS: Record<Fmt, number> = {
  nounSuffix: 0,
  adjNoun: 0,
  theRoom: 4,
  compound: 2,
  houseOf: 3,
  soloNoun: 0,
  nameSuffix: 4,
  nameMethod: 3,
  possessive: 3,
  nameCo: 3,
  keyword: 2,
};

/** Per-format caps in the strict selection pass. */
const FMT_CAP: Partial<Record<Fmt, number>> = {
  soloNoun: 1,
  possessive: 1,
  houseOf: 2,
};

interface Candidate {
  name: string;
  fmt: Fmt;
  tones: Tone[];
  hasType: boolean;
  hasAudience: boolean;
  hasName: boolean;
  hasKeyword: boolean;
  /** Content words, for capping how often one word appears across the pool. */
  words: string[];
  /** Order-independent key so mirror builds (Iron Summit / Summit Iron) don't both show. */
  pairKey?: string;
}

/* ---------------------------------- utils --------------------------------- */

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

function titleCaseWord(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
}

/** Lowercase letters only, used for dedupe and ban checks. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

/** Order- and punctuation-insensitive key for comparing two names. */
export const nameKey = normalize;

const SMALL_WORDS = new Set(['of', 'and', 'the']);

/** Title-case words that arrive all lowercase or shouting; leave MMA, HIIT and GritHouse alone. */
function tidyCase(name: string): string {
  return name
    .split(' ')
    .map((w, i) => {
      if (/^[a-z]/.test(w) && w === w.toLowerCase()) return i > 0 && SMALL_WORDS.has(w) ? w : titleCaseWord(w);
      if (w.length > 4 && w === w.toUpperCase() && /^[A-Z]+$/.test(w)) return titleCaseWord(w);
      return w;
    })
    .join(' ');
}

/** Content words of a name, splitting compounds (GritHouse → grit, house). */
export function contentWords(name: string): string[] {
  return name
    .replace(/'s\b/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(normalize)
    .filter((w) => w.length >= 3 && !SMALL_WORDS.has(w));
}

/**
 * A name that meets every rule, else null. Gates what the model returns:
 * curly apostrophes are straightened and sloppy casing is tidied first.
 */
export function validGymName(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const name = clean(tidyCase(raw.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim()));
  if (!name) return null;
  // A name must not start with a lowercase letter or be a lone small word.
  if (!/^[A-Z]/.test(name)) return null;
  return name;
}

/**
 * Validate and tidy a raw gym name. Letters, spaces, one possessive
 * apostrophe, and a trailing "Co." are allowed. No digits, 4-24 chars,
 * at most 4 words. Returns null when the candidate cannot be salvaged.
 */
function clean(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (!/^[A-Za-z][A-Za-z' .]*[A-Za-z.]$/.test(name)) return null;
  if (/\d/.test(name)) return null;
  if ((name.match(/'/g) ?? []).length > 1) return null;
  if (name.includes('.') && !name.endsWith('Co.')) return null;
  if ((name.match(/\./g) ?? []).length > 1) return null;
  const words = name.split(' ');
  if (words.length > MAX_WORDS) return null;
  if (words.some((w) => w.replace(/['.]/g, '').length < 2)) return null;
  if (name.length < MIN_LEN || name.length > MAX_LEN) return null;
  const norm = normalize(name);
  if (BANNED_NORMALIZED.some((b) => norm.includes(b))) return null;
  return name;
}

/** First and last name, title-cased, letters only. */
function nameParts(fullName: string): { first: string; last: string } {
  const tokens = fullName
    .trim()
    .split(/\s+/)
    .map((t) => titleCaseWord(t.replace(/[^A-Za-z]/g, '')))
    .filter((t) => t.length >= 2);
  return {
    first: tokens[0] ?? '',
    last: tokens.length > 1 ? tokens[tokens.length - 1] : '',
  };
}

/** Keyword: up to two title-cased words, letters only. */
function cleanKeyword(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => titleCaseWord(w.replace(/[^A-Za-z]/g, '')))
    .filter((w) => w.length >= 2)
    .slice(0, 2)
    .join(' ');
}

/* -------------------------------- generator -------------------------------- */

export function generateGymNames(input: GymNameInput, variant = 0): EngineResult {
  const seed = hashString(
    JSON.stringify([
      input.fullName.trim().toLowerCase(),
      [...input.gymTypes].sort(),
      [...input.audiences].sort(),
      [...input.tones].sort(),
      input.keyword.trim().toLowerCase(),
    ]),
  );
  const rng = mulberry32(seed);

  const { first, last } = nameParts(input.fullName);
  const keyword = cleanKeyword(input.keyword);

  const typeNouns = [...new Set(input.gymTypes.flatMap((t) => TYPE_DATA[t].nouns))];
  const anchors = [...new Set(input.gymTypes.flatMap((t) => TYPE_DATA[t].anchors))];
  const audienceWords = [
    ...new Set(input.audiences.flatMap((a) => AUDIENCE_WORDS[a])),
  ];
  const toneNouns = [
    ...new Set(input.tones.flatMap((t) => TONE_EXTRAS[t].nouns)),
  ];
  const rooms = [
    ...new Set([...ROOM_WORDS, ...input.tones.flatMap((t) => TONE_EXTRAS[t].rooms)]),
  ];

  // Noun pool with the most specific words first.
  const nouns = [...new Set([...typeNouns, ...toneNouns, ...audienceWords, ...CORE_NOUNS])];

  const candidates: Candidate[] = [];
  const push = (
    raw: string,
    fmt: Fmt,
    tones: Tone[],
    flags: Partial<
      Pick<Candidate, 'hasType' | 'hasAudience' | 'hasName' | 'hasKeyword'>
    >,
    opts?: { parts?: string[]; mirror?: boolean },
  ) => {
    const name = clean(raw);
    if (!name) return;
    // Content words for repetition control: explicit parts (compounds) or
    // the name's own words minus connectors.
    const words = (
      opts?.parts ?? name.replace(/'s\b/g, '').split(' ')
    )
      .map(normalize)
      .filter((w) => w.length >= 3 && w !== 'the');
    candidates.push({
      name,
      fmt,
      tones,
      hasType: flags.hasType ?? false,
      hasAudience: flags.hasAudience ?? false,
      hasName: flags.hasName ?? false,
      hasKeyword: flags.hasKeyword ?? false,
      words,
      pairKey:
        opts?.mirror && opts.parts
          ? [...opts.parts].sort().join('|')
          : undefined,
    });
  };

  const isType = (w: string) => typeNouns.includes(w) || anchors.includes(w);
  const isAudience = (w: string) => audienceWords.includes(w);

  /* Noun + suffix/anchor: "Forge Athletics", "Bloom Yoga" */
  for (const n of nouns) {
    for (const s of [...anchors, ...SUFFIXES]) {
      if (normalize(n) === normalize(s)) continue;
      push(
        `${n} ${s}`,
        'nounSuffix',
        ['Professional', 'Minimalist', 'Trendy'],
        { hasType: isType(n) || isType(s), hasAudience: isAudience(n) },
      );
    }
  }

  /* Adjective + noun: "Prime Forge", "Elite Iron" */
  for (const adj of [...audienceWords, ...ADJECTIVES].slice(0, 8)) {
    for (const n of [...typeNouns, ...CORE_NOUNS].slice(0, 8)) {
      if (normalize(adj) === normalize(n)) continue;
      push(
        `${adj} ${n}`,
        'adjNoun',
        ['Minimalist', 'Unique'],
        { hasType: isType(n), hasAudience: isAudience(adj) },
        { parts: [adj, n], mirror: true },
      );
    }
  }

  /* "The X Y": "The Iron Yard", "The Sweat Society", "The Engine Room" */
  for (const n of nouns.slice(0, 10)) {
    for (const r of rooms) {
      if (normalize(n) === normalize(r)) continue;
      push(
        `The ${n} ${r}`,
        'theRoom',
        ['Trendy', 'Playful', 'Unique'],
        { hasType: isType(n), hasAudience: isAudience(n) },
      );
    }
  }

  /* Compounds: "GritHouse", "SweatLab", "IronWorks" */
  for (const n of nouns.slice(0, 10)) {
    if (n.includes(' ')) continue;
    for (const tail of COMPOUND_TAILS) {
      if (normalize(n) === normalize(tail)) continue;
      push(
        `${n}${tail}`,
        'compound',
        ['Trendy', 'Unique'],
        { hasType: isType(n), hasAudience: isAudience(n) },
        { parts: [n, tail], mirror: true },
      );
    }
  }

  /* "House of Grit" */
  for (const n of nouns.slice(0, 8)) {
    if (n.includes(' ')) continue;
    push(`House of ${n}`, 'houseOf', ['Trendy', 'Unique'], {
      hasType: isType(n),
      hasAudience: isAudience(n),
    });
  }

  /* Single strong word: "Forge", "Apex". Only for the Minimalist tone. */
  if (input.tones.includes('Minimalist')) {
    for (const n of [...typeNouns, ...CORE_NOUNS].slice(0, 6)) {
      if (n.includes(' ')) continue;
      push(n, 'soloNoun', ['Minimalist'], { hasType: isType(n) });
    }
  }

  /* Owner-name formats */
  if (last) {
    for (const s of [...anchors, ...SUFFIXES].slice(0, 8)) {
      push(`${last} ${s}`, 'nameSuffix', ['Professional'], {
        hasName: true,
        hasType: isType(s),
      });
    }
    push(`The ${last} Method`, 'nameMethod', ['Professional', 'Unique'], {
      hasName: true,
    });
    push(`${last} Training Co.`, 'nameCo', ['Professional'], {
      hasName: true,
    });
  }
  if (first) {
    for (const n of nouns.slice(0, 4)) {
      if (n.includes(' ')) continue;
      push(`${first}'s ${n} House`, 'possessive', ['Playful'], {
        hasName: true,
        hasType: isType(n),
      });
    }
  }

  /* Keyword formats */
  if (keyword) {
    for (const s of [...anchors, ...SUFFIXES].slice(0, 8)) {
      if (normalize(keyword) === normalize(s)) continue;
      push(`${keyword} ${s}`, 'keyword', ['Professional', 'Minimalist'], {
        hasKeyword: true,
        hasType: isType(s),
      });
    }
    if (!keyword.includes(' ')) {
      for (const r of rooms.slice(0, 4)) {
        push(`The ${keyword} ${r}`, 'keyword', ['Trendy', 'Playful'], {
          hasKeyword: true,
        });
      }
    }
  }

  /* Scoring */
  const scored = candidates.map((c) => {
    let s = 58 - c.name.length * 0.8;
    if (c.hasType) s += 10;
    if (c.hasAudience) s += 6;
    if (c.hasName) s += 12;
    if (c.hasKeyword) s += 14;
    if (c.tones.some((t) => input.tones.includes(t))) s += 6;
    s += FMT_BONUS[c.fmt];
    if (c.name.length >= 8 && c.name.length <= 16) s += 2;
    if (c.name.length >= 20) s -= 4;
    if (/\s(Gym|Fitness)$/.test(c.name)) s -= 3; // fine, but shouldn't dominate
    if (!c.hasType && !c.hasAudience && !c.hasName && !c.hasKeyword) s -= 8;
    s += rng() * 4; // deterministic jitter for variety between users
    return { c, s };
  });
  scored.sort((a, b) => b.s - a.s);

  /*
   * Selection: score order with per-format caps, mirror control, and a cap
   * on how often any single word appears, so one strong word (Ring, Bloom)
   * can't fill half the list.
   */
  const pool: string[] = [];
  const used = new Set<string>();
  const pairKeys = new Set<string>();
  const perFmt = new Map<Fmt, number>();
  const wordUse = new Map<string, number>();

  for (const strict of [true, false]) {
    for (const { c } of scored) {
      if (pool.length >= POOL_SIZE) break;
      const norm = normalize(c.name);
      if (used.has(norm)) continue;
      if (strict) {
        if (c.pairKey && pairKeys.has(c.pairKey)) continue;
        if ((perFmt.get(c.fmt) ?? 0) >= (FMT_CAP[c.fmt] ?? 3)) continue;
        if (c.words.some((w) => (wordUse.get(w) ?? 0) >= 2)) continue;
      }
      used.add(norm);
      if (c.pairKey) pairKeys.add(c.pairKey);
      perFmt.set(c.fmt, (perFmt.get(c.fmt) ?? 0) + 1);
      for (const w of c.words) wordUse.set(w, (wordUse.get(w) ?? 0) + 1);
      pool.push(c.name);
    }
    if (pool.length >= POOL_SIZE) break;
  }

  /* Display: top 10, or a reshuffled 10 from the pool for regenerate. */
  let display: string[];
  if (variant === 0) {
    display = pool.slice(0, DISPLAY_SIZE);
  } else {
    const shuffleRng = mulberry32(seed ^ hashString(`variant-${variant}`));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(shuffleRng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    display = shuffled.slice(0, DISPLAY_SIZE);
  }

  return { pool, display };
}
