import type {
  HashtagFormState,
  Platform,
  PlatformHashtags,
  PostType,
  ToneGoal,
} from '../types';

/**
 * Deterministic, client-side hashtag generation.
 * Blends caption keywords, the topic field, post type, tone/goal, and
 * platform norms into a per-platform tag list. Same inputs always produce
 * the same lists; the `variant` argument ("Regenerate") reshuffles which
 * tags are picked from each platform's internal pool.
 */

const MAX_TAG_LEN = 28;

/** Spammy engagement-bait tags that hurt reach — never suggest. */
const BANNED = new Set([
  'follow4follow',
  'followforfollow',
  'like4like',
  'likeforlike',
  'follow',
  'followme',
  'followback',
  'f4f',
  'l4l',
  'likes',
]);

const STOPWORDS = new Set(
  (
    'the a an and or but if then than that this these those it its i im me my ' +
    'we our us you your he she his her they them their is are was were be been ' +
    'being am do does did done have has had having will would can could should ' +
    'shall may might must not no yes so very just get got getting go going gone ' +
    'to of in on at by for with from up down out off over under again once here ' +
    'there when where why how what which who whom all any both each few more ' +
    'most other some such only own same too s t don now as into about between ' +
    'because while during before after above below through new one two also ' +
    'today really lets let dont cant wont didnt isnt arent thats youre were ' +
    'ive youve weve theyre'
  ).split(/\s+/),
);

/** Curated expansions for common niches; unknown topics get generic suffixes. */
const TOPIC_MAP: Record<string, string[]> = {
  fitness: ['fitness', 'fitfam', 'fitnessmotivation', 'workout', 'training', 'healthylifestyle'],
  gym: ['gym', 'gymlife', 'gymmotivation', 'fitfam', 'workout'],
  workout: ['workout', 'workoutmotivation', 'training', 'fitfam'],
  yoga: ['yoga', 'yogalife', 'yogapractice', 'mindfulness', 'wellness'],
  pilates: ['pilates', 'pilatesbody', 'corestrength', 'wellness'],
  nutrition: ['nutrition', 'healthyeating', 'mealprep', 'macros', 'healthyfood'],
  crossfit: ['crossfit', 'wod', 'functionalfitness', 'crossfitcommunity'],
  running: ['running', 'runnersofinstagram', 'runhappy', 'marathontraining'],
  weightloss: ['weightloss', 'weightlossjourney', 'fatloss', 'healthyhabits'],
  coaching: ['coaching', 'onlinecoach', 'personaltrainer', 'coachlife'],
  travel: ['travel', 'wanderlust', 'travelgram', 'adventure', 'explore'],
  food: ['food', 'foodie', 'foodstagram', 'homecooking', 'recipes'],
  tech: ['tech', 'technology', 'innovation', 'gadgets', 'ai'],
  fashion: ['fashion', 'style', 'ootd', 'outfitinspo'],
  beauty: ['beauty', 'skincare', 'makeup', 'selfcare'],
  business: ['business', 'entrepreneur', 'smallbusiness', 'startup'],
  marketing: ['marketing', 'digitalmarketing', 'contentmarketing', 'socialmedia'],
  music: ['music', 'musician', 'newmusic', 'livemusic'],
  art: ['art', 'artist', 'artwork', 'creative'],
  photography: ['photography', 'photooftheday', 'photographer', 'visualstorytelling'],
};

const POST_TYPE_TAGS: Record<PostType, string[]> = {
  'Motivational Quote': ['motivation', 'quoteoftheday', 'dailymotivation', 'mindset', 'inspiration'],
  'Workout Video': ['workoutvideo', 'trainingday', 'exercise', 'fitnessvideo', 'sweat'],
  'Product Launch': ['newlaunch', 'productlaunch', 'comingsoon', 'newproduct', 'launchday'],
  Vlog: ['vlog', 'dayinthelife', 'vlogger', 'behindthescenes'],
  Meme: ['meme', 'memes', 'funny', 'relatable', 'humor'],
  'Lifestyle Post': ['lifestyle', 'dailylife', 'liveauthentic', 'lifestyleblogger'],
  'Educational Post': ['educational', 'tips', 'howto', 'didyouknow', 'learnsomethingnew'],
  'Transformation Post': ['transformation', 'beforeandafter', 'progress', 'fitnessjourney'],
  'Client Result': ['clientresults', 'successstory', 'testimonial', 'results', 'proudcoach'],
  Tutorial: ['tutorial', 'howto', 'stepbystep', 'learnwithme', 'protips'],
  Carousel: ['carousel', 'savethispost', 'swipe', 'infographic'],
  'Reel / Short Video': ['reels', 'reelsinstagram', 'shortvideo', 'reelitfeelit'],
  Announcement: ['announcement', 'bignews', 'staytuned', 'excitingnews'],
  'Brand Story': ['brandstory', 'behindthebrand', 'ourstory', 'smallbusiness'],
};

const TONE_TAGS: Record<ToneGoal, string[]> = {
  Reach: ['explorepage', 'discover', 'viral', 'trendingnow'],
  Engagement: ['letsconnect', 'jointheconversation', 'shareyourstory', 'tagafriend'],
  Trending: ['trending', 'viralvideo', 'fyp', 'whatstrending'],
  Professional: ['professional', 'expertadvice', 'industryinsights', 'thoughtleadership'],
  Aesthetic: ['aesthetic', 'visualsoflife', 'moodboard', 'minimalstyle'],
  Educational: ['educationalcontent', 'learnontiktok', 'knowledgesharing', 'quicktips'],
  Community: ['community', 'communityovercompetition', 'bettertogether', 'supporteachother'],
  Sales: ['shopnow', 'newarrival', 'limitedoffer', 'linkinbio'],
  'Brand Awareness': ['brandawareness', 'supportsmallbusiness', 'meetthebrand', 'ourmission'],
};

interface PlatformSpec {
  count: number;
  staples: string[];
  /** How many staples get guaranteed slots. */
  reserve: number;
  banned: Set<string>;
}

const VIRAL_TAGS = new Set(['fyp', 'foryou', 'foryoupage', 'viral', 'viralvideo', 'trendingnow']);
const CASUAL_TAGS = new Set(['meme', 'memes', 'funny', 'relatable', 'tagafriend']);

const PLATFORM_SPECS: Record<Platform, PlatformSpec> = {
  Instagram: {
    count: 15,
    staples: ['instadaily', 'explorepage'],
    reserve: 1,
    banned: new Set(),
  },
  TikTok: {
    count: 6,
    staples: ['fyp', 'foryoupage', 'tiktok'],
    reserve: 2,
    banned: new Set(),
  },
  'Twitter/X': {
    count: 3,
    staples: [],
    reserve: 0,
    banned: VIRAL_TAGS,
  },
  LinkedIn: {
    count: 5,
    staples: ['careergrowth', 'professionaldevelopment'],
    reserve: 1,
    banned: new Set([...VIRAL_TAGS, ...CASUAL_TAGS]),
  },
  YouTube: {
    count: 4,
    staples: ['youtube', 'subscribe'],
    reserve: 1,
    banned: new Set(),
  },
  Facebook: {
    count: 3,
    staples: [],
    reserve: 0,
    banned: VIRAL_TAGS,
  },
  Pinterest: {
    count: 8,
    staples: ['inspiration', 'ideas'],
    reserve: 1,
    banned: VIRAL_TAGS,
  },
  Threads: {
    count: 2,
    staples: ['threads'],
    reserve: 1,
    banned: VIRAL_TAGS,
  },
};

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

/** Normalize a raw candidate into a valid tag, or null. */
function cleanTag(raw: string): string | null {
  const tag = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (tag.length < 3 || tag.length > MAX_TAG_LEN) return null;
  if (!/^[a-z]/.test(tag)) return null;
  if (BANNED.has(tag)) return null;
  return tag;
}

/** Caption filler that makes a weak standalone tag (fine inside bigrams). */
const WEAK_WORDS = new Set([
  'day', 'days', 'lower', 'upper', 'first', 'finished', 'favorite',
  'love', 'loves', 'loved', 'else', 'thing', 'things', 'feel', 'feels',
  'felt', 'want', 'wants', 'need', 'needs', 'know', 'make', 'makes',
  'made', 'back', 'time', 'year', 'week', 'sharing', 'share',
]);

/** Keywords and two-word phrases from the caption, plus its existing tags. */
function extractCaptionTags(caption: string): {
  words: string[];
  bigrams: string[];
  existing: Set<string>;
} {
  const existing = new Set(
    (caption.match(/#([a-zA-Z0-9_]+)/g) ?? []).map((t) =>
      t.slice(1).toLowerCase().replace(/[^a-z0-9]/g, ''),
    ),
  );
  const noTags = caption.replace(/#[a-zA-Z0-9_]+/g, ' ').replace(/@\S+/g, ' ');

  const isContent = (w: string) =>
    w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w);

  const freq = new Map<string, number>();
  const bigrams: string[] = [];
  // Sentence segments keep bigrams from bridging punctuation ("gym! New
  // squat" must not become gymsquat); raw adjacency keeps them honest
  // ("day at the gym" must not become daygym).
  for (const segment of noTags.split(/[.!?,;:\n()]+/)) {
    const raw = segment
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    for (let i = 0; i < raw.length; i++) {
      const w = raw[i];
      if (isContent(w) && !WEAK_WORDS.has(w)) {
        freq.set(w, (freq.get(w) ?? 0) + 1);
      }
      if (i < raw.length - 1) {
        const next = raw[i + 1];
        const joined = w + next;
        if (
          isContent(w) &&
          isContent(next) &&
          !WEAK_WORDS.has(w) && // weak lead word → verb/ordinal junk
          joined.length <= MAX_TAG_LEN &&
          !bigrams.includes(joined)
        ) {
          bigrams.push(joined);
        }
      }
    }
  }

  const words = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([w]) => w)
    .slice(0, 6);

  return { words, bigrams: bigrams.slice(0, 3), existing };
}

/** Topic field → direct tags plus curated or generic expansions. */
function topicTags(topic: string): string[] {
  const terms = topic
    .toLowerCase()
    .split(/[,/]+/)
    .map((t) => t.trim().replace(/[^a-z0-9 ]/g, ''))
    .filter(Boolean)
    .slice(0, 3);
  const out: string[] = [];
  for (const term of terms) {
    const key = term.replace(/\s+/g, '');
    out.push(key);
    const curated = TOPIC_MAP[key];
    if (curated) {
      out.push(...curated);
    } else {
      out.push(`${key}life`, `${key}community`, `${key}tips`, `${key}lovers`);
    }
  }
  return out;
}

/* -------------------------------- generator -------------------------------- */

export function generateHashtags(
  input: HashtagFormState,
  variant = 0,
): PlatformHashtags[] {
  const seed = hashString(
    JSON.stringify([
      input.caption.trim().toLowerCase(),
      input.topic.trim().toLowerCase(),
      input.postType,
      [...input.platforms].sort(),
      [...input.tones].sort(),
    ]),
  );

  const caption = extractCaptionTags(input.caption);
  const topics = topicTags(input.topic);
  const typeTags = input.postType ? POST_TYPE_TAGS[input.postType] : [];
  const toneTags = input.tones.flatMap((t) => TONE_TAGS[t]);
  const fill = [
    'contentcreator',
    'dailyinspiration',
    'goodvibes',
    'community',
    'motivation',
    'lifestyle',
    'positivevibes',
    'growthmindset',
    'creativecontent',
    'dailycontent',
    'keepshowingup',
  ];

  return input.platforms.map((platform) => {
    const spec = PLATFORM_SPECS[platform];
    const rng = mulberry32(seed ^ hashString(platform));

    const pool: string[] = [];
    const used = new Set<string>(caption.existing); // don't repeat the caption's own tags
    const add = (raw: string) => {
      if (pool.length >= spec.count * 2) return;
      const tag = cleanTag(raw);
      if (!tag || used.has(tag) || spec.banned.has(tag)) return;
      used.add(tag);
      pool.push(tag);
    };

    // Platform-flavored extras.
    const flavored: string[] = [];
    if (platform === 'Pinterest') {
      for (const t of topics.slice(0, 2)) flavored.push(`${t}inspiration`, `${t}ideas`);
    }
    if (platform === 'YouTube' && input.postType === 'Reel / Short Video') {
      flavored.push('shorts', 'youtubeshorts');
    }
    if (platform === 'Instagram' && input.postType === 'Reel / Short Video') {
      flavored.push('instareels');
    }

    // Guaranteed staple slots first, then relevance-ordered tiers.
    for (const s of spec.staples.slice(0, spec.reserve)) add(s);
    const tiers = [
      topics.slice(0, 3), // the user's explicit topic comes first
      caption.bigrams,
      caption.words,
      topics.slice(3),
      typeTags,
      flavored,
      toneTags,
      spec.staples.slice(spec.reserve),
      fill,
    ];
    for (const tier of tiers) {
      // Deterministic within-tier shuffle keeps lists fresh between users
      // without hurting relevance ordering across tiers.
      const shuffled = [...tier];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      for (const t of shuffled) add(t);
    }

    let tags: string[];
    if (variant === 0) {
      tags = pool.slice(0, spec.count);
    } else {
      const shuffleRng = mulberry32(seed ^ hashString(`${platform}-v${variant}`));
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(shuffleRng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      tags = shuffled.slice(0, spec.count);
    }

    return { platform, tags };
  });
}
