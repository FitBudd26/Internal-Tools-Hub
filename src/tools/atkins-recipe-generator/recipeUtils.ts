import type { Ingredient, Recipe, RecipeSet } from './types.js';
import { NUTRITION_STATUS_LABELS } from './types.js';

/** Pure helpers over the recipe objects: formatting for the cards, the copy text, the PDF and file names. */

const FRACTIONS: [number, string][] = [
  [0.25, '1/4'],
  [1 / 3, '1/3'],
  [0.5, '1/2'],
  [2 / 3, '2/3'],
  [0.75, '3/4'],
];

/** 0.5 → "1/2", 1.5 → "1 1/2", 150 → "150", 2.25 → "2 1/4". */
export function formatQuantity(q: number): string {
  if (!Number.isFinite(q) || q <= 0) return '';
  const whole = Math.floor(q);
  const rest = q - whole;
  const frac = FRACTIONS.find(([v]) => Math.abs(rest - v) < 0.04);
  if (frac) return whole ? `${whole} ${frac[1]}` : frac[1];
  const rounded = Math.round(q * 10) / 10;
  return String(rounded);
}

function plural(name: string, n: number): string {
  if (n <= 1 || /s$/i.test(name)) return name;
  if (/(o|x|ch|sh)$/i.test(name) && !/(avocado|tomato)$/i.test(name)) return `${name}es`;
  if (/(tomato|potato)$/i.test(name)) return `${name}es`;
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`;
  return `${name}s`;
}

/** "150 g chicken breast, diced" · "2 eggs" · "1 tbsp olive oil" · "salt, to taste" */
export function formatIngredient(ing: Ingredient): string {
  const note = ing.note ? `, ${ing.note}` : '';
  const q = formatQuantity(ing.quantity);
  switch (ing.unit) {
    case 'to taste':
      return `${ing.name}, to taste${ing.note ? ` (${ing.note})` : ''}`;
    case 'pinch':
      return `${q && ing.quantity !== 1 ? `${q} pinches` : 'a pinch'} of ${ing.name}${note}`;
    case 'piece':
      return `${q || '1'} ${plural(ing.name, ing.quantity)}${note}`;
    case 'slice':
      return `${q || '1'} ${ing.quantity === 1 ? 'slice' : 'slices'} ${ing.name}${note}`;
    case 'clove':
      return `${q || '1'} ${ing.quantity === 1 ? 'clove' : 'cloves'} ${ing.name}${note}`;
    case 'cup':
      return `${q || '1'} ${ing.quantity === 1 ? 'cup' : 'cups'} ${ing.name}${note}`;
    default:
      return `${q} ${ing.unit} ${ing.name}${note}`;
  }
}

export function timeLabel(minutes: number): string {
  return `${minutes} min`;
}

const g = (v: number | null) => (v === null ? 'n/a' : `${v} g`);

/** "320 kcal · 28 g protein · 6 g net carbs (9 g total, 3 g fiber) · 21 g fat" */
export function nutritionLine(r: Recipe): string {
  const n = r.nutrition;
  if (n.status === 'not_calculated') return 'Nutrition not calculated';
  return `${n.calories ?? 'n/a'} kcal · ${g(n.protein)} protein · ${g(n.netCarbs)} net carbs (${g(n.totalCarbs)} total, ${g(n.fiber)} fiber) · ${g(n.fat)} fat`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export const COLLECTION_PDF_FILE = 'atkins-low-carb-recipes.pdf';

/** `atkins-garlic-butter-chicken.pdf` from the recipe name. */
export function recipePdfFileName(r: Recipe): string {
  const slug = slugify(r.name).replace(/^atkins-?/, '');
  return slug ? `atkins-${slug}.pdf` : COLLECTION_PDF_FILE;
}

/** Plain text of one recipe for the clipboard (same content as the card and the PDF). */
export function recipeToText(r: Recipe): string {
  const lines = [
    r.name,
    r.description,
    '',
    `${r.mealType} · ${r.atkinsCompatibility.planLabel} · Prep ${r.prepTime} min · Cook ${r.cookTime} min · Total ${r.totalTime} min`,
    `Serves: ${r.servingBasis}`,
    '',
    'Ingredients',
    ...r.ingredients.map((i) => `- ${formatIngredient(i)}`),
    '',
    'Instructions',
    ...r.instructions.map((s, i) => `${i + 1}. ${s}`),
  ];
  if (r.substitutions.length) lines.push('', 'Substitutions', ...r.substitutions.map((s) => `- ${s}`));
  lines.push('', 'Nutrition (per serving)', nutritionLine(r), NUTRITION_STATUS_LABELS[r.nutrition.status], '', 'Plan fit', r.atkinsCompatibility.suitability, r.nutritionNote);
  return lines.join('\n');
}

export function countRecipes(set: RecipeSet | null): number {
  return set?.recipes.length ?? 0;
}
