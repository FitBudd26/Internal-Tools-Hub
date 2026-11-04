/**
 * Hand-written recipe sets in the shape the generation route returns, used
 * only by scripts/atkins-pdf-check.mjs to exercise the PDF layout (short and
 * long names, many ingredients and steps, every nutrition status, Letter and
 * A4). They are test fixtures, not a fallback: the tool never ships a canned
 * recipe.
 */

const ing = (name, quantity, unit, note = '') => ({ name, quantity, unit, note });
const calculated = (calories, protein, totalCarbs, fiber, fat) => ({ calories, protein, totalCarbs, fiber, netCarbs: Math.max(0, totalCarbs - fiber), fat, status: 'calculated', coverage: 1 });

const P1 = {
  plan: 'Atkins 20',
  phase: 'Phase 1 — Induction',
  planLabel: 'Atkins 20 · Phase 1 (Induction)',
  dailyNetCarbs: 'about 20 g net carbs per day',
  mealNetCarbGuide: 10,
};
const fit = (net, status = 'calculated') => ({
  ...P1,
  suitability:
    status === 'calculated'
      ? `About ${net} g net carbs per serving, within the 10 g guide for a dinner on Atkins 20 Induction (about 20 g net carbs per day).`
      : status === 'estimated'
        ? `Roughly ${net} g net carbs per serving (AI estimate) against a guide of about 10 g for a dinner on Atkins 20 Induction (about 20 g net carbs per day). Verify with product labels.`
        : 'The ingredients follow the Atkins 20 Induction food rules (about 20 g net carbs per day); the carb count was not calculated, so check labels before relying on it.',
  reviewStatus: status === 'calculated' ? 'meets_plan_guidelines' : 'requires_nutrition_verification',
});

const recipe = (id, name, over = {}) => ({
  id,
  name,
  description: 'A simple, satisfying low-carb plate built around a lean protein, plenty of non-starchy vegetables and a good fat source.',
  mealType: 'Dinner',
  cuisine: 'Mediterranean',
  prepTime: 10,
  cookTime: 15,
  totalTime: 25,
  servings: 1,
  servingBasis: '1 serving (the whole recipe as written)',
  ingredients: [ing('chicken breast', 170, 'g', 'sliced'), ing('olive oil', 1, 'tbsp'), ing('zucchini', 150, 'g', 'sliced'), ing('garlic', 2, 'clove', 'minced'), ing('lemon juice', 1, 'tbsp'), ing('dried oregano', 1, 'tsp'), ing('salt', 1, 'to taste')],
  instructions: ['Season the chicken with salt and oregano.', 'Heat the olive oil in a skillet over medium-high heat.', 'Sear the chicken for 5 to 6 minutes per side until cooked through (75 C / 165 F), then rest it.', 'Sauté the zucchini and garlic in the same pan for 4 minutes.', 'Finish with lemon juice and serve the chicken over the vegetables.'],
  substitutions: ['Swap chicken for turkey breast with the same weight.', 'Use ghee instead of olive oil for a richer flavour.'],
  nutrition: calculated(450, 42, 9, 3, 26),
  atkinsCompatibility: fit(6),
  nutritionNote: 'Check the label on any pre-marinated chicken for added sugar.',
  ...over,
});

const set = (recipes, over = {}) => ({ plan: 'Atkins 20', phase: 'Phase 1 — Induction', planLabel: P1.planLabel, mealType: 'Dinner', cuisine: 'Mediterranean', recipes, notes: [], ...over });

export function collectionInduction() {
  return set([
    recipe('recipe_1', 'Lemon Garlic Chicken with Zucchini'),
    recipe('recipe_2', 'Greek Salmon Salad Bowl', {
      ingredients: [ing('salmon fillet', 150, 'g'), ing('romaine lettuce', 100, 'g', 'chopped'), ing('cucumber', 80, 'g', 'diced'), ing('kalamata olives', 30, 'g'), ing('feta cheese', 30, 'g', 'crumbled'), ing('olive oil', 1, 'tbsp'), ing('red wine vinegar', 1, 'tsp'), ing('black pepper', 1, 'pinch')],
      instructions: ['Pat the salmon dry and season it.', 'Pan-sear skin side down for 4 minutes, turn and cook 3 more minutes.', 'Toss the lettuce, cucumber and olives with oil and vinegar.', 'Top with the salmon and feta.'],
      nutrition: calculated(520, 38, 8, 3, 38),
      atkinsCompatibility: fit(5),
      cuisine: 'Mediterranean',
      prepTime: 10,
      cookTime: 8,
      totalTime: 18,
    }),
    recipe('recipe_3', 'Herb Crusted Pork Chop with Buttered Cabbage', {
      ingredients: [ing('pork chop', 180, 'g'), ing('green cabbage', 150, 'g', 'shredded'), ing('butter', 1, 'tbsp'), ing('fresh thyme', 1, 'tsp'), ing('garlic', 1, 'clove'), ing('salt', 1, 'to taste'), ing('black pepper', 1, 'pinch')],
      nutrition: calculated(560, 44, 7, 3, 40),
      atkinsCompatibility: fit(4),
      substitutions: [],
      cuisine: 'European',
      prepTime: 5,
      cookTime: 20,
      totalTime: 25,
    }),
  ]);
}

export function longNamesAndSteps() {
  const long = (i) => `Step ${i}: ${'cook the ingredient gently while stirring and adjusting the seasoning to taste, '.repeat(3)}then move on.`;
  return set([
    recipe('recipe_1', 'Slow Simmered Harissa Spiced Chicken Thighs with Charred Eggplant, Roasted Peppers, Olives and a Lemon Tahini Free Herb Oil Finish', {
      ingredients: Array.from({ length: 16 }, (_, i) => ing(`ingredient number ${i + 1} with a fairly long descriptive name`, 10 * (i + 1), i % 2 ? 'g' : 'ml', i % 3 ? 'finely chopped and rinsed well' : '')),
      instructions: Array.from({ length: 12 }, (_, i) => long(i + 1)),
      substitutions: Array.from({ length: 5 }, (_, i) => `Substitution ${i + 1}: ${'swap this ingredient for a compliant alternative of a similar weight, '.repeat(2)}keeping the carbs steady.`),
      nutrition: calculated(610, 45, 12, 5, 42),
      atkinsCompatibility: fit(7),
      nutritionNote: `${'Verify the label on every jarred sauce or paste, since brands vary widely in added sugar; '.repeat(2)}weigh proteins raw.`,
      prepTime: 20,
      cookTime: 25,
      totalTime: 45,
    }),
    recipe('recipe_2', 'Eggs'),
    recipe('recipe_3', 'Béarnaise Steak – “Fancy” … Edition', { description: 'Special characters: café, jalapeño, crème fraîche, 180 °C, 1/2 tsp, ½ cup, ≈5 g, — and “quotes”.' }),
  ]);
}

export function everyNutritionStatus() {
  return set(
    [
      recipe('recipe_1', 'Calculated Chicken Plate'),
      recipe('recipe_2', 'Estimated Mystery Spice Fish', {
        nutrition: { calories: 380, protein: 35, totalCarbs: 6, fiber: 2, netCarbs: 4, fat: 24, status: 'estimated', coverage: 0.55 },
        atkinsCompatibility: fit(4, 'estimated'),
      }),
      recipe('recipe_3', 'Uncalculated Regional Specialty', {
        nutrition: { calories: null, protein: null, totalCarbs: null, fiber: null, netCarbs: null, fat: null, status: 'not_calculated', coverage: 0.2 },
        atkinsCompatibility: fit(null, 'not_calculated'),
        substitutions: [],
      }),
    ],
    { notes: ['Chicken was left out because Vegan was selected.'] },
  );
}

export const SAMPLES = { collectionInduction, longNamesAndSteps, everyNutritionStatus };
