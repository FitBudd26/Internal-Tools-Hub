import type { ClientGoal, ClientProfile, MealType } from './types';

/**
 * Optional client profile → approximate daily and per-meal calorie targets
 * (Mifflin-St Jeor resting rate x activity, adjusted for the goal). Rough
 * guidance to size portions, never a prescription.
 */

export const ACTIVITY_LEVELS = ['Sedentary', 'Lightly active', 'Moderately active', 'Very active'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  Sedentary: 1.2,
  'Lightly active': 1.375,
  'Moderately active': 1.55,
  'Very active': 1.725,
};

const GOAL_ADJUST: Partial<Record<ClientGoal, number>> = {
  'Fat Loss': -0.2,
  'Muscle Building': 0.1,
  Performance: 0.05,
};

/** Share of the day's calories a meal of this type usually carries. */
const MEAL_SHARE: Record<MealType, number> = {
  Breakfast: 0.25,
  Lunch: 0.3,
  Dinner: 0.35,
  Snack: 0.1,
  'Pre-Workout': 0.12,
  'Post-Workout': 0.2,
  'Meal Prep': 0.32,
};

export function profileIsComplete(p: ClientProfile): boolean {
  return Boolean(p.sex && p.age && p.heightCm && p.weightKg);
}

export function dailyCalorieTarget(p: ClientProfile, goal: ClientGoal | null): number | null {
  if (!profileIsComplete(p)) return null;
  const bmr = 10 * (p.weightKg as number) + 6.25 * (p.heightCm as number) - 5 * (p.age as number) + (p.sex === 'Male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[p.activity ?? 'Moderately active'];
  const adjusted = tdee * (1 + (goal ? GOAL_ADJUST[goal] ?? 0 : 0));
  return Math.max(1200, Math.round(adjusted / 50) * 50);
}

export function perMealTarget(daily: number, mealType: MealType): number {
  return Math.round((daily * MEAL_SHARE[mealType]) / 10) * 10;
}

/** "Breakfast about 450 kcal, Lunch about 540 kcal" for the prompt and the UI. */
export function mealTargets(daily: number, mealTypes: MealType[]): { mealType: MealType; kcal: number }[] {
  return mealTypes.map((m) => ({ mealType: m, kcal: perMealTarget(daily, m) }));
}

export const lbToKg = (lb: number) => Math.round(lb * 0.4536 * 10) / 10;
export const inToCm = (inches: number) => Math.round(inches * 2.54);
