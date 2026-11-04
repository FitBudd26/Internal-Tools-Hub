import { z } from 'zod';
import {
  ATKINS_PHASES,
  ATKINS_PLANS,
  CARB_RANGES,
  COOKING_TIMES,
  CUISINES,
  DEFAULT_CARB_RANGE,
  MAX_FREE_TEXT,
  MAX_PROTEINS,
  MAX_RESTRICTIONS,
  MEAL_TYPES,
  PROTEINS,
  RESTRICTIONS,
  UNITS,
} from './types.js';

/**
 * Zod schemas for the generation route: the request the browser sends and
 * the recipes Gemini must return. Imported by api/generate-recipes.ts; the
 * browser bundle only needs the plain types in types.ts.
 */

export const generateRecipesRequestSchema = z.object({
  plan: z.enum(ATKINS_PLANS),
  phase: z.enum(ATKINS_PHASES).default('Phase 1 — Induction'),
  mealType: z.enum(MEAL_TYPES),
  proteins: z.array(z.enum(PROTEINS)).max(MAX_PROTEINS).default([]),
  cuisine: z.enum(CUISINES),
  cookingTime: z.enum(COOKING_TIMES),
  restrictions: z.array(z.enum(RESTRICTIONS)).max(MAX_RESTRICTIONS).default([]),
  carbRange: z.enum(CARB_RANGES).default(DEFAULT_CARB_RANGE),
  avoid: z.string().max(MAX_FREE_TEXT).default(''),
  available: z.string().max(MAX_FREE_TEXT).default(''),
  /** Regenerate counter: a different seed asks for different recipes for the same inputs. */
  variant: z.number().int().min(0).max(20).default(0),
  /** Recipe names already shown, so a regenerated set is new. */
  avoidNames: z.array(z.string().max(100)).max(12).default([]),
});
export type GenerateRecipesRequest = z.infer<typeof generateRecipesRequestSchema>;

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

/** What the model returns, before the route computes nutrition and applies the plan rules. */
export const rawIngredientSchema = z.object({
  name: text(1, 80),
  quantity: z.number().min(0).max(5000),
  unit: z.enum(UNITS),
  note: z.string().trim().max(60).default(''),
});

export const rawNutritionEstimateSchema = z
  .object({
    calories: z.number().min(0).max(3000),
    protein: z.number().min(0).max(300),
    totalCarbs: z.number().min(0).max(400),
    fiber: z.number().min(0).max(100),
    fat: z.number().min(0).max(300),
  })
  .partial();

export const rawRecipeSchema = z.object({
  name: text(3, 90),
  description: text(10, 320),
  cuisine: z.string().trim().max(40).default(''),
  prepTime: z.number().int().min(0).max(240),
  cookTime: z.number().int().min(0).max(240),
  ingredients: z.array(rawIngredientSchema).min(3).max(16),
  instructions: z.array(z.string().trim().min(5).max(320)).min(2).max(12),
  substitutions: z.array(z.string().trim().min(3).max(200)).max(5).default([]),
  nutritionEstimate: rawNutritionEstimateSchema.nullable().default(null),
  nutritionNote: z.string().trim().max(240).default(''),
});

export const rawRecipeSetSchema = z.object({
  recipes: z.array(rawRecipeSchema).min(1).max(6),
});
export type RawRecipe = z.infer<typeof rawRecipeSchema>;
