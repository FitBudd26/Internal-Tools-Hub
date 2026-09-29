export const CLIENT_GOALS = [
  'Fat Loss',
  'Muscle Building',
  'Maintenance',
  'Performance',
  'Healthy Eating',
  'High Protein',
  'Low Carb',
  'Balanced Lifestyle',
] as const;

/** Eggs and Dairy stay separate options on purpose; Seafood sits beside Fish. */
export const PROTEINS = [
  'Chicken',
  'Turkey',
  'Beef',
  'Fish',
  'Seafood',
  'Eggs',
  'Dairy',
  'Tofu',
  'Tempeh',
  'Lentils',
  'Beans',
  'Whey / Protein Powder',
  'No Preference',
] as const;

export const DIETS = [
  'No Restrictions',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Low-Carb',
  'High-Protein',
  'Mediterranean',
  'Keto-Friendly',
] as const;

export const MEAL_TYPES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Pre-Workout',
  'Post-Workout',
  'Meal Prep',
] as const;

export const COOKING_TIMES = [
  'Under 10 Minutes',
  'Under 20 Minutes',
  'Under 30 Minutes',
  'Flexible',
] as const;

export type ClientGoal = (typeof CLIENT_GOALS)[number];
export type Protein = (typeof PROTEINS)[number];
export type Diet = (typeof DIETS)[number];
export type MealType = (typeof MEAL_TYPES)[number];
export type CookingTime = (typeof COOKING_TIMES)[number];

/** Optional, anonymous client profile used only to size portions. */
export interface ClientProfile {
  sex: 'Female' | 'Male' | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activity: 'Sedentary' | 'Lightly active' | 'Moderately active' | 'Very active' | null;
}

export interface RecipeInput {
  goal: ClientGoal | null;
  proteins: Protein[];
  diets: Diet[];
  mealTypes: MealType[];
  cookingTime: CookingTime | null;
  notes: string;
  profile?: ClientProfile;
  /** Coach or business name printed on the client PDF ("Prepared by"). */
  coachBrand?: string;
}

/** Approximate, per serving. Guidance for coaches, never a clinical prescription. */
export interface Nutrition {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Recipe {
  name: string;
  goalAlignment: string;
  description: string;
  ingredients: string[];
  steps: string[];
  timeMinutes: number;
  nutrition: Nutrition;
  /** 'estimated' = computed from the ingredient list, 'adjusted' = calories corrected to the macros. */
  nutritionSource?: 'stated' | 'adjusted' | 'estimated';
  coachingNote: string;
  /** Which of the requested meal types this recipe serves best. */
  mealType: MealType;
}

export interface RecipeSet {
  recipes: Recipe[];
  /** Plain-language notes on constraints that had to be relaxed to fill the set. */
  notes: string[];
  /** Daily calorie target derived from the client profile, when one was given. */
  dailyTarget?: number | null;
}

/** What the single-screen form holds (RecipeInput + the lead). */
export interface RecipeFormState extends RecipeInput {
  name: string;
  email: string;
}
