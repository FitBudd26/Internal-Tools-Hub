import type { MealType, Recipe, RecipeInput, RecipeSet } from './types';
import { MEAL_TYPES } from './types';
import { TIME_LIMIT, containsTerm, dietViolation, dislikedTerms, generateRecipes, meaningfulNotes } from './generateRecipes';
import { calorieTargetDetails, mealTargets, perMealTarget, targetNote } from './calorieTarget';
import {
  normalizeQuantities,
  numeralize,
  pairingProblem,
  proteinFloorProblem,
  proteinSources,
  reconcileNutrition,
  saltProblem,
  scaleAddedFats,
  unselectedProtein,
} from './nutrition';

/**
 * AI-first recipes with a guaranteed answer. The shared route asks Gemini
 * for distinct recipes that satisfy every dietary requirement; each one is
 * then checked here (diet keywords, dislikes from the notes, time limit,
 * hype words) and anything that fails is replaced from the built-in
 * library. If the route is unavailable the library answers on its own.
 */

export type GenerationSource = 'ai' | 'local';
export interface RecipeGeneration {
  set: RecipeSet;
  source: GenerationSource;
}

const REQUEST_TIMEOUT_MS = 25_000;
const COUNT = 3;
const HYPE = /lose weight fast|burn fat|miracle|detox|cure|guaranteed|melt/i;

const clean = (s: string) => s.replace(/[–—]/g, '-').trim();

export async function generateRecipesWithAi(
  input: RecipeInput,
  variant = 0,
  avoidNames: string[] = [],
): Promise<RecipeGeneration> {
  const local = generateRecipes(input, variant, COUNT, avoidNames);
  const details = input.profile ? calorieTargetDetails(input.profile, input.goal) : null;
  const daily = details?.target ?? null;
  const ai = await fetchAi(input, variant, avoidNames, daily);
  if (!ai || ai.length === 0) return { set: local, source: 'local' };

  const disliked = dislikedTerms(meaningfulNotes(input.notes));
  const limit = TIME_LIMIT[input.cookingTime ?? 'Flexible'];
  const requested = input.mealTypes.length ? input.mealTypes : [...MEAL_TYPES];
  const accepted: Recipe[] = [];

  for (const r of ai) {
    const mealType = (requested.find((m) => m.toLowerCase() === r.mealType.toLowerCase()) ?? requested[0]) as MealType;
    // Low-calorie targets (fat loss, or a small meal target) get added fats scaled down before the numbers are computed.
    const lowCal = input.goal === 'Fat Loss' || (daily !== null && perMealTarget(daily, mealType) < 500);
    const fats = lowCal ? scaleAddedFats(r.ingredients) : { ingredients: r.ingredients, changed: false };
    const recipe: Recipe = {
      name: clean(r.name),
      mealType,
      goalAlignment: numeralize(clean(r.goalAlignment)),
      description: numeralize(clean(r.description)),
      ingredients: fats.ingredients.map((i) => normalizeQuantities(clean(i))),
      steps: r.steps.map((st) => numeralize(clean(st))),
      timeMinutes: r.timeMinutes,
      nutrition: r.nutrition,
      coachingNote: numeralize(clean(r.coachingNote)),
    };
    // Numbers: calculated from the (possibly adjusted) ingredient list when it is recognised; the model's figures otherwise.
    const reconciled = reconcileNutrition(recipe.nutrition, recipe.ingredients);
    recipe.nutrition = reconciled.nutrition;
    recipe.nutritionSource = reconciled.source;
    const text = `${recipe.name} ${recipe.ingredients.join(' ')}`.toLowerCase();
    const sources = proteinSources(recipe.name, recipe.ingredients);
    const stray = unselectedProtein(sources, input.proteins);
    const reason =
      pairingProblem(recipe.name, recipe.ingredients) ??
      (stray ? `introduces ${stray}, which the coach did not select` : null) ??
      saltProblem(recipe.ingredients) ??
      proteinFloorProblem(recipe, input.goal) ??
      (recipe.ingredients.some((i) => /\s+or\s+/i.test(i.replace(/\([^)]*\)/g, ''))) ? 'ambiguous either-or ingredient' : null) ??
      dietViolation(recipe, input.diets) ??
      (disliked.find((d) => containsTerm(text, d)) ? 'contains a disliked ingredient' : null) ??
      (recipe.timeMinutes > limit + 5 ? 'over the time limit' : null) ??
      (HYPE.test(`${recipe.name} ${recipe.description} ${recipe.goalAlignment}`) ? 'hype wording' : null);
    if (reason) continue;
    if (accepted.some((a) => a.name.toLowerCase() === recipe.name.toLowerCase())) continue;
    accepted.push(recipe);
    if (accepted.length >= COUNT) break;
  }
  if (accepted.length === 0) return { set: local, source: 'local' };

  // Model under-delivered: top up from the library, avoiding duplicates.
  for (const r of local.recipes) {
    if (accepted.length >= COUNT) break;
    if (!accepted.some((a) => a.name.toLowerCase() === r.name.toLowerCase())) accepted.push(r);
  }
  return { set: { recipes: accepted, notes: [], dailyTarget: daily, targetNote: targetNote(details) ?? undefined }, source: 'ai' };
}

interface AiRecipe {
  name: string;
  mealType: string;
  goalAlignment: string;
  description: string;
  ingredients: string[];
  steps: string[];
  timeMinutes: number;
  nutrition: { calories: number; proteinG: number; carbsG: number; fatG: number };
  coachingNote: string;
}

async function fetchAi(input: RecipeInput, variant: number, avoidNames: string[], daily: number | null): Promise<AiRecipe[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        tool: 'recipes',
        goal: input.goal,
        proteins: input.proteins,
        diets: input.diets,
        mealTypes: input.mealTypes,
        cookingTime: input.cookingTime,
        notes: meaningfulNotes(input.notes).slice(0, 600),
        count: COUNT,
        variant,
        avoidNames: avoidNames.slice(0, 15),
        dailyTarget: daily ?? undefined,
        mealTargets: daily ? mealTargets(daily, input.mealTypes) : undefined,
      }),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return null;
    const data = (await res.json()) as { recipes?: unknown };
    if (!Array.isArray(data.recipes)) return null;
    const out: AiRecipe[] = [];
    for (const r of data.recipes) {
      if (!r || typeof r !== 'object') continue;
      const o = r as Record<string, unknown>;
      const n = (o.nutrition ?? {}) as Record<string, unknown>;
      const nums = [n.calories, n.proteinG, n.carbsG, n.fatG].map((v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null));
      if (
        typeof o.name !== 'string' || typeof o.description !== 'string' || typeof o.coachingNote !== 'string' ||
        !Array.isArray(o.ingredients) || !Array.isArray(o.steps) || typeof o.timeMinutes !== 'number' || nums.some((v) => v === null)
      ) continue;
      out.push({
        name: o.name,
        mealType: typeof o.mealType === 'string' ? o.mealType : '',
        goalAlignment: typeof o.goalAlignment === 'string' ? o.goalAlignment : '',
        description: o.description,
        ingredients: o.ingredients.filter((x): x is string => typeof x === 'string'),
        steps: o.steps.filter((x): x is string => typeof x === 'string'),
        timeMinutes: Math.round(o.timeMinutes),
        nutrition: { calories: nums[0] as number, proteinG: nums[1] as number, carbsG: nums[2] as number, fatG: nums[3] as number },
        coachingNote: o.coachingNote,
      });
    }
    return out;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
