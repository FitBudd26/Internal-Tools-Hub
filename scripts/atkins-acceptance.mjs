/**
 * Acceptance test for the Atkins Diet Recipe Generator's Gemini route.
 *
 *   BASE=http://localhost:5173 node scripts/atkins-acceptance.mjs [out-dir]
 *
 * Posts the four scenarios from the build spec to BASE/api/generate-recipes
 * (the dev server with GEMINI_API_KEY in .env, or a deployment) and checks
 * each answer: three distinct recipes, quantities on every ingredient,
 * complete instructions, cooking time inside the limit, nutrition status
 * honest (calculated or a labelled estimate, never missing), net carbs inside
 * the meal guide, the selected proteins used, the cuisine reflected, and no
 * ingredient that the plan, phase or restrictions exclude (no rice, pasta or
 * starchy sides on an Induction dinner; no dairy or nuts on the restricted
 * dinner). Then it compares the scenarios pairwise so the sets differ. Each
 * recipe set is saved as JSON in out-dir so scripts/atkins-pdf-check.mjs can
 * build the real PDFs from them.
 * Exit 0 pass · 1 fail · 2 route not configured (no Gemini key).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = (process.env.BASE ?? 'http://localhost:5173').replace(/\/$/, '');
const outDir = resolve(process.argv[2] ?? '.acceptance-atkins');
mkdirSync(outDir, { recursive: true });

/** Phrases that look like an excluded food but are not, removed before the regexes run. */
const clean = (t) =>
  t
    .toLowerCase()
    .replace(/cauliflower rice|riced cauliflower|shirataki noodles?|konjac noodles?|zucchini noodles?|zoodles|almond flour|coconut flour|coconut milk|coconut cream|almond milk|peanut oil|coconut oil|nutmeg|butternut|green beans?|snap peas|snow peas|bean sprouts?|butter lettuce|cocoa butter|sugar[- ]free|sugar substitute|unsweetened|lettuce wraps?/g, ' ');
const GRAINS = /\b(rice|pasta|spaghetti|bread|toast|tortilla|noodles?|quinoa|oats?|couscous|flour|crackers?|bun)\b/;
const STARCH = /\b(potato(es)?|sweet potato(es)?|corn|carrots?|beets?|parsnips?)\b/;
const LEGUMES = /\b(lentils?|chickpeas?|black beans?|kidney beans?|hummus|edamame|peas|beans)\b/;
const NUTS = /\b(almonds?|walnuts?|pecans?|cashews?|pistachios?|peanuts?|macadamias?|hazelnuts?|pine nuts?|chia|flax(seed)?|sesame seeds?|pumpkin seeds?|sunflower seeds?|tahini|nuts?)\b/;
const FRUIT = /\b(bananas?|apples?|oranges?|mango|pineapple|grapes?|berries|strawberr\w*|blueberr\w*|raspberr\w*|melon)\b/;
const SUGAR = /\b(sugar|honey|maple|syrup|agave)\b/;
const DAIRY = /\b(cheese|cheddar|mozzarella|parmesan|feta|paneer|halloumi|ricotta|yogh?urt|butter|ghee|cream|milk|whey)\b/;

const SCENARIOS = [
  {
    key: 'A-atkins20-phase1-dinner',
    label: 'Test A: Atkins 20 Phase 1 · Dinner · Chicken · Mediterranean · under 30 minutes',
    body: { plan: 'Atkins 20', phase: 'Phase 1 — Induction', mealType: 'Dinner', proteins: ['Chicken'], cuisine: 'Mediterranean', cookingTime: 'Under 30 Minutes', restrictions: [] },
    guide: 10,
    limit: 30,
    planLabel: /Phase 1/,
    protein: /\bchicken\b/,
    cuisine: /olive|lemon|oregano|feta|garlic|tomato|zucchini|cucumber|herb|basil|eggplant|greek|mediterranean/,
    forbid: [['grain', GRAINS], ['starchy side', STARCH], ['legume', LEGUMES], ['nuts (Phase 1)', NUTS], ['fruit (Phase 1)', FRUIT], ['sugar', SUGAR]],
  },
  {
    key: 'B-atkins20-phase2-breakfast',
    label: 'Test B: Atkins 20 Phase 2 · Breakfast · Eggs and Dairy · American · under 15 minutes',
    body: { plan: 'Atkins 20', phase: 'Phase 2 — Ongoing Weight Loss', mealType: 'Breakfast', proteins: ['Eggs', 'Dairy'], cuisine: 'American', cookingTime: 'Under 15 Minutes', restrictions: [] },
    guide: 18,
    limit: 15,
    planLabel: /Phase 2/,
    protein: /\b(eggs?|cheese|cheddar|yogh?urt|cream|cottage|ricotta|mozzarella)\b/,
    cuisine: null,
    forbid: [['grain', GRAINS], ['starchy side', STARCH], ['higher-carb fruit', /\b(bananas?|apples?|oranges?|mango|pineapple|grapes?)\b/], ['sugar', SUGAR]],
  },
  {
    key: 'C-atkins40-lunch-seafood',
    label: 'Test C: Atkins 40 · Lunch · Fish and Seafood · Asian · under 30 minutes',
    body: { plan: 'Atkins 40', mealType: 'Lunch', proteins: ['Fish', 'Seafood'], cuisine: 'Asian', cookingTime: 'Under 30 Minutes', restrictions: [] },
    guide: 20,
    limit: 30,
    planLabel: /^Atkins 40$/,
    protein: /\b(salmon|cod|tuna|shrimp|prawns?|fish|scallops?|squid|crab|tilapia|mackerel|sea bass|halibut|trout|seafood|mussels?|clams?)\b/,
    cuisine: /sesame|ginger|tamari|soy|coconut aminos|bok choy|scallion|spring onion|chili|chilli|lime|cilantro|coriander|shirataki|curry|miso|nori|lemongrass|sriracha|stir|wok|thai|asian/,
    forbid: [['refined grain', /\b(white rice|bread|toast|pasta|spaghetti|tortilla|flour|crackers?)\b/], ['sugar', SUGAR]],
  },
  {
    key: 'D-atkins20-phase1-dairy-nut-free',
    label: 'Test D: Atkins 20 Phase 1 · Dinner · Dairy-Free + Nut-Free',
    body: { plan: 'Atkins 20', phase: 'Phase 1 — Induction', mealType: 'Dinner', proteins: [], cuisine: 'Any Cuisine', cookingTime: 'No Preference', restrictions: ['Dairy-Free', 'Nut-Free'] },
    guide: 10,
    limit: 90,
    planLabel: /Phase 1/,
    protein: null,
    cuisine: null,
    forbid: [['dairy', DAIRY], ['nuts', NUTS], ['grain', GRAINS], ['starchy side', STARCH], ['legume', LEGUMES], ['sugar', SUGAR]],
  },
];

const ingredientNames = (r) => r.ingredients.map((i) => `${i.name} ${i.note ?? ''}`).join(' | ');
const jaccard = (a, b) => {
  const inter = [...a].filter((w) => b.has(w)).length;
  return inter / Math.max(1, new Set([...a, ...b]).size);
};
const foodWords = (set) => new Set(set.recipes.flatMap((r) => r.ingredients.map((i) => i.name.toLowerCase().trim())));

let failures = 0;
const results = [];
for (const s of SCENARIOS) {
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${BASE}/api/generate-recipes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s.body) });
  } catch (err) {
    console.error(`${s.key}: request failed (${err.message}). Is the dev server running at ${BASE}?`);
    process.exit(1);
  }
  const ms = Date.now() - t0;
  const data = await res.json().catch(() => ({}));
  if (res.status === 503) {
    console.error('Route not configured: set GEMINI_API_KEY (in .env for npm run dev, or on Vercel).');
    process.exit(2);
  }
  if (!res.ok) {
    failures += 1;
    console.error(`FAIL ${s.key}: HTTP ${res.status} ${JSON.stringify(data)} after ${ms} ms`);
    continue;
  }
  const set = data.set;
  const problems = [];
  const warnings = [];
  if (!set || !Array.isArray(set.recipes) || set.recipes.length !== 3) {
    failures += 1;
    console.error(`FAIL ${s.key}: expected 3 recipes, got ${set?.recipes?.length ?? 'none'}`);
    continue;
  }
  const names = set.recipes.map((r) => r.name.toLowerCase());
  if (new Set(names).size !== 3) problems.push('duplicate recipe names');
  for (const r of set.recipes) {
    const tag = `"${r.name.slice(0, 40)}"`;
    const ings = ingredientNames(r);
    const cleaned = clean(ings);
    if (r.ingredients.length < 3 || r.ingredients.some((i) => typeof i.quantity !== 'number' || !i.unit)) problems.push(`${tag}: ingredient without quantity or unit`);
    if (r.instructions.length < 3) problems.push(`${tag}: only ${r.instructions.length} instructions`);
    if (r.totalTime > s.limit) problems.push(`${tag}: ${r.totalTime} min over the ${s.limit} min limit`);
    if (r.nutrition.status === 'not_calculated') problems.push(`${tag}: nutrition not calculated`);
    if (r.nutrition.status === 'estimated') warnings.push(`${tag}: nutrition is a labelled AI estimate (coverage ${Math.round(r.nutrition.coverage * 100)}%)`);
    if (r.nutrition.netCarbs !== null && r.nutrition.netCarbs > s.guide * 1.15 + 1) problems.push(`${tag}: ${r.nutrition.netCarbs} g net carbs over the ${s.guide} g meal guide`);
    if (!s.planLabel.test(r.atkinsCompatibility.planLabel)) problems.push(`${tag}: plan label "${r.atkinsCompatibility.planLabel}"`);
    if (!r.atkinsCompatibility.suitability) problems.push(`${tag}: no suitability line`);
    if (!r.description || !r.servingBasis) problems.push(`${tag}: missing description or serving basis`);
    if (s.protein && !s.protein.test(ings.toLowerCase())) problems.push(`${tag}: selected protein not used`);
    if (s.cuisine && !s.cuisine.test(`${r.name} ${ings} ${r.instructions.join(' ')}`.toLowerCase())) problems.push(`${tag}: cuisine not reflected`);
    for (const [label, re] of s.forbid) if (re.test(cleaned)) problems.push(`${tag}: contains ${label} (${cleaned.match(re)[0]})`);
    if (/[–—]/.test(`${r.name} ${r.description} ${r.instructions.join(' ')}`)) problems.push(`${tag}: dash in text`);
  }
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const a = new Set(set.recipes[i].ingredients.map((x) => x.name.toLowerCase()));
      const b = new Set(set.recipes[j].ingredients.map((x) => x.name.toLowerCase()));
      if (jaccard(a, b) > 0.8) problems.push(`recipes ${i + 1} and ${j + 1} share almost the same ingredients`);
    }
  }
  writeFileSync(join(outDir, `${s.key}.json`), JSON.stringify(data, null, 2));
  results.push({ ...s, set });
  console.log(`\n== ${s.label} (${ms} ms, model ${data.model}, attempt ${data.attempt})`);
  for (const r of set.recipes) {
    const n = r.nutrition;
    console.log(`   - ${r.name} · ${r.totalTime} min · ${n.status === 'not_calculated' ? 'nutrition n/a' : `${n.status === 'estimated' ? '≈' : ''}${n.netCarbs} g net carbs, ${n.calories} kcal, ${n.protein} g protein`} · ${r.atkinsCompatibility.reviewStatus}`);
    console.log(`     ${r.ingredients.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join('; ')}`);
  }
  if (set.notes.length) console.log(`   notes: ${set.notes.join(' ')}`);
  for (const w of warnings) console.log(`   note: ${w}`);
  if (problems.length) {
    failures += 1;
    console.error(`   FAIL: ${problems.join('; ')}`);
  } else {
    console.log('   PASS');
  }
}

if (results.length > 1) {
  console.log('\n== Pairwise difference (Jaccard of ingredient vocabulary)');
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i], b = results[j];
      const sim = jaccard(foodWords(a.set), foodWords(b.set));
      const sharedNames = a.set.recipes.filter((r) => b.set.recipes.some((t) => t.name.toLowerCase() === r.name.toLowerCase())).length;
      const verdict = sim > 0.5 || sharedNames > 0 ? 'TOO SIMILAR' : 'ok';
      if (verdict !== 'ok') failures += 1;
      console.log(`   ${a.key} vs ${b.key}: ingredient overlap ${(sim * 100).toFixed(0)}%, ${sharedNames} shared recipe name(s) → ${verdict}`);
    }
  }
}
console.log(failures ? `\n${failures} check(s) failed` : `\nAll scenarios passed. Recipe sets saved in ${outDir}; build their PDFs with: node scripts/atkins-pdf-check.mjs .pdf-check-atkins ${outDir}/*.json`);
process.exit(failures ? 1 : 0);
