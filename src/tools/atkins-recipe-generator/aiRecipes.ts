import type { Ingredient, Recipe, RecipeConfig, RecipeSet } from './types.js';
import { ATKINS_PHASES, ATKINS_PLANS, CUISINES, MEAL_TYPES, UNITS } from './types.js';

/**
 * Browser side of the generation: posts the recipe preferences (and nothing
 * else: no name, no email) to /api/generate-recipes and checks the recipe
 * set that comes back. There is no canned recipe library: when Gemini
 * cannot answer, the tool says so and offers a retry.
 */

export type RecipeFailure = 'rate_limited' | 'unavailable' | 'invalid' | 'network' | 'not_configured';
export type RecipeResult = { ok: true; set: RecipeSet; model: string } | { ok: false; error: RecipeFailure };

export const FAILURE_MESSAGES: Record<RecipeFailure, string> = {
  rate_limited: "We're experiencing high demand. Please try again in a moment.",
  unavailable: "We couldn't generate your recipes right now. Please try again.",
  invalid: "We couldn't generate your recipes right now. Please try again.",
  network: 'The request did not go through. Check your connection and try again.',
  // Dev names the fix; production users only see that it is unavailable.
  not_configured: import.meta.env.DEV
    ? 'Generation is not configured on this server: add GEMINI_API_KEY to .env and restart the dev server.'
    : 'Recipe generation is temporarily unavailable. Please try again later.',
};

const REQUEST_TIMEOUT_MS = 50_000;

export function isConfigComplete(c: RecipeConfig): boolean {
  return Boolean(c.plan && c.mealType && c.cuisine && c.cookingTime && (c.plan !== 'Atkins 20' || c.phase));
}

export async function generateRecipes(config: RecipeConfig, variant = 0, avoidNames: string[] = []): Promise<RecipeResult> {
  if (!isConfigComplete(config)) return { ok: false, error: 'invalid' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('/api/generate-recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        plan: config.plan,
        phase: config.phase,
        mealType: config.mealType,
        proteins: config.proteins,
        cuisine: config.cuisine,
        cookingTime: config.cookingTime,
        restrictions: config.restrictions,
        carbRange: config.carbRange,
        avoid: config.avoid.trim().slice(0, 160),
        available: config.available.trim().slice(0, 160),
        variant,
        avoidNames: avoidNames.slice(0, 12),
      }),
    });
    if (res.status === 429) return { ok: false, error: 'rate_limited' };
    if (res.status === 503) return { ok: false, error: 'not_configured' };
    const type = res.headers.get('content-type') ?? '';
    const data = type.includes('application/json') ? ((await res.json().catch(() => null)) as Record<string, unknown> | null) : null;
    if (!res.ok) return { ok: false, error: data?.error === 'invalid' ? 'invalid' : 'unavailable' };
    const set = checkRecipeSet(data?.set);
    if (!set) return { ok: false, error: 'invalid' };
    return { ok: true, set, model: typeof data?.model === 'string' ? data.model : '' };
  } catch {
    return { ok: false, error: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strs = (v: unknown, max: number, len: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((s) => s.trim().slice(0, len)).filter(Boolean).slice(0, max) : [];
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const nonNeg = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n >= 0 ? n : null;
};

function checkIngredient(v: unknown): Ingredient | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const name = str(o.name, 80);
  const quantity = nonNeg(o.quantity);
  const unit = UNITS.find((u) => u === o.unit);
  if (!name || quantity === null || !unit) return null;
  return { name, quantity, unit, note: str(o.note, 60) };
}

function checkRecipe(v: unknown, index: number): Recipe | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const name = str(o.name, 90);
  const ingredients = (Array.isArray(o.ingredients) ? o.ingredients : []).map(checkIngredient).filter((i): i is Ingredient => i !== null);
  const instructions = strs(o.instructions, 12, 320);
  const prepTime = nonNeg(o.prepTime);
  const cookTime = nonNeg(o.cookTime);
  const mealType = MEAL_TYPES.find((m) => m === o.mealType);
  if (name.length < 3 || ingredients.length < 3 || instructions.length < 2 || prepTime === null || cookTime === null || !mealType) return null;
  const n = (o.nutrition ?? {}) as Record<string, unknown>;
  const status = n.status === 'calculated' || n.status === 'estimated' ? n.status : 'not_calculated';
  const field = (k: string) => (status === 'not_calculated' ? null : nonNeg(n[k]));
  const a = (o.atkinsCompatibility ?? {}) as Record<string, unknown>;
  const plan = ATKINS_PLANS.find((p) => p === a.plan);
  if (!plan) return null;
  return {
    id: str(o.id, 20) || `recipe_${index + 1}`,
    name,
    description: str(o.description, 320),
    mealType,
    cuisine: str(o.cuisine, 40),
    prepTime,
    cookTime,
    totalTime: nonNeg(o.totalTime) ?? prepTime + cookTime,
    servings: 1,
    servingBasis: str(o.servingBasis, 80) || '1 serving (the whole recipe as written)',
    ingredients,
    instructions,
    substitutions: strs(o.substitutions, 5, 200),
    nutrition: {
      calories: field('calories'),
      protein: field('protein'),
      totalCarbs: field('totalCarbs'),
      fiber: field('fiber'),
      netCarbs: field('netCarbs'),
      fat: field('fat'),
      status,
      coverage: Math.min(1, Math.max(0, num(n.coverage) ?? 0)),
    },
    atkinsCompatibility: {
      plan,
      phase: ATKINS_PHASES.find((p) => p === a.phase) ?? null,
      planLabel: str(a.planLabel, 80) || plan,
      dailyNetCarbs: str(a.dailyNetCarbs, 120),
      mealNetCarbGuide: nonNeg(a.mealNetCarbGuide) ?? 0,
      suitability: str(a.suitability, 300),
      reviewStatus: a.reviewStatus === 'meets_plan_guidelines' ? 'meets_plan_guidelines' : 'requires_nutrition_verification',
    },
    nutritionNote: str(o.nutritionNote, 240),
  };
}

/** Structural check of the route's answer, so a malformed payload can never reach the modal or the PDF. */
export function checkRecipeSet(v: unknown): RecipeSet | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const plan = ATKINS_PLANS.find((p) => p === o.plan);
  const mealType = MEAL_TYPES.find((m) => m === o.mealType);
  const cuisine = CUISINES.find((c) => c === o.cuisine);
  if (!plan || !mealType || !cuisine || !Array.isArray(o.recipes)) return null;
  const recipes = o.recipes.map(checkRecipe).filter((r): r is Recipe => r !== null);
  if (recipes.length < 3) return null;
  return {
    plan,
    phase: ATKINS_PHASES.find((p) => p === o.phase) ?? null,
    planLabel: str(o.planLabel, 80) || plan,
    mealType,
    cuisine,
    recipes: recipes.slice(0, 3),
    notes: strs(o.notes, 6, 240),
  };
}
