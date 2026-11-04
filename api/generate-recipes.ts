/**
 * Vercel serverless route for the Atkins Diet Recipe Generator: asks Google
 * Gemini for three original low-carb recipes that follow the selected Atkins
 * plan and phase, computes each recipe's nutrition from its ingredient
 * quantities with the tool's reference data, checks every recipe against the
 * plan rules (atkinsRules.ts), restrictions, selected proteins and cooking
 * time, and returns only recipes that pass. The API key lives in server env
 * vars only, never in the frontend bundle:
 *
 *   GEMINI_API_KEY        required, without it this route answers 503 (the
 *                         tool shows an error; there is no canned recipe
 *                         library, by design). The alternative names accepted
 *                         by api/generate.ts work here too.
 *   GEMINI_MODEL_ATKINS   optional, model for this tool only
 *   GEMINI_MODEL          optional, shared default (gemini-3.5-flash-lite,
 *                         a free-tier Flash model; the route never switches
 *                         models on its own)
 *
 * Request body: see generateRecipesRequestSchema (recipe preferences only;
 * the browser never sends the user's name or email here).
 * Responses: 200 { set, model, attempt }
 *            400 bad_request · 429 rate_limited · 503 not_configured
 *            502 upstream | invalid (fewer than three recipes passed after
 *            every attempt)
 *
 * Free-tier protection: a per-IP window, a per-instance concurrency cap, a
 * 429 from Gemini is passed through as 429, and at most three model calls
 * per request (the later ones only ask for the recipes still missing).
 */

import { generateRecipesRequestSchema, rawRecipeSetSchema, type GenerateRecipesRequest, type RawRecipe } from '../src/tools/atkins-recipe-generator/schema.js';
import { COOKING_TIME_LIMITS, UNITS, type Ingredient, type MealType, type Recipe, type RecipeConfig, type RecipeSet } from '../src/tools/atkins-recipe-generator/types.js';
import { avoidTerms, checkRecipe, mealNetCarbGuide, planPromptLines, profileFor, resolveProteins, suitabilityLine, type PlanProfile } from '../src/tools/atkins-recipe-generator/atkinsRules.js';
import { findFood, resolveNutrition } from '../src/tools/atkins-recipe-generator/nutrition.js';

declare const process: { env: Record<string, string | undefined> };

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
/** vercel.json gives this route 45 s; keep a margin for the response. */
const TOTAL_BUDGET_MS = 40_000;
const ATTEMPT_MS = 18_000;
const MAX_OUTPUT_TOKENS = 8192;
const MAX_ATTEMPTS = 3;
const COUNT = 3;

/* ------------------------------- API key -------------------------------- */

const KEY_ENV_NAMES = ['GEMINI_API_KEY', 'geminiapi', 'GEMINIAPI', 'GEMINI_API', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_GEMINI_API_KEY', 'GEMINI_KEY', 'VITE_GEMINI_API_KEY'];

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

/* ----------------------------- rate limiting ---------------------------- */

const WINDOW_MS = 10 * 60_000;
const PER_IP_PER_WINDOW = 12;
const MAX_INFLIGHT = 4;
const hits = new Map<string, number[]>();
let inflight = 0;

function clientIp(req: RecipesRequest): string {
  const raw = req.headers?.['x-forwarded-for'];
  const first = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0]?.trim();
  return first || 'unknown';
}

function overLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_IP_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return false;
}

/* -------------------------------- helpers ------------------------------- */

const STYLE_RULES = [
  'Never use em dashes or en dashes anywhere in the text; use commas, colons or periods, and plain hyphens for numeric ranges (3-5).',
  'Use numerals for every number ("2 minutes", "150 g"), never spelled-out numbers.',
  'Professional, practical tone for a fitness coach and their clients. No consumer hype, no weight-loss promises, no medical, metabolic or fat-burning claims, no mention of ketosis guarantees.',
  'Do not copy recipes from Atkins or any publisher, do not mention Atkins logos, trademarks or endorsements, and never describe a recipe as Atkins-approved.',
  'Return only valid JSON matching the schema. No Markdown, no commentary outside the JSON object.',
];

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function extractText(data: unknown): string {
  const d = (data ?? {}) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (d.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}

/** Dashes to hyphens, whitespace collapsed, stray Markdown emphasis removed. */
function tidy(s: string | undefined): string {
  return (s ?? '')
    .replace(/[–—]/g, '-')
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The user's free text is data, never instructions: control characters and markup-ish characters go. */
function sanitizeFreeText(s: string): string {
  return s
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>`{}[\]"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

/* -------------------------------- prompt -------------------------------- */

const CUISINE_HINTS: Record<string, string> = {
  'Any Cuisine': 'any cuisine; vary the styles across the set so the three recipes feel different from each other',
  American: 'American comfort cooking: skillets, sheet-pan roasts, bunless burgers, cobb-style salads, buffalo and ranch flavours, breakfast scrambles',
  Mediterranean: 'Mediterranean: grilled fish and chicken, olive oil, lemon, garlic, oregano, olives, feta, tomatoes, zucchini, eggplant, leafy salads',
  Indian: 'Indian: tandoori and tikka spice rubs, paneer, cauliflower-based preparations, spiced non-starchy vegetables, ghee, ginger, garlic, garam masala, coconut-based curries without rice or flatbread',
  Mexican: 'Mexican: fajita bowls, lettuce-wrapped tacos, grilled proteins, avocado and guacamole, salsa, lime, cilantro, jalapeño, queso fresco, cauliflower rice',
  Italian: 'Italian: zucchini noodles, cauliflower risotto, parmesan, mozzarella, basil, garlic, tomato, olive oil, Italian herbs, meatballs without breadcrumbs',
  Asian: 'Asian: stir-fries with tamari or coconut aminos, ginger, garlic, sesame, scallions, bok choy, shirataki or zucchini noodles, Thai coconut curries, lettuce wraps',
  'Middle Eastern': 'Middle Eastern: kebabs and koftas, tahini, sumac, za\'atar, grilled vegetables, labneh or yogurt where the plan allows, cucumber and tomato salads',
  European: 'European: roasted meats, pan sauces with butter or cream, mushrooms, leeks, cabbage, herbs such as thyme and dill, gratins made with cauliflower',
};

const MEAL_HINTS: Record<MealType, string> = {
  Breakfast: 'breakfast dishes that are quick to make in the morning or easy to prepare the night before',
  Lunch: 'satisfying lunches that hold well and are easy to pack or reheat',
  Dinner: 'complete dinners with a protein, non-starchy vegetables and a sauce or fat source',
  Snack: 'small, grab-and-go snacks or light bites; keep the net carbs low and the recipe simple',
  Dessert: 'low-carb desserts built on the plan\'s allowed ingredients (cream, cream cheese, cocoa, nuts only where the plan allows, berries only where the plan allows, allowed sweeteners such as erythritol, monk fruit, allulose or stevia); keep portions modest',
  'Meal Prep': 'batch-friendly dishes that store and reheat well; write the quantities for one serving and note in the substitutions how to scale for a week',
};

function buildPrompt(i: GenerateRecipesRequest, p: PlanProfile, count: number, avoid: string, available: string, avoidNames: string[], correction?: string): string {
  const { effective, excluded } = resolveProteins(i.proteins, i.restrictions);
  const specific = effective.filter((x) => x !== 'No Preference');
  const restrictions = i.restrictions.filter((r) => r !== 'No Restrictions');
  const limit = COOKING_TIME_LIMITS[i.cookingTime];
  const lines = [
    'You are a professional recipe developer specializing in low-carbohydrate meal preparation, Atkins-style dietary patterns, and practical fitness nutrition. Reply with JSON only, matching the schema.',
    '',
    `Generate ${count} original, high-quality ${count === 1 ? 'recipe' : 'recipes'} based on the user\'s preferences.`,
    '',
    'User configuration:',
    `Atkins Plan: ${i.plan}`,
    `Atkins Phase: ${i.plan === 'Atkins 20' ? i.phase : 'not applicable (phases belong to Atkins 20 only)'}`,
    `Meal Type: ${i.mealType}`,
    `Preferred Proteins: ${specific.length ? specific.join(', ') : 'no preference: any protein that fits the restrictions'}${excluded.length ? ` (left out because of a restriction: ${excluded.map((e) => `${e.protein} conflicts with ${e.reason}`).join('; ')})` : ''}`,
    `Cuisine: ${i.cuisine}`,
    `Maximum Cooking Time: ${i.cookingTime === 'No Preference' ? `no preference, keep prep plus cook under ${limit} minutes` : `prep plus cook time must total under ${limit} minutes`}`,
    `Dietary Restrictions (HARD constraints, every recipe must satisfy all of them): ${restrictions.length ? restrictions.join(', ') : 'none'}`,
    `Ingredients to Avoid (HARD exclusions, treat as allergies): ${avoid || 'none'}`,
    `Available Ingredients (use where they fit; not mandatory): ${available || 'none given'}`,
    `Variation seed: ${i.variant} (a different seed must give noticeably different recipes for the same configuration).`,
    ...(avoidNames.length ? [`Recipe names already used, do not return these or close variations: ${avoidNames.join(' | ')}.`] : []),
    '',
    'Dietary framework (this is the most important part):',
    ...planPromptLines(p, i.mealType).map((l) => `- ${l}`),
    `- Cuisine direction: ${CUISINE_HINTS[i.cuisine]}. Reflect it authentically in the ingredients, seasoning and technique while using only plan-compatible ingredients.`,
    `- Meal type direction: ${MEAL_HINTS[i.mealType]}.`,
    '',
    'Generation requirements:',
    `1. Generate ${count} distinct ${count === 1 ? 'recipe' : 'recipes'}: different main ingredient or cooking method, never variations of the same dish, and not simply a template with the ingredient names swapped.`,
    '2. Respect the selected plan and phase above: choose only ingredients compatible with that carbohydrate approach, and keep the net carbs of this serving inside the meal guide.',
    '3. Use the preferred proteins. One, or at most two, protein sources per recipe; eggs or cheese may accompany a main protein only where the plan and restrictions allow.',
    '4. Respect every dietary exclusion and avoided ingredient, with no conflicting substitutions.',
    '5. Keep recipes realistic and easy to prepare with recognizable ingredients from an ordinary grocery store; simple technique, nothing exotic.',
    '6. Each recipe serves 1 (that is the standard serving the nutrition refers to). Give every ingredient a numeric quantity and a unit from: g, ml, tbsp, tsp, cup, piece, slice, clove, pinch, "to taste". Solids in g (never cup for solids), liquids in ml or cup, oils, sauces and spices in tbsp or tsp, eggs and whole items such as a bell pepper as piece, bacon as slice, garlic as clove. Ingredient names are plain food names ("chicken breast", "cauliflower rice", "heavy cream"); preparation goes in the note ("diced", "unsweetened"). No brand names.',
    '7. Include non-starchy vegetables and appropriate sources of protein and fat where relevant.',
    '8. Instructions: 4 to 8 complete, logical numbered steps in order, with safe cooking guidance where relevant (for example cooking poultry through).',
    '9. prepTime and cookTime in whole minutes; their total must meet the cooking-time preference.',
    '10. substitutions: 1 to 3 sensible swaps that keep the recipe compliant with the plan and restrictions.',
    '11. nutritionEstimate: your own approximate per-serving figures (calories; protein, totalCarbs, fiber and fat in grams). They will be checked against reference data and labelled as estimates if used; never claim they are verified or exact.',
    '12. nutritionNote: one short sentence on what to verify (for example sauce labels or portion of cheese).',
    '13. description: one or two sentences that sell the dish to a client without hype.',
    '14. Do not make unsupported fat-loss, metabolic or medical claims, and do not promise compliance with daily carb targets.',
    ...STYLE_RULES.map((r) => `- ${r}`),
  ];
  if (correction) lines.push('', `Correction from the last attempt: ${correction}`);
  return lines.join('\n');
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    recipes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          description: { type: 'STRING' },
          cuisine: { type: 'STRING' },
          prepTime: { type: 'INTEGER' },
          cookTime: { type: 'INTEGER' },
          ingredients: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                quantity: { type: 'NUMBER' },
                unit: { type: 'STRING', enum: [...UNITS] },
                note: { type: 'STRING' },
              },
              required: ['name', 'quantity', 'unit'],
            },
          },
          instructions: { type: 'ARRAY', items: { type: 'STRING' } },
          substitutions: { type: 'ARRAY', items: { type: 'STRING' } },
          nutritionEstimate: {
            type: 'OBJECT',
            properties: {
              calories: { type: 'NUMBER' },
              protein: { type: 'NUMBER' },
              totalCarbs: { type: 'NUMBER' },
              fiber: { type: 'NUMBER' },
              fat: { type: 'NUMBER' },
            },
            required: ['calories', 'protein', 'totalCarbs', 'fiber', 'fat'],
          },
          nutritionNote: { type: 'STRING' },
        },
        required: ['name', 'description', 'prepTime', 'cookTime', 'ingredients', 'instructions', 'substitutions', 'nutritionEstimate', 'nutritionNote'],
      },
    },
  },
  required: ['recipes'],
};

/* ------------------------------ validation ------------------------------ */

const nameKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/** The reference foods a recipe is made of, for the "not the same dish twice" check. */
function foodSet(r: { ingredients: Ingredient[] }): Set<string> {
  const out = new Set<string>();
  for (const ing of r.ingredients) {
    const food = findFood(ing.name);
    if (food && !food.negligible) out.add(food.keys[0]);
  }
  return out;
}
function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / Math.min(a.size, b.size);
}

function toConfig(i: GenerateRecipesRequest, avoid: string, available: string): RecipeConfig {
  return {
    plan: i.plan,
    phase: i.phase,
    mealType: i.mealType,
    proteins: i.proteins,
    cuisine: i.cuisine,
    cookingTime: i.cookingTime,
    restrictions: i.restrictions,
    carbRange: i.carbRange,
    avoid,
    available,
  };
}

interface Judged {
  recipe: Recipe;
  problems: string[];
}

/** Clean one raw recipe, compute its nutrition and judge it against the rules. */
function judge(raw: RawRecipe, index: number, config: RecipeConfig, p: PlanProfile): Judged {
  const ingredients: Ingredient[] = raw.ingredients
    .map((ing) => ({ name: tidy(ing.name).slice(0, 80), quantity: Math.round(ing.quantity * 10) / 10, unit: ing.unit, note: tidy(ing.note).slice(0, 60) }))
    .filter((ing) => ing.name.length > 0);
  const prepTime = Math.round(raw.prepTime);
  const cookTime = Math.round(raw.cookTime);
  const totalTime = prepTime + cookTime;
  const nutrition = resolveNutrition(ingredients, raw.nutritionEstimate);
  const mealType = config.mealType ?? 'Dinner';
  const problems = checkRecipe({ name: raw.name, ingredients, totalTime, netCarbs: nutrition.netCarbs }, config, p);
  if (ingredients.length < 3) problems.push('fewer than 3 usable ingredients');
  if (raw.instructions.length < 2) problems.push('too few instructions');
  const recipe: Recipe = {
    id: `recipe_${index}`,
    name: tidy(raw.name),
    description: tidy(raw.description),
    mealType,
    cuisine: tidy(raw.cuisine) || config.cuisine || 'Any Cuisine',
    prepTime,
    cookTime,
    totalTime,
    servings: 1,
    servingBasis: '1 serving (the whole recipe as written)',
    ingredients,
    instructions: raw.instructions.map(tidy).filter(Boolean).slice(0, 12),
    substitutions: raw.substitutions.map(tidy).filter(Boolean).slice(0, 5),
    nutrition,
    atkinsCompatibility: {
      plan: p.plan,
      phase: p.phase,
      planLabel: p.label,
      dailyNetCarbs: p.dailyNetCarbs,
      mealNetCarbGuide: mealNetCarbGuide(p, mealType),
      suitability: suitabilityLine(p, mealType, nutrition.netCarbs, nutrition.status),
      reviewStatus: nutrition.status === 'calculated' ? 'meets_plan_guidelines' : 'requires_nutrition_verification',
    },
    nutritionNote: tidy(raw.nutritionNote) || 'Nutrition values are approximate; check product labels and portion sizes.',
  };
  return { recipe, problems };
}

/* -------------------------------- handler ------------------------------- */

interface RecipesRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface RecipesResponse {
  setHeader(name: string, value: string): unknown;
  status(code: number): { json(body: unknown): void; end(): void };
}

export default async function handler(req: RecipesRequest, res: RecipesResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const { key, source } = findKey();
  const model = process.env.GEMINI_MODEL_ATKINS || process.env.GEMINI_MODEL || DEFAULT_MODEL;

  // Deploy check: `curl https://<app>/api/generate-recipes` (key names only, never values).
  if (req.method === 'GET') {
    res.status(200).json({
      tool: 'atkins-recipe-generator',
      configured: Boolean(key),
      model,
      keySource: source,
      limits: { perIpPer10Min: PER_IP_PER_WINDOW, maxInFlight: MAX_INFLIGHT, attempts: MAX_ATTEMPTS },
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
  const parsed = generateRecipesRequestSchema.safeParse(body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'bad_request', issues: parsed.error.issues.slice(0, 5).map((is) => is.path.join('.') || 'root') });
    return;
  }
  const input = parsed.data;
  const avoid = sanitizeFreeText(input.avoid);
  const available = sanitizeFreeText(input.available);
  const config = toConfig(input, avoid, available);
  const p = profileFor(config);

  if (overLimit(clientIp(req))) {
    res.status(429).json({ error: 'rate_limited', reason: 'client' });
    return;
  }
  if (inflight >= MAX_INFLIGHT) {
    res.status(429).json({ error: 'rate_limited', reason: 'busy' });
    return;
  }

  inflight += 1;
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const timeLeft = () => Math.max(1000, deadline - Date.now());
  let thinking: Record<string, unknown> | undefined = { thinkingLevel: 'low' };

  const ask = async (prompt: string, ms: number): Promise<{ status: number; ok: boolean; text: string }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            ...(thinking ? { thinkingConfig: thinking } : {}),
          },
        }),
      });
      return { status: r.status, ok: r.ok, text: await r.text() };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const accepted: Recipe[] = [];
    const usedNames = new Set<string>(input.avoidNames.map(nameKey));
    const rejected: { name: string; problems: string[] }[] = [];
    let correction: string | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const isLast = attempt === MAX_ATTEMPTS;
      const need = COUNT - accepted.length;
      const budget = isLast ? timeLeft() : Math.min(timeLeft(), ATTEMPT_MS);
      const avoidNames = [...new Set([...input.avoidNames, ...accepted.map((r) => r.name), ...rejected.map((r) => r.name)])].map(tidy).filter(Boolean).slice(0, 15);
      let answer: { status: number; ok: boolean; text: string };
      try {
        answer = await ask(buildPrompt(input, p, need, avoid, available, avoidNames, correction), budget);
        if (answer.status === 400 && thinking) {
          console.error(`[atkins] gemini ${model} rejected thinkingConfig:`, answer.text.slice(0, 200));
          thinking = undefined;
          answer = await ask(buildPrompt(input, p, need, avoid, available, avoidNames, correction), timeLeft());
        }
      } catch (err) {
        if (isLast) throw err;
        console.error(`[atkins] gemini ${model} stalled on attempt ${attempt}, asking once more`);
        continue;
      }

      if (answer.status === 429) {
        console.error(`[atkins] gemini ${model} rate limited`);
        res.status(429).json({ error: 'rate_limited', reason: 'upstream' });
        return;
      }
      if (!answer.ok) {
        console.error(`[atkins] gemini ${model} responded ${answer.status}:`, answer.text.slice(0, 300));
        if (!isLast && answer.status >= 500) continue;
        res.status(502).json({ error: 'upstream', status: answer.status });
        return;
      }

      const parsedSet = rawRecipeSetSchema.safeParse(safeJson(extractText(safeJson(answer.text))));
      const attemptRejected: string[] = [];
      if (!parsedSet.success) {
        const where = parsedSet.error.issues.slice(0, 3).map((is) => `${is.path.join('.') || 'root'}: ${is.message}`).join('; ');
        console.error(`[atkins] attempt ${attempt}: schema (${where})`);
        correction = `Your previous answer did not match the schema (${where}). Return valid JSON matching the schema exactly.`;
      } else {
        for (const raw of parsedSet.data.recipes) {
          if (accepted.length >= COUNT) break;
          const key = nameKey(raw.name);
          if (!key || usedNames.has(key)) {
            attemptRejected.push(`"${tidy(raw.name)}": a recipe with this name was already used`);
            continue;
          }
          const judged = judge(raw, accepted.length + 1, config, p);
          const foods = foodSet(judged.recipe);
          const twin = accepted.find((a) => overlap(foodSet(a), foods) > 0.75);
          if (twin) judged.problems.push(`too similar to "${twin.name}" (same main ingredients)`);
          usedNames.add(key);
          if (judged.problems.length) {
            rejected.push({ name: judged.recipe.name, problems: judged.problems });
            attemptRejected.push(`"${judged.recipe.name}": ${judged.problems.join('; ')}`);
            continue;
          }
          accepted.push(judged.recipe);
        }
        if (attemptRejected.length) {
          console.error(`[atkins] attempt ${attempt} rejected ${attemptRejected.length}: ${attemptRejected.join(' || ').slice(0, 600)}`);
          correction = `These recipes were rejected, fix the cause in the new ones: ${attemptRejected.join(' || ').slice(0, 900)}`;
        }
      }

      if (accepted.length >= COUNT) {
        const { excluded } = resolveProteins(input.proteins, input.restrictions);
        const notes = excluded.map((e) => `${e.protein} was left out because ${e.reason} was selected.`);
        if (avoidTerms(avoid).length) notes.push(`Avoided: ${avoidTerms(avoid).join(', ')}.`);
        const set: RecipeSet = {
          plan: p.plan,
          phase: p.phase,
          planLabel: p.label,
          mealType: input.mealType,
          cuisine: input.cuisine,
          recipes: accepted.slice(0, COUNT).map((r, i) => ({ ...r, id: `recipe_${i + 1}` })),
          notes,
        };
        res.status(200).json({ set, model, tool: 'atkins-recipe-generator', attempt });
        return;
      }
    }

    console.error(`[atkins] only ${accepted.length} of ${COUNT} recipes passed after ${MAX_ATTEMPTS} attempts`);
    res.status(502).json({ error: 'invalid', accepted: accepted.length });
  } catch (err) {
    console.error('[atkins] gemini request failed:', err instanceof Error ? err.message : err);
    res.status(502).json({ error: 'upstream' });
  } finally {
    inflight -= 1;
  }
}
