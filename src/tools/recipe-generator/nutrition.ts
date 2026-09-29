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
  /** per 100 g: kcal, protein, carbs, fat (raw weight for meat and fish, cooked for grains and legumes) */
  per100: [number, number, number, number];
  /** values when the line says cooked / grilled / shredded etc. (meat and fish) */
  cooked?: [number, number, number, number];
  /** protein group for pairing rules */
  group?: ProteinGroup;
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

export type ProteinGroup =
  | 'chicken' | 'turkey' | 'beef' | 'fish' | 'seafood' | 'eggs' | 'dairy'
  | 'tofu' | 'tempeh' | 'lentils' | 'beans' | 'protein powder';

const FOODS: Food[] = [
  // Meat and fish: per100 is RAW weight (the usual convention for recipes); `cooked` when the line says so.
  { keys: ['chicken thigh', 'thigh'], per100: [121, 19.7, 0, 4.3], cooked: [179, 24.8, 0, 8.2], group: 'chicken' },
  { keys: ['chicken breast', 'grilled chicken', 'shredded chicken', 'rotisserie chicken', 'chicken'], per100: [120, 22.5, 0, 2.6], cooked: [165, 31, 0, 3.6], cup: 140, group: 'chicken' },
  { keys: ['ground turkey', 'turkey mince'], per100: [148, 19.7, 0, 7.7], cooked: [170, 27, 0, 7], group: 'turkey' },
  { keys: ['turkey breast', 'sliced turkey', 'turkey'], per100: [114, 24, 0, 1.5], cooked: [104, 17, 4, 1], slice: 28, group: 'turkey' },
  { keys: ['ground beef', 'beef mince'], per100: [152, 21, 0, 7], cooked: [180, 26, 0, 8], group: 'beef' },
  { keys: ['sirloin', 'steak', 'beef strips', 'beef'], per100: [142, 22, 0, 5.5], cooked: [200, 29, 0, 9], group: 'beef' },
  { keys: ['salmon'], per100: [208, 20, 0, 13], cooked: [206, 22, 0, 13], group: 'fish' },
  { keys: ['tuna'], per100: [116, 26, 0, 1], cooked: [116, 26, 0, 1], can: 120, group: 'fish' },
  { keys: ['cod', 'white fish', 'tilapia', 'fish'], per100: [82, 18, 0, 0.7], cooked: [105, 23, 0, 1], group: 'fish' },
  { keys: ['shrimp', 'prawn'], per100: [85, 20, 0, 0.5], cooked: [99, 24, 0, 0.3], group: 'seafood' },
  { keys: ['egg white'], per100: [52, 11, 1, 0], piece: 33, group: 'eggs' },
  { keys: ['egg'], per100: [143, 13, 1, 10], piece: 50, group: 'eggs' },
  { keys: ['greek yogurt', 'greek yoghurt', 'skyr'], per100: [66, 10, 4, 1.2], cup: 245, tbsp: 15, group: 'dairy' },
  { keys: ['cottage cheese'], per100: [98, 11, 3, 4], cup: 225, group: 'dairy' },
  { keys: ['feta'], per100: [264, 14, 4, 21], tbsp: 15, group: 'dairy' },
  { keys: ['cheddar'], per100: [403, 25, 1, 33], tbsp: 8, group: 'dairy' },
  { keys: ['parmesan'], per100: [431, 38, 4, 29], tbsp: 8, group: 'dairy' },
  { keys: ['mozzarella', 'cheese'], per100: [300, 22, 2, 22], tbsp: 8, group: 'dairy' },
  { keys: ['skim milk', 'skimmed milk'], per100: [34, 3.4, 5, 0.1], cup: 245, group: 'dairy' },
  { keys: ['almond milk', 'oat milk', 'plant milk', 'soy milk', 'coconut milk'], per100: [24, 0.8, 2, 1.2], cup: 240 },
  { keys: ['milk'], per100: [47, 3.4, 4.8, 1.7], cup: 245, group: 'dairy' },
  { keys: ['butter'], per100: [717, 1, 0, 81], tbsp: 14, tsp: 5 },
  { keys: ['tofu'], per100: [144, 17, 3, 9], group: 'tofu' },
  { keys: ['tempeh'], per100: [192, 20, 8, 11], group: 'tempeh' },
  { keys: ['red lentils', 'dry lentils', 'uncooked lentils'], per100: [352, 25, 60, 1], cup: 190, group: 'lentils' },
  { keys: ['lentil'], per100: [116, 9, 20, 0.4], cup: 200, group: 'lentils' },
  { keys: ['chickpea'], per100: [164, 9, 27, 2.6], cup: 165, can: 240, group: 'beans' },
  { keys: ['edamame'], per100: [121, 12, 9, 5], cup: 155, group: 'beans' },
  { keys: ['hummus'], per100: [166, 8, 14, 10], tbsp: 15, group: 'beans' },
  { keys: ['black bean', 'kidney bean', 'cannellini', 'white bean', 'pinto bean', 'butter bean', 'bean'], per100: [110, 7, 19, 0.5], cup: 170, can: 240, group: 'beans' },
  { keys: ['whey', 'protein powder', 'plant protein', 'casein'], per100: [375, 75, 8, 5], scoop: 30, group: 'protein powder' },
  { keys: ['dry rice', 'uncooked rice'], per100: [365, 7, 80, 0.7], cup: 185 },
  { keys: ['dry quinoa', 'uncooked quinoa'], per100: [368, 14, 64, 6], cup: 170 },
  { keys: ['dry pasta', 'uncooked pasta'], per100: [371, 13, 75, 1.5] },
  { keys: ['pasta'], per100: [158, 6, 31, 1], cup: 140 },
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
  /** values actually applied (raw or cooked) */
  per100: [number, number, number, number];
}

const COOKED_CUE = /\b(cooked|grilled|roasted|baked|shredded|rotisserie|deli|sliced turkey|smoked|canned|tinned|poached|seared|pre-cooked|precooked|leftover)\b/;

/** Grams and matched food for one ingredient line, or null when unrecognised. */
export function estimateLine(line: string): LineEstimate | null {
  let s = line.toLowerCase().replace(/\s+/g, ' ').trim();
  // Prefer an explicit metric weight anywhere in the line: "150 g (5 oz) chicken" or "5 oz (150 g) chicken".
  const metric = /(\d+(?:\.\d+)?)\s*(g|grams?|ml)\b/.exec(s);
  const paren = /\(([^)]*)\)/.exec(s);
  const name = s.replace(/\([^)]*\)/g, ' ').replace(/^[\d\s./½¼¾⅓⅔⅛]+/, '').replace(UNIT_RE, ' ').replace(/^\s*(of|a|an)\s+/, '').trim();
  const food = findFood(name) ?? findFood(s);
  if (!food) return null;
  const per100 = food.cooked && COOKED_CUE.test(s) ? food.cooked : food.per100;
  const done = (grams: number): LineEstimate => ({ grams, food, per100 });
  if (food.negligible) return done(0);
  if (metric) return done(Number(metric[1]));
  const qty = parseQuantity(s) ?? (paren ? parseQuantity(paren[1]) : null);
  const unitMatch = UNIT_RE.exec(s.replace(/\([^)]*\)/g, ' '));
  const unit = unitMatch?.[1] ?? '';
  const q = qty ?? 1;
  const per = (n?: number, fallback = 0) => (n ?? fallback) * q;
  if (/^kg$/.test(unit)) return done(q * 1000);
  if (/^(l|litres?|liters?)$/.test(unit)) return done(q * 1000);
  if (/^cups?$/.test(unit)) return done(per(food.cup, 150));
  if (/^(tbsp|tablespoons?)$/.test(unit)) return done(per(food.tbsp, 15));
  if (/^(tsp|teaspoons?)$/.test(unit)) return done(per(food.tsp, 5));
  if (/^(oz|ounces?)$/.test(unit)) return done(q * 28.35);
  if (/^(lbs?|pounds?)$/.test(unit)) return done(q * 454);
  if (/^scoops?$/.test(unit)) return done(per(food.scoop, 30));
  if (/^slices?$/.test(unit)) return done(per(food.slice, 30));
  if (/^cloves?$/.test(unit)) return done(q * 3);
  if (/^(cans?|tins?)$/.test(unit)) return done(per(food.can, 240));
  if (/^handfuls?$/.test(unit)) return done(per(food.handful, 30));
  if (/^pinch/.test(unit)) return done(0);
  if (/^(large|medium|small|pieces?|wedges?|leaves|leaf|sprigs?)$/.test(unit) || qty !== null) return done(per(food.piece, 100));
  // No quantity at all ("Sesame seeds", "Spinach to finish"): a garnish-sized amount, never 100 g.
  return done(food.tsp ?? food.tbsp ?? food.piece ?? food.handful ?? 30);
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
    const [k, pp, cc, ff] = est.per100;
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
 * The nutrition to show and where it came from. Whenever the ingredient list
 * is recognised (70%+ of lines) the figures are CALCULATED from the listed
 * quantities ('estimated'), so they are checkable against the ingredients.
 * Otherwise the model's figures stand, with calories corrected to match
 * 4 x protein + 4 x carbs + 9 x fat within 5% ('adjusted' / 'stated').
 */
export function reconcileNutrition(stated: Nutrition, ingredients: string[]): { nutrition: Nutrition; source: NutritionSource } {
  const est = estimateNutrition(ingredients);
  if (est.coverage >= 0.7 && est.nutrition.calories >= 80) return { nutrition: est.nutrition, source: 'estimated' };
  const fromMacros = 4 * stated.proteinG + 4 * stated.carbsG + 9 * stated.fatG;
  const off = (a: number, b: number) => Math.abs(a - b) / Math.max(b, 1);
  if (off(stated.calories, fromMacros) > 0.05) {
    return { nutrition: { ...stated, calories: Math.round(fromMacros / 5) * 5 }, source: 'adjusted' };
  }
  return { nutrition: stated, source: 'stated' };
}

/* ------------------------ quantities: exact US conversions ------------------------ */

const fmt = (n: number) => String(Math.round(n * 100) / 100);
function ounces(g: number): string {
  if (g >= 454) return `${fmt(Math.round((g / 453.6) * 10) / 10)} lb`;
  const oz = g / 28.35;
  return `${fmt(oz < 4 ? Math.round(oz * 4) / 4 : Math.round(oz * 2) / 2)} oz`;
}
const CUPS: [number, string][] = [[0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '1'], [1.25, '1¼'], [1.5, '1½'], [2, '2'], [3, '3'], [4, '4']];
function liquid(ml: number): string {
  if (ml <= 45) {
    const tsp = ml / 5;
    if (tsp <= 2 && Math.abs(tsp - Math.round(tsp)) < 0.2) return `${Math.round(tsp)} tsp`;
    return `${fmt(Math.round((ml / 15) * 2) / 2)} tbsp`;
  }
  const cups = ml / 240;
  for (const [v, label] of CUPS) if (Math.abs(cups - v) <= 0.07) return `${label} cup${v > 1 ? 's' : ''}`;
  return `${fmt(Math.round((ml / 29.57) * 2) / 2)} fl oz`;
}

/**
 * "150 g (5 oz) chicken" / "100 g (1/2 cup) cucumber" → grams with an exact ounce figure;
 * "250 ml (1 cup) milk" → millilitres with a recomputed cup, tbsp or fl oz figure.
 * Cup figures for solids drift by 20-40% depending on the ingredient, so solids never get cups.
 */
export function normalizeQuantities(line: string): string {
  const m = /^(\d+(?:\.\d+)?)\s*(g|ml)\b\s*(?:\([^)]*\))?\s*(.*)$/i.exec(line.trim());
  if (!m) return line;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  return `${m[1]} ${unit} (${unit === 'g' ? ounces(n) : liquid(n)}) ${m[3]}`.replace(/\s+/g, ' ').trim();
}

/* ------------------------------ numerals ------------------------------ */

const ONES: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const AFTER = String.raw`(?=\s+(?:to\s+(?:[a-z]+[-\s])?[a-z]+\s+)?(?:minutes?|mins?|seconds?|secs?|hours?|hrs?|days?|weeks?|grams?|g|ml|kcal|calories|cm|inch(?:es)?|degrees|percent|%|servings?|portions?|cups?|tbsp|tablespoons?|tsp|teaspoons?|eggs?|slices?|pieces?|times|x)\b)`;
const NUMBER_WORD = new RegExp(String.raw`\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[-\s](one|two|three|four|five|six|seven|eight|nine))?\b${AFTER}|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b${AFTER}`, 'gi');

/** "thirty five minutes" → "35 minutes", "five to ten minutes" → "5 to 10 minutes"; words without a unit are left alone. */
export function numeralize(text: string): string {
  let out = text;
  for (let pass = 0; pass < 2; pass++) {
    out = out.replace(NUMBER_WORD, (_m, tens?: string, ones?: string, single?: string) => {
      if (single) return String(ONES[single.toLowerCase()]);
      return String(TENS[(tens as string).toLowerCase()] + (ones ? ONES[ones.toLowerCase()] : 0));
    });
  }
  return out;
}

/* --------------------------- salt and added fats --------------------------- */

/** "1 tsp salt" is a day's sodium in one meal. Anything above a quarter teaspoon, or any tablespoon, is a problem. */
export function saltProblem(ingredients: string[]): string | null {
  for (const line of ingredients) {
    const l = line.toLowerCase();
    if (!/\bsalt\b/.test(l) || /to taste/.test(l)) continue;
    const m = /(\d+(?:\.\d+)?|½|¼|¾|⅓|⅔|\d\/\d)\s*(tsp|teaspoons?|tbsp|tablespoons?)/.exec(l);
    if (!m) continue;
    const qty = FRACTIONS[m[1]] ?? (m[1].includes('/') ? Number(m[1].split('/')[0]) / Number(m[1].split('/')[1]) : Number(m[1]));
    const tsp = /tbsp|tablespoon/.test(m[2]) ? qty * 3 : qty;
    if (tsp > 0.25) return `${line.trim()} (${tsp} tsp of salt is far too much for one serving)`;
  }
  return null;
}

/** For low-calorie targets, added fats scale down: a tablespoon of oil becomes two teaspoons. Returns the new list and whether anything changed. */
export function scaleAddedFats(ingredients: string[]): { ingredients: string[]; changed: boolean } {
  let changed = false;
  const out = ingredients.map((line) => {
    if (!/\b(oil|butter|ghee)\b/i.test(line) || /peanut butter|almond butter|nut butter|seed butter/i.test(line)) return line;
    const tbsp = /^(\d+(?:\.\d+)?)\s*(tbsp|tablespoons?)\b\s*(.*)$/i.exec(line.trim());
    if (tbsp && Number(tbsp[1]) >= 1) { changed = true; return `10 ml (2 tsp) ${tbsp[3]}`.trim(); }
    const ml = /^(\d+(?:\.\d+)?)\s*ml\b\s*(?:\([^)]*\))?\s*(.*)$/i.exec(line.trim());
    if (ml && Number(ml[1]) >= 15) { changed = true; return `10 ml (2 tsp) ${ml[2]}`.trim(); }
    return line;
  });
  return { ingredients: out, changed };
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

/**
 * Distinct protein sources in a recipe. Meat, fish, tofu, tempeh, legumes and
 * protein powder count on presence; eggs and dairy count only when they bring
 * at least 6 g of protein, so a splash of milk in oats is not "a protein".
 */
export function proteinSources(name: string, ingredients: string[]): ProteinGroup[] {
  const grams = new Map<ProteinGroup, number>();
  const seen = new Set<ProteinGroup>();
  for (const line of ingredients) {
    const est = estimateLine(line);
    if (est?.food.group) {
      const g = est.food.group;
      grams.set(g, (grams.get(g) ?? 0) + (est.per100[1] * est.grams) / 100);
      seen.add(g);
    } else if (!est) {
      // Unrecognised line: fall back to name matching.
      const l = ` ${line.toLowerCase()} `.replace(/almond milk|oat milk|soy milk|coconut milk|plant milk|peanut butter|almond butter|nut butter/g, ' ');
      for (const [g, re] of PROTEIN_GROUPS) if (re.test(l)) { seen.add(g as ProteinGroup); grams.set(g as ProteinGroup, (grams.get(g as ProteinGroup) ?? 0) + 10); }
    }
  }
  const lower = ` ${name.toLowerCase()} `;
  for (const [g, re] of PROTEIN_GROUPS) if (re.test(lower) && !seen.has(g as ProteinGroup)) { seen.add(g as ProteinGroup); grams.set(g as ProteinGroup, 10); }
  return [...seen].filter((g) => (g === 'dairy' || g === 'eggs' ? (grams.get(g) ?? 0) >= 6 : true));
}

/** Protein option label → protein group, for "no unselected proteins". */
export const PROTEIN_OPTION_GROUP: Record<string, ProteinGroup> = {
  Chicken: 'chicken', Turkey: 'turkey', Beef: 'beef', Fish: 'fish', Seafood: 'seafood', Eggs: 'eggs', Dairy: 'dairy',
  Tofu: 'tofu', Tempeh: 'tempeh', Lentils: 'lentils', Beans: 'beans', 'Whey / Protein Powder': 'protein powder',
};

/** A protein source the coach did not select (unless they chose No Preference), else null. */
export function unselectedProtein(sources: ProteinGroup[], selected: readonly string[]): ProteinGroup | null {
  if (selected.length === 0 || selected.includes('No Preference')) return null;
  const allowed = new Set(selected.map((p) => PROTEIN_OPTION_GROUP[p]).filter(Boolean));
  return sources.find((s) => !allowed.has(s)) ?? null;
}

const MAIN_MEALS = new Set(['Breakfast', 'Lunch', 'Dinner', 'Meal Prep', 'Post-Workout']);

/** Goal-based floors: fat-loss, high-protein and muscle mains need 25 g protein; fat-loss meals never carry more fat than protein. */
export function proteinFloorProblem(recipe: { mealType: string; nutrition: Nutrition }, goal: string | null): string | null {
  const proteinGoal = goal === 'Fat Loss' || goal === 'High Protein' || goal === 'Muscle Building';
  const main = MAIN_MEALS.has(recipe.mealType);
  if (proteinGoal && main && recipe.nutrition.proteinG < 25) return `${recipe.nutrition.proteinG} g protein is under the 25 g floor for a ${goal} main meal`;
  if (proteinGoal && !main && recipe.nutrition.proteinG < 10) return `${recipe.nutrition.proteinG} g protein is under the 10 g floor for a ${goal} snack`;
  if (goal === 'Fat Loss' && recipe.nutrition.fatG > recipe.nutrition.proteinG) return `more fat (${recipe.nutrition.fatG} g) than protein (${recipe.nutrition.proteinG} g) for a fat-loss meal`;
  return null;
}

/** Why a recipe's protein combination would look like an AI artifact to a coach, else null. */
export function pairingProblem(name: string, ingredients: string[]): string | null {
  const sources = proteinSources(name, ingredients);
  if (sources.length > 2) return `uses ${sources.length} protein sources (${sources.join(', ')}); max two per recipe`;
  const text = `${name} ${ingredients.join(' ')}`.toLowerCase();
  if (LEGUME_RE.test(text) && SWEET_RE.test(text)) return 'legumes in a sweet or dessert-style dish';
  return null;
}
