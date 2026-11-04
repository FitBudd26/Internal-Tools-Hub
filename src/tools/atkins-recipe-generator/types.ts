/**
 * Option lists and data shapes for the Atkins Diet Recipe Generator. Shared
 * by the form, the results modal, the PDF builder and (through schema.ts,
 * atkinsRules.ts and nutrition.ts) the serverless generation route, so every
 * list lives here once. Nothing in this file touches React or the DOM.
 */

export const ATKINS_PLANS = ['Atkins 20', 'Atkins 40', 'Flexible Low-Carb'] as const;
export type AtkinsPlan = (typeof ATKINS_PLANS)[number];

/** Shown only when Atkins 20 is selected. */
export const ATKINS_PHASES = [
  'Phase 1 — Induction',
  'Phase 2 — Ongoing Weight Loss',
  'Phase 3 — Pre-Maintenance',
  'Phase 4 — Lifetime Maintenance',
] as const;
export type AtkinsPhase = (typeof ATKINS_PHASES)[number];

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Meal Prep'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/** Eggs and Dairy stay separate options; Fish and Seafood stay separate. */
export const PROTEINS = ['Chicken', 'Turkey', 'Beef', 'Pork', 'Fish', 'Seafood', 'Eggs', 'Dairy', 'Tofu', 'Tempeh', 'No Preference'] as const;
export type Protein = (typeof PROTEINS)[number];

export const CUISINES = ['Any Cuisine', 'American', 'Mediterranean', 'Indian', 'Mexican', 'Italian', 'Asian', 'Middle Eastern', 'European'] as const;
export type Cuisine = (typeof CUISINES)[number];

export const COOKING_TIMES = ['Under 15 Minutes', 'Under 30 Minutes', 'Under 45 Minutes', 'No Preference'] as const;
export type CookingTime = (typeof COOKING_TIMES)[number];
/** Longest total time (prep + cook) a recipe may take for each option. */
export const COOKING_TIME_LIMITS: Record<CookingTime, number> = {
  'Under 15 Minutes': 15,
  'Under 30 Minutes': 30,
  'Under 45 Minutes': 45,
  'No Preference': 90,
};

export const RESTRICTIONS = ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Egg-Free', 'No Restrictions'] as const;
export type Restriction = (typeof RESTRICTIONS)[number];

/** Daily net-carb ranges for the Flexible Low-Carb plan (an advanced setting, not an Atkins plan). */
export const CARB_RANGES = ['20-30 g per day', '30-50 g per day', '50-75 g per day', '75-100 g per day'] as const;
export type CarbRange = (typeof CARB_RANGES)[number];
export const DEFAULT_CARB_RANGE: CarbRange = '30-50 g per day';

/** Most selections allowed in each multi-select (also enforced by the API). */
export const MAX_PROTEINS = 5;
export const MAX_RESTRICTIONS = 6;
/** Longest free-text field (ingredients to avoid / available), also enforced by the API. */
export const MAX_FREE_TEXT = 160;

/** Screen 1: the recipe preferences. Nothing here is a lead field. */
export interface RecipeConfig {
  plan: AtkinsPlan;
  /** Only meaningful when plan is Atkins 20. */
  phase: AtkinsPhase;
  mealType: MealType | null;
  proteins: Protein[];
  cuisine: Cuisine | null;
  cookingTime: CookingTime | null;
  restrictions: Restriction[];
  /** Only meaningful when plan is Flexible Low-Carb. */
  carbRange: CarbRange;
  avoid: string;
  available: string;
}

/** Screen 2: the lead. Never sent to Gemini. */
export interface LeadDetails {
  fullName: string;
  email: string;
}

/* --------------------------------- recipes -------------------------------- */

export const UNITS = ['g', 'ml', 'tbsp', 'tsp', 'cup', 'piece', 'slice', 'clove', 'pinch', 'to taste'] as const;
export type Unit = (typeof UNITS)[number];

export interface Ingredient {
  name: string;
  quantity: number;
  unit: Unit;
  /** Preparation or qualifier, e.g. "diced", "unsweetened". */
  note: string;
}

/**
 * calculated: computed from the ingredient quantities and the tool's reference
 * data (approximate). estimated: the model's own figures, shown as unverified
 * because too much of the recipe was outside the reference data.
 * not_calculated: nothing trustworthy was available, so no numbers are shown.
 */
export type NutritionStatus = 'calculated' | 'estimated' | 'not_calculated';
export const NUTRITION_STATUS_LABELS: Record<NutritionStatus, string> = {
  calculated: 'Calculated from the listed quantities with reference nutrition data. Approximate.',
  estimated: 'AI estimate, not verified against reference data. Treat as a rough guide.',
  not_calculated: 'Not calculated. Check the ingredient labels before relying on this recipe.',
};

export interface Nutrition {
  calories: number | null;
  protein: number | null;
  totalCarbs: number | null;
  fiber: number | null;
  netCarbs: number | null;
  fat: number | null;
  status: NutritionStatus;
  /** Share of the ingredient weight that matched reference data (0-1). */
  coverage: number;
}

export type ReviewStatus = 'meets_plan_guidelines' | 'requires_nutrition_verification';
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  meets_plan_guidelines: 'Meets plan guidelines',
  requires_nutrition_verification: 'Verify nutrition',
};

export interface AtkinsCompatibility {
  plan: AtkinsPlan;
  phase: AtkinsPhase | null;
  /** "Atkins 20 · Phase 1 (Induction)", "Atkins 40", "Flexible Low-Carb (30-50 g per day)". */
  planLabel: string;
  /** The plan's daily net-carb framework, e.g. "about 20 g net carbs per day". */
  dailyNetCarbs: string;
  /** Net carbs one meal of this type can reasonably use inside that daily budget. */
  mealNetCarbGuide: number;
  /** One sentence on how the recipe fits the plan. */
  suitability: string;
  reviewStatus: ReviewStatus;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  mealType: MealType;
  cuisine: string;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  servings: number;
  /** The standard serving the nutrition refers to (there is no serving-size input, by design). */
  servingBasis: string;
  ingredients: Ingredient[];
  instructions: string[];
  substitutions: string[];
  nutrition: Nutrition;
  atkinsCompatibility: AtkinsCompatibility;
  nutritionNote: string;
}

export interface RecipeSet {
  plan: AtkinsPlan;
  phase: AtkinsPhase | null;
  planLabel: string;
  mealType: MealType;
  cuisine: Cuisine;
  recipes: Recipe[];
  /** Plain-language notes about the set (for example proteins excluded by a restriction). */
  notes: string[];
}

/** PDF choices the user makes in the results modal. */
export type PageSize = 'letter' | 'a4';
export interface PdfOptions {
  pageSize: PageSize;
}
