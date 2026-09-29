import type { Nutrition } from './types';

/**
 * Ingredient-level nutrition estimate from a recipe's ingredient lines, and a
 * reconciliation step that keeps stated macros honest:
 *  - calories must match 4 x protein + 4 x carbs + 9 x fat (within 5%),
 *  - when most ingredient lines are recognised, a stated value that is more
 *    than 20% away from the ingredient estimate is replaced by the estimate.
 * Values per 100 g (ml for liquids) come from USDA-style reference figures;
 * this is practical guidance for coaches, not a clinical database.
 */

interface Food {
  keys: string[];
  /** per 100 g: kcal, protein, carbs, fat */
  per100: [number, number, number, number];
  /** grams per unit when the line uses that unit */
  cup?: number;
  tbsp?: number;
  tsp?: number;
  piece?: number;
  scoop?: number;
  slice?: number;
  handful?: number;
  can?: number;
  /** ingredient is essentially calorie-free (seasonings, water) */
  negligible?: boolean;
}

const FOODS: Food[] = [
  { keys: ['chicken breast', 'grilled chicken', 'shredded chicken', 'chicken thigh', 'chicken'], per100: [165, 31, 0, 3.6], cup: 140 },
  { keys: ['ground turkey', 'turkey mince'], per100: [170, 27, 0, 7] },
  { keys: ['turkey breast', 'sliced turkey', 'turkey'], per100: [104, 17, 4, 1], slice: 28 },
  { keys: ['ground beef', 'beef mince'], per100: [180, 26, 0, 8] },
  { keys: ['sirloin', 'steak', 'beef strips', 'beef'], per100: [200, 29, 0, 9] },
  { keys: ['salmon'], per100: [206, 22, 0, 13] },
  { keys: ['tuna'], per100: [116, 26, 0, 1], can: 120 },
  { keys: ['cod', 'white fish', 'tilapia', 'fish'], per100: [105, 23, 0, 1] },
  { keys: ['shrimp', 'prawn'], per100: [99, 24, 0, 0.3] },
  { keys: ['egg white'], per100: [52, 11, 1, 0], piece: 33 },
  { keys: ['egg'], per100: [143, 13, 1, 10], piece: 50 },
  { keys: ['greek yogurt', 'greek yoghurt'], per100: [66, 10, 4, 1.2], cup: 245, tbsp: 15 },
  { keys: ['cottage cheese'], per100: [98, 11, 3, 4], cup: 225 },
  { keys: ['feta'], per100: [264, 14, 4, 21], tbsp: 15 },
  { keys: ['cheddar'], per100: [403, 25, 1, 33], tbsp: 8 },
  { keys: ['parmesan'], per100: [431, 38, 4, 29], tbsp: 8 },
  { keys: ['mozzarella', 'cheese'], per100: [300, 22, 2, 22], tbsp: 8 },
  { keys: ['skim milk', 'skimmed milk'], per100: [34, 3.4, 5, 0.1], cup: 245 },
  { keys: ['almond milk', 'oat milk', 'plant milk', 'soy milk'], per100: [24, 0.8, 2, 1.2], cup: 240 },
  { keys: ['milk'], per100: [47, 3.4, 4.8, 1.7], cup: 245 },
  { keys: ['butter'], per100: [717, 1, 0, 81], tbsp: 14, tsp: 5 },
  { keys: ['tofu'], per100: [144, 17, 3, 9] },
  { keys: ['tempeh'], per100: [192, 20, 8, 11] },
  { keys: ['red lentils', 'dry lentils'], per100: [352, 25, 60, 1], cup: 190 },
  { keys: ['lentil'], per100: [116, 9, 20, 0.4], cup: 200 },
  { keys: ['chickpea'], per100: [164, 9, 27, 2.6], cup: 165, can: 240 },
  { keys: ['edamame'], per100: [121, 12, 9, 5], cup: 155 },
  { keys: ['hummus'], per100: [166, 8, 14, 10], tbsp: 15 },
  { keys: ['black bean', 'kidney bean', 'cannellini', 'white bean', 'bean'], per100: [110, 7, 19, 0.5], cup: 170, can: 240 },
  { keys: ['whey', 'protein powder', 'plant protein'], per100: [375, 75, 8, 5], scoop: 30 },
  { keys: ['brown rice'], per100: [112, 2.3, 23, 0.8], cup: 195 },
  { keys: ['rice noodle'], per100: [364, 6, 80, 0.6] },
  { keys: ['rice cake'], per100: [387, 8, 82, 3], piece: 9 },
  { keys: ['rice cracker', 'crackers', 'cracker'], per100: [400, 8, 70, 10], piece: 6 },
  { keys: ['rice'], per100: [130, 2.7, 28, 0.3], cup: 158 },
  { keys: ['quinoa'], per100: [120, 4.4, 21, 1.9], cup: 185 },
  { keys: ['rolled oats', 'oats'], per100: [379, 13, 68, 6.5], cup: 81, tbsp: 8 },
  { keys: ['granola'], per100: [471, 10, 64, 20], tbsp: 12 },
  { keys: ['whole-grain wrap', 'wholegrain wrap', 'tortilla', 'wrap'], per100: [300, 9, 50, 7], piece: 60 },
  { keys: ['bread', 'toast'], per100: [247, 13, 41, 3.5], slice: 35, piece: 35 },
  { keys: ['sweet potato'], per100: [90, 2, 21, 0.1], piece: 130, cup: 130 },
  { keys: ['baby potatoes', 'potato'], per100: [87, 2, 20, 0.1], piece: 60 },
  { keys: ['banana'], per100: [89, 1.1, 23, 0.3], piece: 118 },
  { keys: ['berries', 'berry', 'raspberr', 'blueberr', 'strawberr'], per100: [57, 0.7, 14, 0.3], cup: 150, handful: 40 },
  { keys: ['pineapple'], per100: [50, 0.5, 13, 0.1], cup: 165 },
  { keys: ['avocado'], per100: [160, 2, 9, 15], piece: 150 },
  { keys: ['chia'], per100: [486, 17, 42, 31], tbsp: 12 },
  { keys: ['peanut butter', 'almond butter', 'nut butter'], per100: [588, 25, 20, 50], tbsp: 16 },
  { keys: ['pumpkin seeds'], per100: [559, 30, 11, 49], tbsp: 10 },
  { keys: ['sesame seeds'], per100: [573, 18, 23, 50], tsp: 3, tbsp: 9 },
  { keys: ['olive oil', 'sesame oil', 'coconut oil', 'oil'], per100: [884, 0, 0, 100], tbsp: 14, tsp: 4.6 },
  { keys: ['honey'], per100: [304, 0, 82, 0], tsp: 7, tbsp: 21 },
  { keys: ['maple syrup', 'maple'], per100: [260, 0, 67, 0], tsp: 7, tbsp: 20 },
  { keys: ['salsa'], per100: [36, 1.5, 7, 0.2], tbsp: 16 },
  { keys: ['cocoa'], per100: [228, 20, 58, 14], tsp: 2, tbsp: 6 },
  { keys: ['cornflour', 'cornstarch'], per100: [381, 0, 91, 0], tbsp: 8 },
  { keys: ['nutritional yeast'], per100: [325, 50, 35, 5], tbsp: 5 },
  { keys: ['caesar dressing', 'yogurt dressing', 'dressing'], per100: [150, 3, 10, 11], tbsp: 15 },
  { keys: ['broccoli'], per100: [34, 2.8, 7, 0.4], cup: 90 },
  { keys: ['bok choy', 'pak choi'], per100: [13, 1.5, 2.2, 0.2], cup: 70 },
  { keys: ['spinach'], per100: [23, 2.9, 3.6, 0.4], cup: 30, handful: 30 },
  { keys: ['kale'], per100: [49, 4.3, 9, 0.9], cup: 67, handful: 30 },
  { keys: ['green beans'], per100: [31, 1.8, 7, 0.1], cup: 100 },
  { keys: ['bell pepper', 'red pepper', 'pepper,', 'peppers'], per100: [31, 1, 6, 0.3], piece: 120, cup: 150 },
  { keys: ['courgette', 'zucchini'], per100: [17, 1.2, 3, 0.3], piece: 200 },
  { keys: ['cucumber'], per100: [15, 0.7, 3.6, 0.1], piece: 300 },
  { keys: ['cherry tomato'], per100: [18, 0.9, 3.9, 0.2], piece: 17 },
  { keys: ['chopped tomatoes', 'canned tomatoes', 'tomato'], per100: [18, 0.9, 3.9, 0.2], piece: 120, can: 400 },
  { keys: ['romaine', 'lettuce'], per100: [15, 1.4, 2.9, 0.2], piece: 15, cup: 47 },
  { keys: ['rocket', 'arugula'], per100: [25, 2.6, 3.7, 0.7], handful: 20, cup: 20 },
  { keys: ['mixed greens', 'salad greens', 'greens'], per100: [20, 2, 3.7, 0.3], cup: 40, handful: 30 },
  { keys: ['carrot'], per100: [41, 0.9, 10, 0.2], piece: 60 },
  { keys: ['red onion', 'onion'], per100: [40, 1.1, 9, 0.1], piece: 110 },
  { keys: ['garlic'], per100: [149, 6, 33, 0.5], piece: 3 },
  { keys: ['mushroom'], per100: [22, 3.1, 3.3, 0.3], piece: 18, cup: 70 },
  { keys: ['cabbage', 'slaw'], per100: [25, 1.3, 6, 0.1], cup: 90, handful: 40 },
  { keys: ['stir-fry vegetables', 'mixed vegetables', 'mixed peppers', 'roasted vegetables', 'roasted peppers', 'vegetables'], per100: [45, 1.8, 8, 1], cup: 110 },
  { keys: ['olive'], per100: [115, 0.8, 6, 11], piece: 4 },
  { keys: ['vegetable stock', 'stock', 'broth'], per100: [5, 0.3, 0.8, 0.1], cup: 240 },
  { keys: ['tamari', 'soy sauce'], per100: [53, 8, 5, 0], tbsp: 16, tsp: 5 },
  { keys: ['lime', 'lemon', 'parsley', 'coriander', 'cilantro', 'chives', 'basil', 'herbs', 'rosemary', 'thyme', 'oregano', 'cumin', 'paprika', 'turmeric', 'chili', 'chilli', 'cinnamon', 'garam masala', 'seasoning', 'salt', 'pepper', 'vinegar', 'mustard', 'water', 'ice', 'baking powder', 'ginger', 'spices', 'spice'], per100: [0, 0, 0, 0], negligible: true },
];

const WORD_NUMBERS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, quarter: 0.25, third: 1 / 3 };
const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };

function parseQuantity(raw: string): number | null {
  let s = raw.trim().toLowerCase();
  for (const [f, v] of Object.entries(FRACTIONS)) s = s.replace(f, ` ${v} `);
  s = s.replace(/\bhalf an?\b|\bhalf\b/g, ' 0.5 ').replace(/\bquarter of an?\b|\bquarter\b/g, ' 0.25 ').replace(/\bthird of an?\b/g, ' 0.333 ');
  const m = /^\s*(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+))?(?:\s+(\d+)\s*\/\s*(\d+))?/.exec(s);
  if (m) {
    if (m[2]) return Number(m[1]) / Number(m[2]);
    const whole = Number(m[1]);
    return m[3] && m[4] ? whole + Number(m[3]) / Number(m[4]) : whole;
  }
  const w = /^\s*([a-z]+)\b/.exec(s);
  return w && WORD_NUMBERS[w[1]] !== undefined ? WORD_NUMBERS[w[1]] : null;
}

const UNIT_RE = /\b(grams?|g|kg|ml|millilitres?|milliliters?|l|litres?|liters?|cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|scoops?|slices?|cloves?|cans?|tins?|handfuls?|pinch(?:es)?|large|medium|small|pieces?|wedges?|leaves|leaf|sprigs?)\b/;

function findFood(name: string): Food | null {
  // Real foods beat seasonings: "tuna in water" is tuna, not water.
  let best: { food: Food; len: number } | null = null;
  let seasoning: Food | null = null;
  for (const food of FOODS) {
    for (const key of food.keys) {
      const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      if (!re.test(name)) continue;
      if (food.negligible) seasoning = food;
      else if (!best || key.length > best.len) best = { food, len: key.length };
    }
  }
  return best?.food ?? seasoning;
}

interface LineEstimate {
  grams: number;
  food: Food;
}

/** Grams and matched food for one ingredient line, or null when unrecognised. */
export function estimateLine(line: string): LineEstimate | null {
  let s = line.toLowerCase().replace(/\s+/g, ' ').trim();
  // Prefer an explicit metric weight anywhere in the line: "150 g (5 oz) chicken" or "5 oz (150 g) chicken".
  const metric = /(\d+(?:\.\d+)?)\s*(g|grams?|ml)\b/.exec(s);
  const paren = /\(([^)]*)\)/.exec(s);
  const name = s.replace(/\([^)]*\)/g, ' ').replace(/^[\d\s./½¼¾⅓⅔⅛]+/, '').replace(UNIT_RE, ' ').replace(/^\s*(of|a|an)\s+/, '').trim();
  const food = findFood(name) ?? findFood(s);
  if (!food) return null;
  if (food.negligible) return { grams: 0, food };
  if (metric) return { grams: Number(metric[1]), food };
  const qty = parseQuantity(s) ?? (paren ? parseQuantity(paren[1]) : null);
  const unitMatch = UNIT_RE.exec(s.replace(/\([^)]*\)/g, ' '));
  const unit = unitMatch?.[1] ?? '';
  const q = qty ?? 1;
  const per = (n?: number, fallback = 0) => (n ?? fallback) * q;
  if (/^kg$/.test(unit)) return { grams: q * 1000, food };
  if (/^(l|litres?|liters?)$/.test(unit)) return { grams: q * 1000, food };
  if (/^cups?$/.test(unit)) return { grams: per(food.cup, 150), food };
  if (/^(tbsp|tablespoons?)$/.test(unit)) return { grams: per(food.tbsp, 15), food };
  if (/^(tsp|teaspoons?)$/.test(unit)) return { grams: per(food.tsp, 5), food };
  if (/^(oz|ounces?)$/.test(unit)) return { grams: q * 28.35, food };
  if (/^(lbs?|pounds?)$/.test(unit)) return { grams: q * 454, food };
  if (/^scoops?$/.test(unit)) return { grams: per(food.scoop, 30), food };
  if (/^slices?$/.test(unit)) return { grams: per(food.slice, 30), food };
  if (/^cloves?$/.test(unit)) return { grams: q * 3, food };
  if (/^(cans?|tins?)$/.test(unit)) return { grams: per(food.can, 240), food };
  if (/^handfuls?$/.test(unit)) return { grams: per(food.handful, 30), food };
  if (/^pinch/.test(unit)) return { grams: 0, food };
  if (/^(large|medium|small|pieces?|wedges?|leaves|leaf|sprigs?)$/.test(unit) || qty !== null) return { grams: per(food.piece, 100), food };
  // No quantity at all ("Sesame seeds", "Spinach to finish"): a garnish-sized amount, never 100 g.
  return { grams: food.tsp ?? food.tbsp ?? food.piece ?? food.handful ?? 30, food };
}

export interface Estimate {
  nutrition: Nutrition;
  /** share of ingredient lines that were recognised (0-1) */
  coverage: number;
}

export function estimateNutrition(ingredients: string[]): Estimate {
  let kcal = 0, p = 0, c = 0, f = 0, recognised = 0;
  for (const line of ingredients) {
    const est = estimateLine(line);
    if (!est) continue;
    recognised++;
    const [k, pp, cc, ff] = est.food.per100;
    kcal += (k * est.grams) / 100;
    p += (pp * est.grams) / 100;
    c += (cc * est.grams) / 100;
    f += (ff * est.grams) / 100;
  }
  return {
    nutrition: { calories: Math.round(kcal / 5) * 5, proteinG: Math.round(p), carbsG: Math.round(c), fatG: Math.round(f) },
    coverage: ingredients.length ? recognised / ingredients.length : 0,
  };
}

export type NutritionSource = 'stated' | 'adjusted' | 'estimated';

/**
 * Keep the stated macros honest. Returns the nutrition to show and where it came from:
 * 'adjusted' when only the calories were corrected to match the macros,
 * 'estimated' when the ingredient estimate replaced the stated values.
 */
export function reconcileNutrition(stated: Nutrition, ingredients: string[]): { nutrition: Nutrition; source: NutritionSource } {
  const est = estimateNutrition(ingredients);
  const fromMacros = 4 * stated.proteinG + 4 * stated.carbsG + 9 * stated.fatG;
  const off = (a: number, b: number) => Math.abs(a - b) / Math.max(b, 1);
  if (est.coverage >= 0.7 && est.nutrition.calories >= 80) {
    const farOff = off(stated.calories, est.nutrition.calories) > 0.2 || Math.abs(stated.proteinG - est.nutrition.proteinG) > Math.max(5, 0.2 * est.nutrition.proteinG);
    if (farOff) return { nutrition: est.nutrition, source: 'estimated' };
  }
  if (off(stated.calories, fromMacros) > 0.05) {
    return { nutrition: { ...stated, calories: Math.round(fromMacros / 5) * 5 }, source: 'adjusted' };
  }
  return { nutrition: stated, source: 'stated' };
}

/* ------------------------- protein pairing rules ------------------------- */

const PROTEIN_GROUPS: [string, RegExp][] = [
  ['chicken', /\bchicken\b/],
  ['turkey', /\bturkey\b/],
  ['beef', /\b(beef|steak|sirloin)\b/],
  ['fish', /\b(fish|salmon|tuna|cod|tilapia|sardines?|mackerel)\b/],
  ['seafood', /\b(shrimp|prawns?|seafood|scallops?|squid)\b/],
  ['eggs', /\beggs?\b|\begg whites?\b/],
  ['dairy', /\b(greek yogurt|yogurt|yoghurt|cottage cheese|cheese|feta|cheddar|parmesan|mozzarella|skyr|quark|milk)\b/],
  ['tofu', /\btofu\b/],
  ['tempeh', /\btempeh\b/],
  ['lentils', /\blentils?\b/],
  ['beans', /\b(black beans?|kidney beans?|cannellini|white beans?|pinto beans?|chickpeas?|hummus|edamame|butter beans?)\b/],
  ['protein powder', /\b(whey|protein powder|plant protein|casein)\b/],
];
const LEGUME_RE = /\b(lentils?|black beans?|kidney beans?|cannellini|white beans?|pinto beans?|chickpeas?|butter beans?)\b/;
const SWEET_RE = /\b(smoothie|shake|oat bowl|oatmeal|oats|porridge|pancakes?|parfait|pudding|chocolate|vanilla|cocoa|berry|berries|banana|honey|maple|dessert|muffins?)\b/;

/** Distinct protein sources named in a recipe's name and ingredients. */
export function proteinSources(name: string, ingredients: string[]): string[] {
  const text = `${name} ${ingredients.join(' ')}`.toLowerCase().replace(/almond milk|oat milk|soy milk|coconut milk|plant milk|peanut butter|almond butter|nut butter/g, ' ');
  return PROTEIN_GROUPS.filter(([, re]) => re.test(text)).map(([g]) => g);
}

/** Why a recipe's protein combination would look like an AI artifact to a coach, else null. */
export function pairingProblem(name: string, ingredients: string[]): string | null {
  const sources = proteinSources(name, ingredients);
  if (sources.length > 2) return `uses ${sources.length} protein sources (${sources.join(', ')}); max two per recipe`;
  const text = `${name} ${ingredients.join(' ')}`.toLowerCase();
  if (LEGUME_RE.test(text) && SWEET_RE.test(text)) return 'legumes in a sweet or dessert-style dish';
  return null;
}
