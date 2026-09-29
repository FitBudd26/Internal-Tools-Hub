/**
 * Vercel serverless route shared by every tool: asks Google Gemini for the
 * tool's answer (hashtag sets, a challenge framework, or recipes) in a fixed
 * JSON schema. The API key lives only in a server env var, never in the
 * frontend bundle:
 *
 *   GEMINI_API_KEY   required, without it this route answers 503 and each
 *                    tool quietly uses its built-in engine. The other names
 *                    in KEY_ENV_NAMES (e.g. geminiapi, GOOGLE_API_KEY) are
 *                    accepted too, so an existing Vercel variable just works.
 *   GEMINI_MODEL     optional, defaults to gemini-3.5-flash-lite (free tier,
 *                    fast); gemini-3.8-flash is the higher-quality free option
 *
 * Request body: { tool: 'hashtags' | 'challenge' | 'recipes' | 'igbio', ...input }.
 * Each client re-validates what the model returns, so this route only has
 * to return well-formed JSON. Any non-200 answer makes the client fall back
 * to its local engine, so users always get results.
 */

declare const process: { env: Record<string, string | undefined> };

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const UPSTREAM_TIMEOUT_MS = 20_000;

/** Env var names accepted for the Gemini key; the first one set wins. */
const KEY_ENV_NAMES = [
  'GEMINI_API_KEY',
  'geminiapi',
  'GEMINIAPI',
  'GEMINI_API',
  'GOOGLE_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'GEMINI_KEY',
  'VITE_GEMINI_API_KEY',
];

/** Exact names first, then any variable that looks like a Gemini/Google API key, whatever its casing. */
function findKey(): { key: string | null; source: string | null } {
  for (const name of KEY_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) return { key: value, source: name };
  }
  const looksLikeKey = /^(gemini_?api(_?key)?|google_?(gemini_?|generative_?ai_?)?api_?key)$/i;
  for (const [name, value] of Object.entries(process.env)) {
    if (looksLikeKey.test(name) && value?.trim()) return { key: value.trim(), source: name };
  }
  return { key: null, source: null };
}

/* -------------------------------- helpers -------------------------------- */

const STYLE_RULES = [
  'Never use em dashes or en dashes anywhere in the text; use commas, colons or periods, and plain hyphens for numeric ranges (20-30).',
  'Professional, clear, coach-facing tone. No consumer hype, no medical claims, no promises of results.',
];

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function strings(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function num(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
}

function extractText(data: unknown): string {
  const d = data as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (d.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}

interface ToolSpec {
  parse(body: Record<string, unknown>): Record<string, unknown> | null;
  prompt(input: Record<string, unknown>): string;
  schema: unknown;
  /** Turn the model's parsed JSON into the response payload, or null when unusable. */
  normalize(parsed: unknown): Record<string, unknown> | null;
  maxOutputTokens: number;
}

/* -------------------------------- hashtags -------------------------------- */

const PLATFORMS = ['Instagram', 'TikTok', 'Twitter/X', 'LinkedIn', 'YouTube', 'Facebook', 'Pinterest', 'Threads'] as const;
type Platform = (typeof PLATFORMS)[number];

const PLATFORM_GUIDANCE: Record<Platform, string> = {
  Instagram: '12-20 tags mixing broad, niche, community and intent-based tags; never only mega tags',
  TikTok: '5-8 short tags mixing niche, content-format and trend-style tags',
  'Twitter/X': '2-4 minimal, context-driven tags',
  LinkedIn: '3-6 clean, professional, industry-specific tags; no slang or viral bait',
  YouTube: '5-10 searchable tags: topic, video category and phrases people search',
  Facebook: '3-6 clean category and community tags',
  Pinterest: '8-15 evergreen, searchable discovery tags with niche variations',
  Threads: '2-5 conversational, minimal tags',
};

const PLATFORM_KEYS = new Map<string, Platform>(
  PLATFORMS.map((p) => [p.toLowerCase().replace(/[^a-z]/g, ''), p] as const),
);
PLATFORM_KEYS.set('x', 'Twitter/X');
PLATFORM_KEYS.set('twitter', 'Twitter/X');
PLATFORM_KEYS.set('xtwitter', 'Twitter/X');

function matchPlatform(raw: unknown): Platform | null {
  if (typeof raw !== 'string') return null;
  return PLATFORM_KEYS.get(raw.toLowerCase().replace(/[^a-z]/g, '')) ?? null;
}

const hashtags: ToolSpec = {
  maxOutputTokens: 4096,
  parse(o) {
    const caption = str(o.caption, 2000);
    const platforms = Array.isArray(o.platforms)
      ? [...new Set(o.platforms.map(matchPlatform).filter((p): p is Platform => p !== null))]
      : [];
    if (!caption || platforms.length === 0) return null;
    return {
      caption,
      topic: str(o.topic, 120),
      postType: str(o.postType, 40),
      tones: strings(o.tones, 9, 30),
      platforms,
      avoid: strings(o.avoid, 150, 40),
    };
  },
  prompt(input) {
    const i = input as { caption: string; topic: string; postType: string; tones: string[]; platforms: Platform[]; avoid: string[] };
    const lines = [
      'You write hashtags for one social media post. Reply with JSON only, matching this shape: {"groups":[{"platform":"<name>","hashtags":["tag","tag"]}]}.',
      '',
      `Caption: """${i.caption}"""`,
      `Topic / niche: ${i.topic || 'not given, infer it from the caption'}`,
      `Post type: ${i.postType || 'not given'}`,
      `Tone / goal: ${i.tones.length ? i.tones.join(', ') : 'not given'}`,
      '',
      'Platforms to cover (use these exact names, include every one) and what each needs:',
      ...i.platforms.map((p) => `- ${p}: ${PLATFORM_GUIDANCE[p]}`),
      '',
      'Rules:',
      '- Every hashtag must fit this specific caption, topic and post type. Prefer niche and intent tags over generic filler; never add unrelated trending tags just for reach.',
      "- Follow the caption's actual subject; do not assume a niche it does not mention.",
      '- Write each hashtag as lowercase letters and digits only, 3-28 characters, without the # sign, spaces, punctuation or emoji.',
      '- No engagement-bait or spam tags (follow4follow, like4like, followme, followback, f4f, l4l and similar).',
      '- No fyp / foryou / viral style tags on LinkedIn, Twitter/X, Facebook, Pinterest or Threads.',
      '- Give each platform its own angle: a hashtag may appear on at most three platforms.',
      '- Do not repeat hashtags that already appear in the caption.',
    ];
    if (i.avoid.length) lines.push(`- These were already suggested; return different ones: ${i.avoid.join(', ')}`);
    return lines.join('\n');
  },
  schema: {
    type: 'OBJECT',
    properties: {
      groups: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { platform: { type: 'STRING' }, hashtags: { type: 'ARRAY', items: { type: 'STRING' } } },
          required: ['platform', 'hashtags'],
        },
      },
    },
    required: ['groups'],
  },
  normalize(parsed) {
    const raw = parsed && typeof parsed === 'object' ? (parsed as { groups?: unknown }).groups : undefined;
    const seen = new Set<Platform>();
    const groups: { platform: Platform; hashtags: string[] }[] = [];
    for (const g of Array.isArray(raw) ? raw : []) {
      if (!g || typeof g !== 'object') continue;
      const platform = matchPlatform((g as { platform?: unknown }).platform);
      const tags = strings((g as { hashtags?: unknown }).hashtags, 30, 40);
      if (!platform || seen.has(platform) || tags.length === 0) continue;
      seen.add(platform);
      groups.push({ platform, hashtags: tags });
    }
    return groups.length ? { groups } : null;
  },
};

/* ------------------------------- challenge -------------------------------- */

const challenge: ToolSpec = {
  maxOutputTokens: 6144,
  parse(o) {
    const challengeTypes = strings(o.challengeTypes, 9, 40);
    if (!challengeTypes.length) return null;
    return {
      challengeTypes,
      audienceTypes: strings(o.audienceTypes, 7, 40),
      fitnessLevels: strings(o.fitnessLevels, 4, 20),
      days: num(o.days, 7, 30) ?? 28,
      equipment: strings(o.equipment, 8, 30),
      measurements: strings(o.measurements, 4, 30),
      variant: num(o.variant, 0, 99) ?? 0,
      avoidNames: strings(o.avoidNames, 10, 80),
    };
  },
  prompt(input) {
    const i = input as { challengeTypes: string[]; audienceTypes: string[]; fitnessLevels: string[]; days: number; equipment: string[]; measurements: string[]; variant: number; avoidNames: string[] };
    const weeks = i.days <= 7 ? 1 : i.days <= 14 ? 2 : i.days <= 21 ? 3 : 4;
    const labels = weeks === 1 ? `"Days 1-${i.days}"` : Array.from({ length: weeks }, (_, k) => (k === 3 && i.days > 28 ? `"Days 22-${i.days}"` : `"Week ${k + 1}"`)).join(', ');
    const noKit = i.equipment.length > 0 && i.equipment.every((e) => e === 'No Equipment' || e === 'Bodyweight Only');
    const mixed = i.fitnessLevels.includes('Mixed Levels') || i.fitnessLevels.length > 1;
    return [
      'You design client challenge frameworks for fitness professionals (coaches, trainers, gym and studio owners). Reply with JSON only, matching the schema.',
      '',
      `Challenge type(s): ${i.challengeTypes.join(', ')}`,
      `Audience: ${i.audienceTypes.join(', ') || 'coaching clients'}`,
      `Fitness level(s): ${i.fitnessLevels.join(', ') || 'mixed'}`,
      `Duration: ${i.days} days`,
      `Equipment available: ${i.equipment.join(', ') || 'unspecified'}`,
      `Measurement units the coach uses: ${i.measurements.join(', ') || 'unspecified'}`,
      `Variation seed: ${i.variant} (make this framework read differently from other seeds for the same inputs).`,
      '',
      'What a challenge is here: a set of behavioural rules, daily compliance tasks, targets, accountability mechanics, weekly themes and an optional scoring system that layers on top of the coach\'s existing training program.',
      'Hard rules:',
      '- Never prescribe exercises, sets, reps, loads, daily workouts or exercise-by-exercise plans. Training sessions are referenced only as "complete the assigned session".',
      '- Coach-facing, business-use language (clients, members, retention, engagement, deployment). No consumer transformation claims, no "lose weight fast" style copy, no medical claims.',
      '- challengeName: professional and brand-ready, something a gym or coach would actually run (examples of the style: Metabolic Ignite Challenge, Consistency Builder Challenge, The 28-Day Accountability Sprint, Recovery & Readiness Challenge).',
      `- subtitle: one line, e.g. "${i.days}-Day <focus> Challenge for <audience>".`,
      '- dailyRules: exactly 4 rules. Each has a short title and 2-4 detail bullets. Rule 1 is always completing the assigned training session (workout-agnostic, planned rest days count). Rule 2 is a daily movement target (steps or minutes). Rule 3 is a habit check tied to the challenge type (nutrition, sleep, hydration, mobility, community, etc.). Rule 4 is an accountability check-in (log completion, rate energy 1-10).',
      `- weeklyThemes: exactly ${weeks} entries with labels ${labels}, each with name, focus and coachTip.`,
      '- scoringSystem: 3-5 bullets (daily completion = 1 point, perfect week bonus, streak bonus, group option).',
      '- progressTracking: 4-8 bullets, using the coach\'s units where weight or measurements are relevant.',
      '- coachingNotes: 4-8 bullets on deploying and scaling the challenge.',
      '- clientInstructions: 4-6 short participant-facing sentences a coach can paste into an app or message.',
      ...(mixed ? ['- Fitness levels are mixed: every rule must be scalable; no intensity-specific requirements; effort cues relative (RPE), never absolute loads.'] : []),
      ...(noKit ? ['- No equipment is available: do not mention loads, machines or any equipment-dependent tracking.'] : []),
      ...(i.challengeTypes.includes('Community Engagement') || i.audienceTypes.includes('Online Community') ? ['- Emphasise leaderboards, visible check-ins, group participation and recognition.'] : []),
      ...(i.audienceTypes.includes('Corporate / Workplace Groups') ? ['- Corporate audience: emphasise simple participation, low equipment needs, compliance tracking and team completion rates.'] : []),
      ...(i.audienceTypes.includes('Social Media Audience') ? ['- Social audience: emphasise public challenge prompts, daily check-ins, shareable completion tasks and lead-generation use.'] : []),
      ...(i.avoidNames.length ? [`- Do not reuse these challenge names: ${i.avoidNames.join(', ')}.`] : []),
      ...STYLE_RULES.map((r) => `- ${r}`),
    ].join('\n');
  },
  schema: {
    type: 'OBJECT',
    properties: {
      challengeName: { type: 'STRING' },
      subtitle: { type: 'STRING' },
      objective: { type: 'STRING' },
      howItWorks: { type: 'STRING' },
      dailyRules: {
        type: 'ARRAY',
        items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, details: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['title', 'details'] },
      },
      weeklyThemes: {
        type: 'ARRAY',
        items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, name: { type: 'STRING' }, focus: { type: 'STRING' }, coachTip: { type: 'STRING' } }, required: ['label', 'name', 'focus', 'coachTip'] },
      },
      scoringSystem: { type: 'ARRAY', items: { type: 'STRING' } },
      progressTracking: { type: 'ARRAY', items: { type: 'STRING' } },
      coachingNotes: { type: 'ARRAY', items: { type: 'STRING' } },
      clientInstructions: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['challengeName', 'subtitle', 'objective', 'howItWorks', 'dailyRules', 'weeklyThemes', 'scoringSystem', 'progressTracking', 'coachingNotes', 'clientInstructions'],
  },
  normalize(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    const rules = (Array.isArray(o.dailyRules) ? o.dailyRules : [])
      .map((r) => ({ title: str((r as { title?: unknown })?.title, 120), details: strings((r as { details?: unknown })?.details, 5, 200) }))
      .filter((r) => r.title && r.details.length)
      .slice(0, 5);
    const themes = (Array.isArray(o.weeklyThemes) ? o.weeklyThemes : [])
      .map((t) => {
        const w = t as Record<string, unknown>;
        return { label: str(w?.label, 30), name: str(w?.name, 80), focus: str(w?.focus, 160), coachTip: str(w?.coachTip, 240) };
      })
      .filter((t) => t.label && t.name && t.focus && t.coachTip)
      .slice(0, 5);
    const out = {
      challengeName: str(o.challengeName, 80),
      subtitle: str(o.subtitle, 160),
      objective: str(o.objective, 600),
      howItWorks: str(o.howItWorks, 600),
      dailyRules: rules,
      weeklyThemes: themes,
      scoringSystem: strings(o.scoringSystem, 6, 200),
      progressTracking: strings(o.progressTracking, 10, 200),
      coachingNotes: strings(o.coachingNotes, 10, 240),
      clientInstructions: strings(o.clientInstructions, 8, 300),
    };
    const ok = out.challengeName && out.subtitle && out.objective && out.howItWorks && rules.length >= 3 && themes.length >= 1 && out.scoringSystem.length >= 2 && out.progressTracking.length >= 3 && out.coachingNotes.length >= 3 && out.clientInstructions.length >= 3;
    return ok ? { challenge: out } : null;
  },
};

/* -------------------------------- recipes --------------------------------- */

const recipes: ToolSpec = {
  maxOutputTokens: 6144,
  parse(o) {
    const goal = str(o.goal, 40);
    const mealTypes = strings(o.mealTypes, 7, 30);
    if (!goal || !mealTypes.length) return null;
    return {
      goal,
      proteins: strings(o.proteins, 13, 40),
      diets: strings(o.diets, 9, 30),
      mealTypes,
      cookingTime: str(o.cookingTime, 30),
      notes: str(o.notes, 600),
      count: num(o.count, 1, 5) ?? 3,
      variant: num(o.variant, 0, 99) ?? 0,
      avoidNames: strings(o.avoidNames, 15, 80),
      dailyTarget: num(o.dailyTarget, 1000, 5000),
      mealTargets: Array.isArray(o.mealTargets)
        ? o.mealTargets
            .map((m) => ({ mealType: str((m as { mealType?: unknown })?.mealType, 30), kcal: num((m as { kcal?: unknown })?.kcal, 100, 1500) }))
            .filter((m): m is { mealType: string; kcal: number } => Boolean(m.mealType && m.kcal))
            .slice(0, 7)
        : [],
    };
  },
  prompt(input) {
    const i = input as { goal: string; proteins: string[]; diets: string[]; mealTypes: string[]; cookingTime: string; notes: string; count: number; variant: number; avoidNames: string[]; dailyTarget: number | null; mealTargets: { mealType: string; kcal: number }[] };
    const diets = i.diets.filter((d) => d !== 'No Restrictions');
    const proteins = i.proteins.filter((p) => p !== 'No Preference');
    const limit = /under (\d+)/i.exec(i.cookingTime)?.[1];
    return [
      'You create practical recipes that a fitness coach shares with clients. Reply with JSON only, matching the schema.',
      '',
      `Client goal: ${i.goal}`,
      `Preferred proteins: ${proteins.length ? proteins.join(', ') : 'no preference'}`,
      `Dietary requirements (HARD constraints; every recipe must satisfy ALL of them): ${diets.length ? diets.join(', ') : 'none'}`,
      `Meal types requested: ${i.mealTypes.join(', ')}`,
      `Cooking time: ${limit ? `total time must be under ${limit} minutes` : 'flexible: no limit, and include at least one recipe of 30-45 minutes where slower or batch cooking improves the result'}`,
      ...(i.mealTargets.length ? [`Calorie targets per serving for this client (stay within 15%): ${i.mealTargets.map((m) => `${m.mealType} about ${m.kcal} kcal`).join(', ')}${i.dailyTarget ? ` (about ${i.dailyTarget} kcal per day)` : ''}.`] : []),
      `Coach's notes about the client (treat any dislikes, allergies or intolerances as HARD exclusions): ${i.notes ? `"""${i.notes}"""` : 'none'}`,
      `Variation seed: ${i.variant} (this set must feel different from other sets for the same inputs).`,
      '',
      `Return exactly ${i.count} recipes:`,
      '- Distinct from each other: different main ingredient or cooking method, never two variations of the same dish.',
      '- Cover each requested meal type at least once where possible; set mealType to one of the requested values exactly.',
      '- Protein sources: draw from the preferred list ACROSS the set, not in every recipe. Each recipe uses one or at most two protein sources, and only pairs that belong in the same dish (chicken with lentils works; beans in a chocolate oat bowl does not). Legumes (beans, lentils, chickpeas) never go into sweet or dessert-style dishes such as smoothies, shakes, oat bowls, pancakes, parfaits or puddings.',
      '- Use the preferred proteins where they comply with the dietary requirements; if a preferred protein conflicts with a requirement (for example chicken with Vegan), skip that protein.',
      '- Each recipe: a specific name, 5-9 ingredients with quantities for one serving, 3-6 short numbered steps, timeMinutes within the limit, goalAlignment (one sentence tying the ingredients or macros to the client goal), and coachingNote (one or two sentences on how a trainer uses this with clients).',
      '- Quantities: numerals only, metric first. Solids as grams with ounces in parentheses, e.g. "150 g (5 oz) raw chicken breast"; liquids as millilitres with cups or tablespoons in parentheses, e.g. "240 ml (1 cup) skimmed milk"; whole items by count, e.g. "2 eggs", "1 carrot". Never give cup measures for solid foods. Label every meat, fish, grain and legume weight as raw or cooked: meat and fish are RAW weight (the client weighs before cooking) and their nutrition is computed on raw weight; grains and legumes are cooked weight unless stated dry.',
      '- Never offer alternatives inside an ingredient line ("water or milk"); pick one and mention swaps in the coachingNote. Avoid fractional cans or packs; if unavoidable, say in the coachingNote how to use the rest.',
      '- Salt: write "salt to taste" or at most 1/4 tsp per serving, never 1 tsp; give herbs and spices their own quantities on one seasoning line, separate from salt. When canned beans or tomatoes are used, do not add salt.',
      '- Added fats (oil, butter): 1-2 tsp per serving for fat-loss clients or meals under 500 kcal; a tablespoon only for meals over 600 kcal.',
      '- Protein floor: for Fat Loss, High Protein or Muscle Building, every main meal carries at least 25 g protein and never more grams of fat than protein; snacks at least 10 g. Distribute the selected proteins evenly across the set so each selected protein appears in at least one recipe when the count allows, and never add a protein source the coach did not select (no cheese, eggs or yogurt unless they are on the list; a splash of milk is fine). A legume-only recipe rarely reaches 25 g, so pair two selected legumes (for example lentils with beans) or add a selected animal protein rather than shipping a low-protein plate.',
      '- Nutrition per serving as whole numbers (calories, proteinG, carbsG, fatG): compute from the actual quantities on the stated raw or cooked basis and count every ingredient (legumes, nut butters, oils, dairy, grains). Calories must equal 4 x protein + 4 x carbs + 9 x fat within 5%. Round figures, no false precision.',
      '- Use numerals for every number in every field, including steps and notes ("35 minutes", "2 minutes", "5 to 10 minutes"), never spelled-out numbers.',
      '- coachingNote must add something a coach can use (which clients it suits, timing around training, swaps, batch or storage advice); never restate the cooking time or the description.',
      '- Everyday supermarket ingredients, simple technique, nothing exotic or complex.',
      ...(i.avoidNames.length ? [`- Do not return these recipes or close variations of them: ${i.avoidNames.join(', ')}.`] : []),
      ...STYLE_RULES.map((r) => `- ${r}`),
      '- Nutrition is practical guidance, not a clinical prescription; never claim health outcomes.',
    ].join('\n');
  },
  schema: {
    type: 'OBJECT',
    properties: {
      recipes: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            mealType: { type: 'STRING' },
            goalAlignment: { type: 'STRING' },
            description: { type: 'STRING' },
            ingredients: { type: 'ARRAY', items: { type: 'STRING' } },
            steps: { type: 'ARRAY', items: { type: 'STRING' } },
            timeMinutes: { type: 'INTEGER' },
            nutrition: {
              type: 'OBJECT',
              properties: { calories: { type: 'INTEGER' }, proteinG: { type: 'INTEGER' }, carbsG: { type: 'INTEGER' }, fatG: { type: 'INTEGER' } },
              required: ['calories', 'proteinG', 'carbsG', 'fatG'],
            },
            coachingNote: { type: 'STRING' },
          },
          required: ['name', 'mealType', 'goalAlignment', 'description', 'ingredients', 'steps', 'timeMinutes', 'nutrition', 'coachingNote'],
        },
      },
    },
    required: ['recipes'],
  },
  normalize(parsed) {
    const raw = parsed && typeof parsed === 'object' ? (parsed as { recipes?: unknown }).recipes : undefined;
    const out: Record<string, unknown>[] = [];
    for (const r of Array.isArray(raw) ? raw : []) {
      if (!r || typeof r !== 'object') continue;
      const o = r as Record<string, unknown>;
      const n = (o.nutrition ?? {}) as Record<string, unknown>;
      const recipe = {
        name: str(o.name, 80),
        mealType: str(o.mealType, 30),
        goalAlignment: str(o.goalAlignment, 240),
        description: str(o.description, 300),
        ingredients: strings(o.ingredients, 12, 120),
        steps: strings(o.steps, 8, 240),
        timeMinutes: num(o.timeMinutes, 1, 180),
        nutrition: { calories: num(n.calories, 30, 1500), proteinG: num(n.proteinG, 0, 120), carbsG: num(n.carbsG, 0, 250), fatG: num(n.fatG, 0, 120) },
        coachingNote: str(o.coachingNote, 300),
      };
      const nutritionOk = Object.values(recipe.nutrition).every((v) => v !== null);
      if (recipe.name && recipe.description && recipe.ingredients.length >= 3 && recipe.steps.length >= 2 && recipe.timeMinutes && nutritionOk && recipe.coachingNote) out.push(recipe);
      if (out.length >= 5) break;
    }
    return out.length ? { recipes: out } : null;
  },
};

/* --------------------------------- igbio ---------------------------------- */

const igbio: ToolSpec = {
  maxOutputTokens: 2048,
  parse(o) {
    const name = str(o.name, 80);
    const businessType = str(o.businessType, 60);
    const targetAudience = str(o.targetAudience, 40);
    if (!name || !businessType || !targetAudience) return null;
    return {
      name,
      businessType,
      yearsExperience: str(o.yearsExperience, 20),
      location: str(o.location, 60),
      specializations: strings(o.specializations, 10, 40),
      targetAudience,
      uniqueSellingPoint: str(o.uniqueSellingPoint, 300),
      tone: str(o.tone, 40) || 'Professional & Credible',
      variant: num(o.variant, 0, 99) ?? 0,
      avoidBios: strings(o.avoidBios, 8, 200),
      avoidUsernames: strings(o.avoidUsernames, 16, 40),
    };
  },
  prompt(input) {
    const i = input as { name: string; businessType: string; yearsExperience: string; location: string; specializations: string[]; targetAudience: string; uniqueSellingPoint: string; tone: string; variant: number; avoidBios: string[]; avoidUsernames: string[] };
    return [
      'You write Instagram bios and username ideas for a fitness professional. Reply with JSON only, matching the schema: {"bios":["...","...","...","..."],"usernames":["...", ...]}.',
      '',
      `Name or brand: ${i.name}`,
      `Business type: ${i.businessType}`,
      `Target audience: ${i.targetAudience}`,
      `Specialisations: ${i.specializations.join(', ') || 'not given'}`,
      `Years of experience: ${i.yearsExperience || 'not given'}`,
      `Location: ${i.location || 'not given'}`,
      `Unique selling point: ${i.uniqueSellingPoint || 'not given'}`,
      `Tone: ${i.tone}`,
      `Variation seed: ${i.variant} (make this set read differently from other seeds for the same inputs).`,
      '',
      'Bios: exactly 4, each a different angle in this order: authority and credentials, client results, community and belonging, value and approach.',
      '- Hard limit 140 characters per bio including spaces and emojis (Instagram allows 150; leave headroom). Count carefully; shorter is better than cut off.',
      '- One line, no line breaks, no hashtags, no quotation marks, no em or en dashes. End with one or two fitting emojis, no more.',
      '- Speak to the target audience in the requested tone; weave in the specialisations, the years of experience and the location when given; use the selling point when it is short enough to read cleanly.',
      '- Do not start with the name (the profile shows the name already). No generic filler like "fitness enthusiast" or "living my best life".',
      'Usernames: exactly 8 Instagram handle ideas based on the name or brand, the niche, the business type and the location.',
      '- Lowercase letters, digits, periods and underscores only; 3-30 characters; no leading, trailing or doubled periods; no @.',
      '- Easy to say out loud and type; mix short brand handles with descriptive ones (e.g. coach.sam, samleefit, train.with.sam, samlee.strength); avoid numbers unless they are part of the brand.',
      ...(i.avoidBios.length ? [`- Do not reuse these bios or close variations: ${i.avoidBios.map((b) => `"${b}"`).join(' | ')}`] : []),
      ...(i.avoidUsernames.length ? [`- Do not reuse these usernames: ${i.avoidUsernames.join(', ')}`] : []),
      ...STYLE_RULES.map((r) => `- ${r}`),
    ].join('\n');
  },
  schema: {
    type: 'OBJECT',
    properties: {
      bios: { type: 'ARRAY', items: { type: 'STRING' } },
      usernames: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['bios', 'usernames'],
  },
  normalize(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    const bios = strings(o.bios, 8, 220);
    const usernames = strings(o.usernames, 16, 40).map((u) => u.replace(/^@/, '').toLowerCase());
    return bios.length || usernames.length ? { bios, usernames } : null;
  },
};

const TOOLS: Record<string, ToolSpec> = { hashtags, challenge, recipes, igbio };

/* -------------------------------- handler -------------------------------- */

interface GenerateRequest {
  method?: string;
  body?: unknown;
}

interface GenerateResponse {
  setHeader(name: string, value: string): unknown;
  status(code: number): { json(body: unknown): void; end(): void };
}

export default async function handler(
  req: GenerateRequest,
  res: GenerateResponse,
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const { key, source } = findKey();
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  // Deploy check: `curl https://<app>/api/generate` shows which env var holds the key (names only, never values).
  if (req.method === 'GET') {
    res.status(200).json({
      configured: Boolean(key),
      model,
      keySource: source,
      acceptedKeyNames: KEY_ENV_NAMES,
      tools: Object.keys(TOOLS),
    });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  if (!key) {
    res.status(503).json({ error: 'not_configured' });
    return;
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const o = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  const toolName = typeof o?.tool === 'string' && o.tool in TOOLS ? (o.tool as string) : 'hashtags';
  const spec = TOOLS[toolName];
  const input = o ? spec.parse(o) : null;
  if (!input) {
    res.status(400).json({ error: 'bad_request' });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: spec.prompt(input) }] }],
          generationConfig: {
            temperature: 0.9,
            // Generous: on thinking models the budget also covers reasoning tokens.
            maxOutputTokens: spec.maxOutputTokens,
            responseMimeType: 'application/json',
            responseSchema: spec.schema,
          },
        }),
      },
    );

    if (!upstream.ok) {
      console.error(`[${toolName}] gemini ${model} responded ${upstream.status}:`, (await upstream.text()).slice(0, 300));
      res.status(502).json({ error: 'upstream', status: upstream.status });
      return;
    }

    const payload = spec.normalize(safeJson(extractText(await upstream.json())));
    if (!payload) {
      console.error(`[${toolName}] gemini ${model} returned no usable answer`);
      res.status(502).json({ error: 'empty' });
      return;
    }
    res.status(200).json({ ...payload, model, tool: toolName });
  } catch (err) {
    console.error(`[${toolName}] gemini request failed:`, err instanceof Error ? err.message : err);
    res.status(502).json({ error: 'upstream' });
  } finally {
    clearTimeout(timer);
  }
}
