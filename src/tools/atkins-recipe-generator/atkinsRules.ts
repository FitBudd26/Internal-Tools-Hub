import type { AtkinsPhase, AtkinsPlan, CarbRange, Ingredient, MealType, Protein, RecipeConfig, Restriction } from './types.js';
import { COOKING_TIME_LIMITS } from './types.js';
import { gramsFor, findFood, UNKNOWN_MASS_G } from './nutrition.js';

/**
 * The dietary rule engine for the Atkins Diet Recipe Generator, kept apart
 * from the AI prompt. It describes each plan and phase (a configurable
 * reference based on published Atkins guidance: daily net-carb framework,
 * foods to build on, foods reintroduced in measured portions, foods to
 * avoid), turns that into prompt text, and checks every generated recipe
 * against the same rules: no conflicting ingredients, measured foods within
 * their portion, restrictions and avoided ingredients respected, selected
 * proteins used, cooking time met, and the meal's net carbs inside a
 * reasonable share of the DAILY budget (20 g or 40 g is a day, never one
 * meal). Nothing here claims an Atkins affiliation.
 */

export interface FoodRule {
  label: string;
  re: RegExp;
}
export interface MeasuredRule extends FoodRule {
  /** largest sensible portion for one serving, in grams */
  maxGrams: number;
}

export interface PlanProfile {
  key: string;
  plan: AtkinsPlan;
  phase: AtkinsPhase | null;
  /** "Atkins 20 · Phase 1 (Induction)" */
  label: string;
  /** "Atkins 20 Induction" */
  short: string;
  /** "about 20 g net carbs per day" */
  dailyNetCarbs: string;
  /** the number used to size one meal's share of the day */
  planningMidpoint: number;
  summary: string;
  emphasize: string[];
  measured: string[];
  avoid: string[];
  forbidden: FoodRule[];
  measuredFoods: MeasuredRule[];
  /** false for the user-defined Flexible Low-Carb plan */
  endorsed: boolean;
}

/* ------------------------------ food groups ------------------------------ */

const SUGARS: FoodRule = {
  label: 'sugar, syrup or a sweetened food',
  re: /\b(sugar|honey|maple syrup|agave|golden syrup|corn syrup|syrup|molasses|jaggery|condensed milk|caramel|milk chocolate|white chocolate|chocolate chips|candy|marshmallows?|jam|jelly|marmalade|nutella|sweetened|fruit juice|orange juice|apple juice|ketchup|bbq sauce|barbecue sauce|hoisin|teriyaki|sweet chili sauce)\b/,
};
const REFINED_GRAINS: FoodRule = {
  label: 'bread, pasta, flour or another refined grain',
  re: /\b(white rice|white bread|bread|toast|buns?|bagels?|croissants?|pita|naan|roti|chapati|paratha|tortillas?|wraps?|pasta|spaghetti|penne|fusilli|macaroni|linguine|fettuccine|lasagna|lasagne|noodles?|ramen|udon|orzo|couscous|crackers?|pastry|pie crust|puff pastry|breadcrumbs?|panko|cornstarch|cornflour|corn starch|pizza (?:base|dough|crust)|(?<!almond |coconut |chickpea |flaxseed |flax |psyllium |lupin |sunflower |sesame |gram )flour|semolina|croutons?|dumplings?|wontons?|gnocchi|pancakes?|waffles?|cereal|granola|muesli|rice cakes?|rice paper)\b/,
};
const WHOLE_GRAINS: FoodRule = {
  label: 'a grain',
  re: /\b(rice|quinoa|oats?|oatmeal|porridge|barley|bulgur|farro|millet|buckwheat|spelt|wheat|wholegrain|whole[- ]grain|polenta|cornmeal|grits|corn|popcorn|amaranth|sorghum|teff|wild rice|brown rice)\b/,
};
const STARCHY_VEG: FoodRule = {
  label: 'a starchy vegetable',
  re: /\b(potato(?:es)?|sweet potato(?:es)?|yams?|cassava|plantains?|parsnips?|butternut|winter squash|acorn squash|kabocha|taro|beets?|beetroot|carrots?)\b/,
};
const LEGUMES: FoodRule = {
  label: 'a legume',
  re: /\b(lentils?|chickpeas?|garbanzos?|hummus|falafel|black beans?|kidney beans?|pinto beans?|cannellini|white beans?|navy beans?|butter beans?|lima beans?|baked beans|refried beans|beans?|edamame|soybeans?|split peas|peas|dal|dhal|chana|rajma|chickpea flour|gram flour|besan)\b/,
};
const NUTS_SEEDS: FoodRule = {
  label: 'nuts or seeds',
  re: /\b(almonds?|walnuts?|pecans?|cashews?|pistachios?|hazelnuts?|macadamias?|peanuts?|pine nuts?|brazil nuts?|mixed nuts|nuts?|almond flour|almond meal|almond butter|peanut butter|nut butter|cashew butter|chia(?: seeds?)?|flax(?:seeds?| seeds?|seed meal)?|linseeds?|pumpkin seeds?|pepitas|sunflower seeds?|sesame seeds?|hemp seeds?|hemp hearts|tahini|seeds?)\b/,
};
const BERRIES: FoodRule = {
  label: 'berries, cherries or melon',
  re: /\b(strawberr(?:y|ies)|blueberr(?:y|ies)|raspberr(?:y|ies)|blackberr(?:y|ies)|cranberr(?:y|ies)|berries|cherr(?:y|ies)|melon|cantaloupe|watermelon|honeydew)\b/,
};
const OTHER_FRUIT: FoodRule = {
  label: 'higher-carb fruit',
  re: /\b(bananas?|apples?|oranges?|mango(?:es)?|pineapple|grapes?|pears?|peach(?:es)?|plums?|raisins?|sultanas|dried fruit|figs?|kiwis?|papaya|pomegranate|apricots?|nectarines?|tangerines?|clementines?|mandarins?|dates?|prunes?)\b/,
};
const MILK_YOGURT: FoodRule = {
  label: 'milk or yogurt',
  re: /\b(milk|yogh?urt|kefir|buttermilk|half-and-half|ice cream|frozen yogurt)\b/,
};

/** Phrases that look like a restricted food but are not: removed before any rule is tested. */
const ALLOWED_PHRASES = [
  /green beans?/g, /string beans?/g, /french beans?/g, /runner beans?/g, /bean sprouts?/g, /beansprouts?/g, /vanilla bean/g, /coffee beans?/g,
  /snap peas?/g, /snow peas?/g, /sugar snap/g, /pea shoots/g, /mangetout/g, /pea protein/g,
  /almond milk/g, /coconut milk/g, /coconut cream/g, /coconut oil/g, /coconut aminos/g, /coconut flour/g, /coconut yogh?urt/g, /cashew milk/g, /macadamia milk/g, /hemp milk/g, /flax milk/g, /soy milk/g, /milk thistle/g,
  /sesame oil/g, /peanut oil/g, /walnut oil/g, /mct oil/g,
  /mustard seeds?/g, /cumin seeds?/g, /coriander seeds?/g, /fennel seeds?/g, /celery seeds?/g, /caraway seeds?/g, /nigella seeds?/g, /poppy seeds?/g, /fenugreek seeds?/g, /anise seeds?/g, /cardamom/g, /nutmeg/g,
  /sugar[- ]free/g, /no (?:added )?sugar(?: added)?/g, /unsweetened/g, /sugar substitute/g, /sugar alcohol/g, /brown sugar substitute/g, /zero[- ]sugar/g, /keto syrup/g,
  /cauliflower rice/g, /riced cauliflower/g, /konjac rice/g, /shirataki rice/g, /rice vinegar/g, /rice wine/g, /wild rice vinegar/g,
  /shirataki noodles?/g, /konjac noodles?/g, /kelp noodles?/g, /zucchini noodles?/g, /zoodles/g, /courgetti/g, /cucumber noodles?/g, /miracle noodles?/g, /spaghetti squash/g, /egg wraps?/g, /cheese wraps?/g, /lettuce wraps?/g, /lettuce cups?/g, /collard wraps?/g,
  /cloud bread/g, /keto bread/g, /low[- ]carb bread/g, /almond flour bread/g, /low[- ]carb tortillas?/g, /keto tortillas?/g, /low[- ]carb wraps?/g, /cauliflower (?:pizza )?crust/g, /cheese crust/g, /chaffles?/g, /oat fibre?/g,
  /corn tortillas? \(none\)/g, /baby corn/g, /peppercorns?/g, /cornichons?/g, /acorn squash/g,
  /date paste \(none\)/g, /to date/g, /up to date/g, /dates?\b(?= of)/g,
];

/** Lowercase text with the allowed phrases removed, ready for the food-group rules. */
export function normalizeFoodText(s: string): string {
  let t = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const re of ALLOWED_PHRASES) t = t.replace(re, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

/* ---------------------------- plan definitions ---------------------------- */

const PROTEIN_BASE = [
  'eggs',
  'meat, poultry, fish and seafood',
  'foundation (non-starchy) vegetables: leafy greens, broccoli, cauliflower, zucchini, peppers, mushrooms, asparagus, cucumber, celery, green beans, cabbage, tomato and onion in modest amounts',
  'healthy fats: olive oil, butter, avocado, olives, mayonnaise',
  'hard and aged cheeses in modest amounts, cream in small amounts',
];

function profile(p: Omit<PlanProfile, 'key' | 'label' | 'short'> & { key: string; label: string; short: string }): PlanProfile {
  return p;
}

const PHASE1 = profile({
  key: 'atkins20_phase1',
  plan: 'Atkins 20',
  phase: 'Phase 1 — Induction',
  label: 'Atkins 20 · Phase 1 (Induction)',
  short: 'Atkins 20 Induction',
  dailyNetCarbs: 'about 20 g net carbs per day',
  planningMidpoint: 20,
  summary: 'Induction: about 20 g net carbs a day, most of them from foundation vegetables (12 to 15 g).',
  emphasize: PROTEIN_BASE,
  measured: ['a squeeze of lemon or lime, tomato and onion in small amounts', 'unsweetened almond milk and a splash of cream'],
  avoid: [
    'grains, bread, pasta, rice, potatoes, corn and anything made with flour',
    'legumes (beans, lentils, chickpeas, peas)',
    'fruit other than avocado, olives and a squeeze of citrus (no berries yet)',
    'nuts, seeds, nut flours and nut butters',
    'milk, yogurt and sweetened dairy',
    'sugar, honey, syrups, sweetened sauces and juices',
  ],
  forbidden: [SUGARS, REFINED_GRAINS, WHOLE_GRAINS, STARCHY_VEG, LEGUMES, NUTS_SEEDS, BERRIES, OTHER_FRUIT, MILK_YOGURT],
  measuredFoods: [],
  endorsed: true,
});

const PHASE2 = profile({
  key: 'atkins20_phase2',
  plan: 'Atkins 20',
  phase: 'Phase 2 — Ongoing Weight Loss',
  label: 'Atkins 20 · Phase 2 (Ongoing Weight Loss)',
  short: 'Atkins 20 Phase 2',
  dailyNetCarbs: 'typically 25 to 50 g net carbs per day, rising gradually',
  planningMidpoint: 35,
  summary: 'Ongoing Weight Loss: the daily net-carb budget rises in small steps (typically 25 to 50 g) as foods are reintroduced in order.',
  emphasize: PROTEIN_BASE,
  measured: [
    'nuts and seeds (about 30 g)',
    'berries, cherries or melon (about half a cup)',
    'plain whole-milk yogurt, ricotta or cottage cheese',
    'small portions of legumes (about a quarter cup cooked) later in the phase',
  ],
  avoid: ['grains, bread, pasta, rice, potatoes and other starches', 'higher-carb fruit such as bananas, grapes, mango and dried fruit', 'sugar, honey, syrups and sweetened sauces'],
  forbidden: [SUGARS, REFINED_GRAINS, WHOLE_GRAINS, STARCHY_VEG, OTHER_FRUIT],
  measuredFoods: [
    { ...NUTS_SEEDS, maxGrams: 45 },
    { ...BERRIES, maxGrams: 100 },
    { ...LEGUMES, maxGrams: 60 },
    { ...MILK_YOGURT, maxGrams: 180 },
  ],
  endorsed: true,
});

const PHASE3 = profile({
  key: 'atkins20_phase3',
  plan: 'Atkins 20',
  phase: 'Phase 3 — Pre-Maintenance',
  label: 'Atkins 20 · Phase 3 (Pre-Maintenance)',
  short: 'Atkins 20 Phase 3',
  dailyNetCarbs: 'typically 50 to 80 g net carbs per day, at the personal carb tolerance',
  planningMidpoint: 65,
  summary: 'Pre-Maintenance: a wider range of foods in measured portions while the personal carb tolerance is found (typically 50 to 80 g a day).',
  emphasize: PROTEIN_BASE,
  measured: [
    'additional fruit in measured portions',
    'legumes',
    'starchy vegetables such as sweet potato, winter squash and carrots in small portions',
    'whole grains such as quinoa, oats and brown rice (about a quarter to half a cup cooked)',
    'nuts, seeds, berries and plain dairy',
  ],
  avoid: ['added sugar, honey, syrups and sweetened sauces', 'refined grains and flour-based foods in anything but small amounts'],
  forbidden: [SUGARS, REFINED_GRAINS],
  measuredFoods: [
    { ...WHOLE_GRAINS, maxGrams: 100 },
    { ...STARCHY_VEG, maxGrams: 120 },
    { ...LEGUMES, maxGrams: 120 },
    { ...OTHER_FRUIT, maxGrams: 150 },
    { ...NUTS_SEEDS, maxGrams: 60 },
    { ...BERRIES, maxGrams: 150 },
  ],
  endorsed: true,
});

const PHASE4 = profile({
  key: 'atkins20_phase4',
  plan: 'Atkins 20',
  phase: 'Phase 4 — Lifetime Maintenance',
  label: 'Atkins 20 · Phase 4 (Lifetime Maintenance)',
  short: 'Atkins 20 Phase 4',
  dailyNetCarbs: 'typically 60 to 100 g net carbs per day, at the personal carb tolerance',
  planningMidpoint: 80,
  summary: 'Lifetime Maintenance: a long-term low-carb pattern at the personal carb tolerance (typically 60 to 100 g a day), with sensible portions of whole foods.',
  emphasize: PROTEIN_BASE,
  measured: ['whole grains, starchy vegetables, legumes and fruit in sensible portions', 'nuts, seeds, berries and plain dairy'],
  avoid: ['added sugars, sweet sauces and sugary desserts', 'large portions of refined grains and flour-based foods'],
  forbidden: [SUGARS],
  measuredFoods: [
    { ...REFINED_GRAINS, maxGrams: 60 },
    { ...WHOLE_GRAINS, maxGrams: 120 },
    { ...STARCHY_VEG, maxGrams: 150 },
    { ...LEGUMES, maxGrams: 150 },
    { ...OTHER_FRUIT, maxGrams: 180 },
  ],
  endorsed: true,
});

const ATKINS40 = profile({
  key: 'atkins40',
  plan: 'Atkins 40',
  phase: null,
  label: 'Atkins 40',
  short: 'Atkins 40',
  dailyNetCarbs: 'about 40 g net carbs per day',
  planningMidpoint: 40,
  summary: 'Atkins 40: about 40 g net carbs a day from the start, with a wider food range than Atkins 20 Induction (this is not Atkins 20 Phase 1).',
  emphasize: PROTEIN_BASE,
  measured: [
    'nuts and seeds (about 30 g)',
    'berries and other fruit in small portions',
    'plain yogurt and cheese',
    'small portions of legumes, starchy vegetables or whole grains (about a quarter cup)',
  ],
  avoid: ['sugar, honey, syrups and sweetened sauces', 'refined grains, bread and pasta in anything but small amounts'],
  forbidden: [SUGARS, REFINED_GRAINS],
  measuredFoods: [
    { ...WHOLE_GRAINS, maxGrams: 80 },
    { ...STARCHY_VEG, maxGrams: 100 },
    { ...LEGUMES, maxGrams: 100 },
    { ...OTHER_FRUIT, maxGrams: 120 },
    { ...NUTS_SEEDS, maxGrams: 60 },
    { ...BERRIES, maxGrams: 120 },
  ],
  endorsed: true,
});

const CARB_RANGE_MIDPOINTS: Record<CarbRange, number> = {
  '20-30 g per day': 25,
  '30-50 g per day': 40,
  '50-75 g per day': 62,
  '75-100 g per day': 88,
};

function flexible(range: CarbRange): PlanProfile {
  const mid = CARB_RANGE_MIDPOINTS[range];
  const base = mid <= 30 ? PHASE2 : mid <= 50 ? ATKINS40 : mid <= 75 ? PHASE3 : PHASE4;
  return {
    ...base,
    key: `flexible_${mid}`,
    plan: 'Flexible Low-Carb',
    phase: null,
    label: `Flexible Low-Carb (${range})`,
    short: 'Flexible Low-Carb',
    dailyNetCarbs: `the user's own target of ${range.replace(' per day', '')} net carbs per day`,
    planningMidpoint: mid,
    summary: `Flexible low-carb at the user's own target of ${range.replace(' per day', '')} net carbs a day. This is a custom plan, not an official Atkins plan.`,
    endorsed: false,
  };
}

const PHASES: Record<AtkinsPhase, PlanProfile> = {
  'Phase 1 — Induction': PHASE1,
  'Phase 2 — Ongoing Weight Loss': PHASE2,
  'Phase 3 — Pre-Maintenance': PHASE3,
  'Phase 4 — Lifetime Maintenance': PHASE4,
};

export function profileFor(c: Pick<RecipeConfig, 'plan' | 'phase' | 'carbRange'>): PlanProfile {
  if (c.plan === 'Atkins 20') return PHASES[c.phase] ?? PHASE1;
  if (c.plan === 'Atkins 40') return ATKINS40;
  return flexible(c.carbRange);
}

const MAIN_MEALS: ReadonlySet<MealType> = new Set<MealType>(['Breakfast', 'Lunch', 'Dinner', 'Meal Prep']);

/** Net carbs one meal of this type can reasonably use: half the day for a main meal, under a third for a snack or dessert. */
export function mealNetCarbGuide(p: PlanProfile, mealType: MealType): number {
  return Math.round(p.planningMidpoint * (MAIN_MEALS.has(mealType) ? 0.5 : 0.3));
}

/* ------------------------------ restrictions ------------------------------ */

const MEAT_FISH = /\b(chicken|turkey|beef|steak|sirloin|ribeye|brisket|pork|bacon|pancetta|ham|prosciutto|salami|pepperoni|chorizo|sausages?|lamb|duck|veal|venison|bison|goat|meat|mince|jerky|pork rinds?|chicharrones|gelatin|gelatine|lard|tallow|bone broth|chicken (?:broth|stock)|beef (?:broth|stock)|fish (?:broth|stock)|fish|salmon|cod|tuna|tilapia|trout|halibut|mackerel|sardines?|anchov(?:y|ies)|sea bass|haddock|snapper|shrimp|prawns?|scallops?|squid|calamari|crab|lobster|mussels?|clams?|octopus|oysters?|seafood|fish sauce|oyster sauce|worcestershire)\b/;
const DAIRY_RE = /\b((?<!vegan |dairy-free |plant-based |cashew |almond |coconut )cheese|cheddar|mozzarella|parmesan|pecorino|feta|paneer|halloumi|ricotta|cream cheese|cottage cheese|mascarpone|brie|camembert|gouda|gruyere|gruyère|goat cheese|blue cheese|(?<!coconut |soy |almond |plant |dairy-free |vegan )yogh?urt|kefir|(?<!peanut |almond |nut |cashew |cocoa |coconut |sunflower |apple )butter(?! lettuce|nut)|ghee|(?<!coconut |cashew )cream(?! of tartar)|sour cream|creme fraiche|(?<!almond |coconut |oat |soy |cashew |rice |hemp |macadamia |pea |flax )milk|buttermilk|whey|casein|lassi|ranch dressing|caesar dressing)\b/;
const EGG_RE = /\b(eggs?|egg whites?|egg yolks?|mayonnaise|mayo|aioli|meringue|custard|hollandaise|frittata|omelet(?:te)?|quiche|egg noodles)\b/;
const GLUTEN_RE = /\b(wheat|(?<!almond |coconut |chickpea |flaxseed |flax |psyllium |lupin |sunflower |sesame |gram |rice |buckwheat )flour|bread|toast|buns?|bagels?|pita|naan|roti|chapati|paratha|(?<!corn |low-carb |low carb |keto |almond )tortillas?|wraps?|pasta|spaghetti|penne|fusilli|macaroni|linguine|fettuccine|lasagna|lasagne|(?<!shirataki |zucchini |konjac |kelp |rice |glass |sweet potato |egg-free )noodles?|couscous|bulgur|barley|rye|seitan|breadcrumbs?|panko|(?<!gluten-free |gluten free )soy sauce|teriyaki|hoisin|beer|malt|crackers?|pastry|pie crust|croutons?|semolina|farro|spelt|udon|ramen|orzo|dumplings?|wontons?|gnocchi)\b/;
const NUT_RE = /\b(almonds?|walnuts?|pecans?|cashews?|pistachios?|hazelnuts?|macadamias?|peanuts?|pine nuts?|brazil nuts?|mixed nuts|nuts?|almond (?:flour|meal|milk|butter|extract)|peanut (?:butter|oil|sauce)|nut butter|cashew (?:butter|milk|cream)|pesto|marzipan|praline|nutella|satay)\b/;
const VEGAN_EXTRA = /\b(honey|whey|collagen|gelatin|gelatine|lard|ghee|butter|cream|cheese|milk|yogh?urt|eggs?|mayonnaise|mayo|aioli)\b/;

export const RESTRICTION_RULES: Record<Restriction, FoodRule | null> = {
  Vegetarian: { label: 'Vegetarian', re: MEAT_FISH },
  Vegan: { label: 'Vegan', re: new RegExp(`${MEAT_FISH.source}|${DAIRY_RE.source}|${EGG_RE.source}|${VEGAN_EXTRA.source}`) },
  'Dairy-Free': { label: 'Dairy-Free', re: DAIRY_RE },
  'Gluten-Free': { label: 'Gluten-Free', re: GLUTEN_RE },
  'Nut-Free': { label: 'Nut-Free', re: NUT_RE },
  'Egg-Free': { label: 'Egg-Free', re: EGG_RE },
  'No Restrictions': null,
};

/** Phrases stripped before restriction rules run (a "flax egg" is not an egg; "vegan mayo" has no egg). */
const RESTRICTION_ALLOWED = [/vegan mayo(?:nnaise)?/g, /egg-free mayo(?:nnaise)?/g, /flax eggs?/g, /chia eggs?/g, /eggplant/g, /aubergine/g, /butternut/g, /peanut oil/g, /coconut (?:oil|milk|cream|aminos|flour|yogh?urt|butter)/g, /nutmeg/g, /nutritional yeast/g, /cocoa butter/g, /tamari/g, /coconut aminos/g, /gluten-free/g, /gluten free/g, /dairy-free/g, /dairy free/g, /plant-based/g, /vegan/g];

function restrictionText(s: string): string {
  let t = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const re of RESTRICTION_ALLOWED) t = t.replace(re, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

/* -------------------------------- proteins -------------------------------- */

export const PROTEIN_PATTERNS: Record<Exclude<Protein, 'No Preference'>, RegExp> = {
  Chicken: /\bchicken\b(?! (?:broth|stock))/,
  Turkey: /\bturkey\b/,
  Beef: /\b(beef|steak|sirloin|ribeye|rib-eye|brisket|flank|skirt steak|bison|veal)\b/,
  Pork: /\b(pork|(?<!turkey |chicken |beef )bacon|pancetta|(?<!turkey |chicken )ham|prosciutto|salami|pepperoni|chorizo|(?<!turkey |chicken |vegan |plant-based )sausages?|lard)\b/,
  Fish: /\b(fish|salmon|cod|tuna|tilapia|trout|halibut|mackerel|sardines?|anchov(?:y|ies)|sea bass|haddock|snapper|barramundi|pollock|hake|flounder|sole)\b(?! (?:sauce|stock|broth))/,
  Seafood: /\b(shrimp|prawns?|scallops?|squid|calamari|crab|crabmeat|lobster|mussels?|clams?|octopus|oysters?|seafood)\b(?! sauce)/,
  Eggs: /\b(eggs?|egg whites?|egg yolks?)\b/,
  Dairy: /\b(cheese|cheddar|mozzarella|parmesan|pecorino|feta|paneer|halloumi|ricotta|cream cheese|cottage cheese|mascarpone|brie|gouda|gruyere|goat cheese|blue cheese|greek yogh?urt|yogh?urt|skyr|kefir|cottage)\b/,
  Tofu: /\btofu\b/,
  Tempeh: /\btempeh\b/,
};
const OTHER_MEAT = /\b(lamb|duck|venison|goat)\b/;

/** Main protein groups (eggs and dairy also appear beside them in a dish, so they never count as stray). */
export const MAIN_PROTEINS: Exclude<Protein, 'No Preference' | 'Eggs' | 'Dairy'>[] = ['Chicken', 'Turkey', 'Beef', 'Pork', 'Fish', 'Seafood', 'Tofu', 'Tempeh'];

const EXCLUDED_BY: Partial<Record<Restriction, Protein[]>> = {
  Vegan: ['Chicken', 'Turkey', 'Beef', 'Pork', 'Fish', 'Seafood', 'Eggs', 'Dairy'],
  Vegetarian: ['Chicken', 'Turkey', 'Beef', 'Pork', 'Fish', 'Seafood'],
  'Dairy-Free': ['Dairy'],
  'Egg-Free': ['Eggs'],
};

export interface ProteinResolution {
  /** proteins that can actually be used */
  effective: Protein[];
  excluded: { protein: Protein; reason: Restriction }[];
}

/** A chosen protein that conflicts with a restriction is left out with a reason (the restriction wins). */
export function resolveProteins(proteins: readonly Protein[], restrictions: readonly Restriction[]): ProteinResolution {
  const excluded: ProteinResolution['excluded'] = [];
  const effective: Protein[] = [];
  for (const p of proteins) {
    const reason = restrictions.find((r) => EXCLUDED_BY[r]?.includes(p));
    if (reason) excluded.push({ protein: p, reason });
    else effective.push(p);
  }
  return { effective, excluded };
}

/* --------------------------------- checks --------------------------------- */

/** "mushrooms, shellfish and peanuts" → ['mushrooms', 'shellfish', 'peanuts'] */
export function avoidTerms(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[,;\n]|\band\b|\bor\b/)
    .map((t) => t.replace(/[^a-z\s-]/g, ' ').replace(/\b(no|any|all|some|the|please|avoid|without)\b/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((t) => t.length >= 3)
    .slice(0, 12);
}

const singular = (t: string) => t.replace(/(ies)$/, 'y').replace(/(?<=[a-z])(es|s)$/, '');

/** Does the text mention this term (singular or plural)? */
export function mentions(text: string, term: string): boolean {
  const base = singular(term.trim().toLowerCase());
  if (base.length < 3) return false;
  return new RegExp(`(^|[^a-z])${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(es|s|ies)?(?![a-z])`).test(text.toLowerCase());
}

export interface RecipeCandidate {
  name: string;
  ingredients: Ingredient[];
  totalTime: number;
  netCarbs: number | null;
}

const ingredientText = (i: Ingredient) => `${i.name} ${i.note}`.trim();

function gramsOf(i: Ingredient): number {
  return gramsFor(i, findFood(i.name)) ?? gramsFor(i, null) ?? UNKNOWN_MASS_G;
}

/** Every reason this recipe does not fit the plan, the restrictions, the proteins or the time. Empty means it passes. */
export function checkRecipe(r: RecipeCandidate, config: RecipeConfig, p: PlanProfile): string[] {
  const problems: string[] = [];
  const texts = r.ingredients.map(ingredientText);
  const normalized = texts.map(normalizeFoodText);

  for (const rule of p.forbidden) {
    const hit = normalized.findIndex((t) => rule.re.test(t));
    if (hit >= 0) problems.push(`"${texts[hit]}" is ${rule.label}, which ${p.short} leaves out`);
  }
  for (const rule of p.measuredFoods) {
    r.ingredients.forEach((ing, i) => {
      if (!rule.re.test(normalized[i])) return;
      const g = gramsOf(ing);
      if (g > rule.maxGrams) problems.push(`"${texts[i]}" is about ${Math.round(g)} g of ${rule.label}; ${p.short} keeps that to about ${rule.maxGrams} g per serving`);
    });
  }

  const restrictionTexts = texts.map(restrictionText);
  for (const restriction of config.restrictions) {
    const rule = RESTRICTION_RULES[restriction];
    if (!rule) continue;
    const hit = restrictionTexts.findIndex((t) => rule.re.test(t));
    if (hit >= 0) problems.push(`"${texts[hit]}" conflicts with ${rule.label}`);
  }

  const nameAndIngredients = `${r.name} ${texts.join(' ')}`;
  for (const term of avoidTerms(config.avoid)) {
    if (mentions(nameAndIngredients, term)) problems.push(`contains "${term}", which must be avoided`);
  }

  const { effective } = resolveProteins(config.proteins, config.restrictions);
  const specific = effective.filter((x): x is Exclude<Protein, 'No Preference'> => x !== 'No Preference');
  const anyProtein = effective.length === 0 || effective.includes('No Preference');
  const corpus = restrictionText(nameAndIngredients);
  if (!anyProtein && specific.length) {
    const present = specific.filter((x) => PROTEIN_PATTERNS[x].test(corpus));
    if (!present.length) problems.push(`uses none of the selected proteins (${specific.join(', ')})`);
    for (const main of MAIN_PROTEINS) {
      if (!specific.includes(main) && PROTEIN_PATTERNS[main].test(corpus)) problems.push(`introduces ${main.toLowerCase()}, which was not selected`);
    }
    if (OTHER_MEAT.test(corpus)) problems.push('introduces a meat that was not selected');
  }

  const limit = COOKING_TIME_LIMITS[config.cookingTime ?? 'No Preference'];
  if (r.totalTime > limit) problems.push(`takes ${r.totalTime} minutes, over the ${limit} minute limit`);

  if (r.netCarbs !== null && config.mealType) {
    const guide = mealNetCarbGuide(p, config.mealType);
    if (r.netCarbs > guide * 1.15 + 1) problems.push(`${r.netCarbs} g net carbs is over the ${guide} g guide for a ${config.mealType.toLowerCase()} on ${p.short} (${p.dailyNetCarbs})`);
  }
  return problems;
}

/** One sentence on how a passing recipe sits inside the plan, for the card and the PDF. */
export function suitabilityLine(p: PlanProfile, mealType: MealType, netCarbs: number | null, status: 'calculated' | 'estimated' | 'not_calculated'): string {
  const guide = mealNetCarbGuide(p, mealType);
  const meal = mealType.toLowerCase();
  const plan = p.endorsed ? p.short : 'your flexible low-carb target';
  if (netCarbs === null || status === 'not_calculated') {
    return `The ingredients follow the ${plan} food rules (${p.dailyNetCarbs}); the carb count was not calculated, so check labels before relying on it.`;
  }
  if (status === 'estimated') {
    return `Roughly ${netCarbs} g net carbs per serving (AI estimate) against a guide of about ${guide} g for a ${meal} on ${plan} (${p.dailyNetCarbs}). Verify with product labels.`;
  }
  return `About ${netCarbs} g net carbs per serving, within the ${guide} g guide for a ${meal} on ${plan} (${p.dailyNetCarbs}).`;
}

/** Prompt text for this plan: what to build on, what to measure, what to leave out. */
export function planPromptLines(p: PlanProfile, mealType: MealType): string[] {
  const guide = mealNetCarbGuide(p, mealType);
  return [
    `Plan: ${p.label}. ${p.summary}`,
    `The ${p.dailyNetCarbs} figure is a DAILY budget shared across every meal and snack, never the allowance for one recipe. Aim for this ${mealType.toLowerCase()} to use at most about ${guide} g net carbs per serving (lower is fine) so the rest of the day still fits.`,
    `Build on: ${p.emphasize.join('; ')}.`,
    ...(p.measured.length ? [`Allowed in measured portions: ${p.measured.join('; ')}.`] : []),
    `Leave out entirely: ${p.avoid.join('; ')}.`,
    ...(p.endorsed ? [] : ['This is a custom low-carb target chosen by the user, not an official Atkins plan; never describe it as Atkins-approved.']),
  ];
}
