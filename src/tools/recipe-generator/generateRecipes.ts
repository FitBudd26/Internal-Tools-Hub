import type {
  ClientGoal,
  CookingTime,
  Diet,
  MealType,
  Nutrition,
  Protein,
  Recipe,
  RecipeInput,
  RecipeSet,
} from './types';
import { calorieTargetDetails, perMealTarget, targetNote } from './calorieTarget';
import { estimateNutrition, normalizeQuantities, proteinFloorProblem } from './nutrition';

/**
 * Deterministic, client-side recipe engine: a curated library of practical,
 * coach-friendly recipes filtered by protein, dietary needs, meal type and
 * cooking time, ranked by how well each fits the client goal. Same inputs
 * always produce the same set; `variant` (Regenerate) rotates through the
 * next-best candidates. Nutrition is approximate guidance, never a
 * prescription.
 */

type Tag =
  | 'vegetarian'
  | 'vegan'
  | 'glutenFree'
  | 'dairyFree'
  | 'lowCarb'
  | 'keto'
  | 'mediterranean'
  | 'highProtein';

interface Template {
  name: string;
  proteins: Protein[];
  meals: MealType[];
  time: number;
  tags: Tag[];
  goals: ClientGoal[];
  description: string;
  ingredients: string[];
  steps: string[];
  /** Per serving. Computed from the ingredient list where the estimator recognises it. */
  nutrition: Nutrition;
  note: string;
  /** Batch recipes list ingredients for this many servings. */
  servings: number;
  /** nutrition was calculated from the ingredient list */
  computed: boolean;
}

/** Batch recipes whose ingredient lines cover several portions. */
const SERVINGS: Record<string, number> = {
  'Veggie Egg Muffins': 4,
  'Beef and Bean Chili (Meal Prep)': 4,
  'Red Lentil Dal': 4,
  'White Bean and Kale Soup': 4,
};

const T = (
  name: string,
  proteins: Protein[],
  meals: MealType[],
  time: number,
  tags: Tag[],
  goals: ClientGoal[],
  nutrition: [number, number, number, number],
  description: string,
  ingredients: string[],
  steps: string[],
  note: string,
): Template => {
  const servings = SERVINGS[name] ?? 1;
  ingredients = ingredients.map(normalizeQuantities); // exact ounce / cup figures, never drifting cup guesses
  const est = estimateNutrition(ingredients);
  // Honest macros: the ingredient estimate wins over the hand-written figure whenever the list is recognised.
  const computed: Nutrition = est.coverage >= 0.7
    ? {
        calories: Math.round(est.nutrition.calories / servings / 5) * 5,
        proteinG: Math.round(est.nutrition.proteinG / servings),
        carbsG: Math.round(est.nutrition.carbsG / servings),
        fatG: Math.round(est.nutrition.fatG / servings),
      }
    : { calories: nutrition[0], proteinG: nutrition[1], carbsG: nutrition[2], fatG: nutrition[3] };
  return { name, proteins, meals, time, tags, goals, description, ingredients, steps, nutrition: computed, note, servings, computed: est.coverage >= 0.7 };
};

const LIBRARY: Template[] = [
  T('Lemon Herb Chicken and Rice Bowl', ['Chicken'], ['Lunch', 'Dinner', 'Meal Prep'], 25, ['glutenFree', 'dairyFree', 'highProtein'], ['Muscle Building', 'Performance', 'Maintenance'], [520, 42, 55, 12],
    'Lean chicken over rice with a bright lemon and herb dressing. Reheats well, so it doubles as a prep staple.',
    ['150 g (5 oz) raw chicken breast', '185 g (1 cup) cooked rice', '90 g (1 cup) broccoli florets', '15 ml (1 tbsp) olive oil', 'Juice of half a lemon', '1 tsp dried oregano', 'Salt and pepper'],
    ['Season the chicken with oregano, salt and pepper; pan-sear 5 to 6 minutes per side until cooked through.', 'Steam or microwave the broccoli until just tender.', 'Slice the chicken, plate over the rice with the broccoli.', 'Whisk olive oil and lemon juice, drizzle over the bowl.'],
    'A dependable template: swap the grain or vegetable weekly to keep clients engaged without changing the macros much.'),
  T('10-Minute Chicken Lettuce Wraps', ['Chicken'], ['Lunch', 'Dinner', 'Snack'], 10, ['glutenFree', 'dairyFree', 'lowCarb', 'highProtein'], ['Fat Loss', 'Low Carb'], [320, 35, 10, 14],
    'Shredded chicken, crunchy vegetables and a light sesame dressing in lettuce cups. Fast, fresh and filling.',
    ['150 g (5 oz) cooked shredded chicken', '4 large lettuce leaves', '½ carrot, grated', '½ cucumber, diced', '5 ml (1 tsp) sesame oil', '15 ml (1 tbsp) tamari', 'Lime wedge'],
    ['Mix the chicken with sesame oil and tamari.', 'Spoon into the lettuce leaves with carrot and cucumber.', 'Finish with a squeeze of lime.'],
    'Great for clients who say they have no time to cook: pre-cooked chicken makes this a two-minute assembly.'),
  T('Sheet-Pan Chicken, Sweet Potato and Broccoli', ['Chicken'], ['Dinner', 'Meal Prep'], 30, ['glutenFree', 'dairyFree', 'highProtein'], ['Fat Loss', 'Healthy Eating', 'Balanced Lifestyle'], [480, 40, 42, 14],
    'One tray, one clean-up: roasted chicken thighs or breast with sweet potato and broccoli.',
    ['150 g (5 oz) raw chicken breast', '1 medium sweet potato, cubed', '90 g (1 cup) broccoli florets', '10 ml (2 tsp) olive oil', '1 tsp smoked paprika', '1 tsp garlic powder', 'Salt and pepper'],
    ['Heat the oven to 220 C (425 F).', 'Toss everything with oil and spices on a lined tray.', 'Roast 22 to 25 minutes, turning once, until the chicken is cooked and the potato is tender.'],
    'Scale this up on a Sunday for three or four lunches; it holds well for four days in the fridge.'),
  T('Mediterranean Chicken Salad', ['Chicken'], ['Lunch'], 15, ['glutenFree', 'mediterranean', 'highProtein', 'lowCarb'], ['Fat Loss', 'Healthy Eating', 'Low Carb'], [380, 36, 14, 20],
    'Grilled chicken over greens with cucumber, tomato, olives and a little feta in a lemon and olive oil dressing.',
    ['150 g (5 oz) grilled chicken breast', '80 g (2 cups) mixed greens', '½ cucumber, sliced', '8 cherry tomatoes', '6 olives', '20 g (0.7 oz) feta', '15 ml (1 tbsp) olive oil', 'Lemon juice'],
    ['Slice the chicken.', 'Toss the greens, cucumber, tomatoes and olives with oil and lemon.', 'Top with chicken and crumbled feta.'],
    'A good default lunch for clients eating out often: the same build is easy to order at most cafes.'),
  T('Yogurt Ranch Chicken Wraps', ['Chicken', 'Dairy'], ['Lunch', 'Snack'], 10, ['highProtein'], ['Fat Loss', 'Balanced Lifestyle'], [400, 38, 30, 12],
    'Shredded chicken in a Greek yogurt ranch with crunchy vegetables, rolled in a whole-grain wrap.',
    ['120 g (4 oz) cooked shredded chicken', '30 g (2 tbsp) Greek yogurt', '1 tsp ranch seasoning', '1 whole-grain wrap', '30 g (a handful) shredded lettuce', '¼ red pepper, sliced'],
    ['Mix the chicken with yogurt and seasoning.', 'Layer onto the wrap with lettuce and pepper.', 'Roll tightly and slice in half.'],
    'Yogurt replaces mayo here: same satisfaction, more protein. Point that swap out to clients as a habit they can reuse.'),
  T('Chicken Caesar Meal-Prep Jars', ['Chicken', 'Dairy'], ['Meal Prep', 'Lunch'], 20, ['glutenFree', 'highProtein', 'lowCarb'], ['Fat Loss', 'High Protein'], [380, 38, 12, 20],
    'Layered jars that stay crisp for days: dressing at the bottom, chicken in the middle, romaine on top.',
    ['150 g (5 oz) grilled chicken, sliced', '95 g (2 cups) chopped romaine', '30 g (2 tbsp) light yogurt dressing', '15 g (0.5 oz) parmesan, shaved', '8 cherry tomatoes'],
    ['Spoon the dressing into the jar first.', 'Add tomatoes, then chicken, then parmesan.', 'Pack the romaine on top and seal; shake into a bowl when eating.'],
    'Show clients the layering order once and they can repeat it with any protein and salad base.'),
  T('Turkey and Veggie Skillet', ['Turkey'], ['Dinner', 'Meal Prep', 'Lunch'], 20, ['glutenFree', 'dairyFree', 'lowCarb', 'highProtein'], ['Fat Loss', 'High Protein'], [380, 38, 14, 18],
    'Lean ground turkey with peppers, courgette and spinach in one pan. Big volume, moderate calories.',
    ['150 g (5 oz) raw lean ground turkey', '1 red pepper, diced', '1 small courgette, diced', '60 g (2 handfuls) spinach', '5 ml (1 tsp) olive oil', '1 tsp cumin', '1 tsp chili flakes', 'Salt and pepper'],
    ['Brown the turkey in oil with the spices, breaking it up.', 'Add pepper and courgette; cook 6 to 8 minutes.', 'Stir in the spinach until wilted and season.'],
    'Volume eating made simple: clients in a deficit stay full without tracking every gram.'),
  T('Egg and Turkey Breakfast Skillet', ['Eggs', 'Turkey'], ['Breakfast', 'Post-Workout'], 15, ['glutenFree', 'dairyFree', 'lowCarb', 'keto', 'highProtein'], ['Low Carb', 'Fat Loss', 'High Protein'], [360, 34, 8, 22],
    'Turkey mince, peppers and two eggs cooked in the same pan. A savoury, protein-first start to the day.',
    ['100 g (3.5 oz) raw lean ground turkey', '2 eggs', '½ red pepper, diced', '30 g (a handful) spinach', '5 ml (1 tsp) olive oil', 'Smoked paprika, salt and pepper'],
    ['Brown the turkey with paprika; add the pepper for 3 minutes.', 'Stir in the spinach, then make two wells and crack in the eggs.', 'Cover and cook 3 to 4 minutes until the whites set.'],
    'For clients who skip breakfast and overeat later, a savoury protein breakfast is often the fix.'),
  T('Turkey Egg-White Breakfast Wrap', ['Turkey', 'Eggs'], ['Breakfast', 'Pre-Workout'], 10, ['highProtein'], ['Muscle Building', 'Performance'], [390, 34, 36, 10],
    'Turkey slices and fluffy egg whites in a whole-grain wrap with salsa. Light enough before training.',
    ['4 egg whites', '60 g (2 oz) sliced turkey breast', '1 whole-grain wrap', '2 tbsp salsa', '30 g (a handful) spinach'],
    ['Scramble the egg whites in a non-stick pan.', 'Warm the wrap, layer turkey, eggs, spinach and salsa.', 'Roll and serve.'],
    'Sits well 60 to 90 minutes before a session: protein plus easy carbs, low fat.'),
  T('Lean Beef and Quinoa Power Bowl', ['Beef'], ['Lunch', 'Dinner', 'Post-Workout', 'Meal Prep'], 25, ['glutenFree', 'dairyFree', 'highProtein'], ['Muscle Building', 'Performance'], [560, 40, 50, 18],
    'Seared lean beef strips over quinoa with roasted vegetables. A complete training-day plate.',
    ['150 g (5 oz) raw lean beef strips', '185 g (1 cup) cooked quinoa', '120 g (1 cup) roasted mixed vegetables', '5 ml (1 tsp) olive oil', '1 tsp garlic powder', 'Salt and pepper', '20 g (a handful) rocket'],
    ['Season and sear the beef 2 to 3 minutes per side; rest.', 'Warm the quinoa and vegetables.', 'Slice the beef, build the bowl and top with rocket.'],
    'Ideal post-training meal for clients chasing strength or size; the quinoa adds a little extra protein.'),
  T('Steak and Roasted Vegetable Plate', ['Beef'], ['Dinner'], 25, ['glutenFree', 'dairyFree', 'lowCarb', 'keto', 'highProtein'], ['Low Carb', 'Maintenance'], [450, 38, 12, 26],
    'A simple sirloin with roasted peppers, courgette and mushrooms. Satisfying without the starch.',
    ['150 g (5 oz) raw sirloin steak', '150 g (1 cup) mixed peppers and courgette', '4 mushrooms, halved', '15 ml (1 tbsp) olive oil', 'Rosemary, salt and pepper'],
    ['Roast the vegetables with half the oil at 220 C (425 F) for 15 minutes.', 'Sear the steak 3 to 4 minutes per side; rest 5 minutes.', 'Slice and serve with the vegetables.'],
    'Low-carb clients often miss "proper dinners"; this feels like one and keeps carbs minimal.'),
  T('Beef and Bean Chili (Meal Prep)', ['Beef', 'Beans'], ['Meal Prep', 'Dinner'], 30, ['glutenFree', 'dairyFree', 'highProtein'], ['Muscle Building', 'Balanced Lifestyle', 'Maintenance'], [520, 40, 40, 20],
    'Lean beef and kidney beans in a smoky tomato base. Makes four portions that freeze well.',
    ['500 g (1.1 lb) raw lean ground beef', '240 g (1 can, drained) kidney beans', '400 g (1 can) chopped tomatoes', '1 onion, diced', '1 tbsp chili powder', '1 tsp cumin', '5 ml (1 tsp) olive oil'],
    ['Soften the onion in oil, add the beef and brown.', 'Stir in spices, tomatoes and beans; simmer 20 minutes.', 'Portion into four containers.'],
    'A batch-cook anchor: pair it with rice on training days and salad on rest days.'),
  T('Keto Beef and Cheese Stuffed Peppers', ['Beef', 'Dairy'], ['Dinner', 'Meal Prep'], 30, ['glutenFree', 'lowCarb', 'keto', 'highProtein'], ['Low Carb', 'High Protein'], [480, 36, 12, 32],
    'Peppers stuffed with seasoned beef and melted cheese. Rich, low in carbs and easy to reheat.',
    ['150 g (5 oz) raw lean ground beef', '1 large bell pepper, halved', '40 g (1.5 oz) grated cheddar', '½ onion, diced', '1 tsp Italian seasoning', 'Salt and pepper'],
    ['Brown the beef with onion and seasoning.', 'Fill the pepper halves, top with cheese.', 'Bake at 200 C (400 F) for 18 to 20 minutes.'],
    'Keep an eye on total fat for fat-loss clients; halve the cheese if calories need to come down.'),
  T('Garlic Salmon with Greens', ['Fish'], ['Dinner', 'Lunch'], 20, ['glutenFree', 'dairyFree', 'lowCarb', 'keto', 'mediterranean', 'highProtein'], ['Fat Loss', 'Healthy Eating', 'Low Carb'], [430, 34, 8, 28],
    'Pan-seared salmon with garlic sauteed spinach and green beans. Omega-3s and protein in one plate.',
    ['150 g (5 oz) raw salmon fillet', '60 g (2 handfuls) spinach', '100 g (1 cup) green beans', '1 clove garlic, sliced', '15 ml (1 tbsp) olive oil', 'Lemon, salt and pepper'],
    ['Sear the salmon skin-side down 4 minutes, flip for 3 more.', 'Saute garlic in oil, add beans then spinach until wilted.', 'Plate with lemon.'],
    'Twice-a-week oily fish is an easy, evidence-friendly habit to give clients.'),
  T('Tuna and White Bean Salad', ['Fish', 'Beans'], ['Lunch', 'Snack', 'Meal Prep'], 10, ['glutenFree', 'dairyFree', 'mediterranean', 'highProtein'], ['Fat Loss', 'Healthy Eating', 'Balanced Lifestyle'], [360, 32, 30, 10],
    'Tinned tuna, cannellini beans, red onion and parsley with lemon and olive oil. No cooking needed.',
    ['1 tin (120 g drained) tuna in water', '120 g (½ can, drained) cannellini beans, rinsed', '¼ red onion, finely sliced', 'Handful of parsley', '15 ml (1 tbsp) olive oil', 'Lemon juice, salt and pepper'],
    ['Combine tuna, beans, onion and parsley.', 'Dress with oil and lemon; season.', 'Serve on its own or over greens.'],
    'Cupboard-only ingredients make this the fallback meal for clients who forgot to shop.'),
  T('Baked Cod with Herbed Potatoes', ['Fish'], ['Dinner'], 30, ['glutenFree', 'dairyFree', 'mediterranean'], ['Performance', 'Maintenance', 'Healthy Eating'], [420, 34, 40, 10],
    'Flaky white fish over baby potatoes with herbs and lemon. Light, high in protein and easy to digest.',
    ['150 g (5 oz) raw cod fillet', '200 g (7 oz) baby potatoes, halved', '15 ml (1 tbsp) olive oil', '1 tsp dried thyme', 'Lemon, salt and pepper', 'Side of steamed greens'],
    ['Roast the potatoes with oil and thyme at 210 C (410 F) for 20 minutes.', 'Add the cod to the tray, season, bake 10 more minutes.', 'Serve with lemon and greens.'],
    'A good evening meal before a morning session: carbs without heaviness.'),
  T('Salmon Poke-Style Bowl', ['Fish'], ['Lunch', 'Dinner', 'Post-Workout'], 15, ['dairyFree', 'glutenFree', 'mediterranean', 'highProtein'], ['Performance', 'Muscle Building'], [520, 34, 56, 16],
    'Cooked or sushi-grade salmon over rice with edamame, cucumber and avocado in a tamari dressing.',
    ['120 g (4 oz) cooked salmon, flaked', '185 g (1 cup) cooked rice', '80 g (½ cup) edamame', '½ cucumber, diced', '¼ avocado', '15 ml (1 tbsp) tamari', 'Sesame seeds'],
    ['Build the bowl over warm or cold rice.', 'Drizzle with tamari and scatter sesame seeds.'],
    'Assembly meals like this suit clients who cook once and eat twice: prep the rice and salmon ahead.'),
  T('Garlic Shrimp Zoodles', ['Seafood'], ['Dinner', 'Lunch'], 15, ['glutenFree', 'dairyFree', 'lowCarb', 'keto', 'mediterranean', 'highProtein'], ['Low Carb', 'Fat Loss'], [300, 30, 10, 14],
    'Quick garlic shrimp tossed with courgette noodles, chili and lemon. Light and very fast.',
    ['150 g (5 oz) raw shrimp, peeled', '2 courgettes, spiralised', '2 cloves garlic, sliced', '15 ml (1 tbsp) olive oil', 'Chili flakes', 'Lemon, parsley, salt'],
    ['Saute garlic and chili in oil 30 seconds; add shrimp 2 to 3 minutes until pink.', 'Toss in the zoodles for 1 to 2 minutes.', 'Finish with lemon and parsley.'],
    'A low-calorie dinner that still feels indulgent; useful in the last stretch of a fat-loss phase.'),
  T('Shrimp and Brown Rice Stir-Fry', ['Seafood'], ['Dinner', 'Post-Workout', 'Meal Prep'], 20, ['dairyFree', 'glutenFree', 'highProtein'], ['Muscle Building', 'Performance'], [470, 32, 58, 10],
    'Shrimp, mixed vegetables and brown rice with ginger, garlic and tamari. A balanced recovery plate.',
    ['150 g (5 oz) raw shrimp', '195 g (1 cup) cooked brown rice', '165 g (1½ cups) stir-fry vegetables', '15 ml (1 tbsp) tamari', '1 tsp grated ginger', '1 clove garlic', '5 ml (1 tsp) sesame oil'],
    ['Stir-fry the vegetables in sesame oil 3 minutes.', 'Add shrimp, ginger and garlic; cook 3 minutes.', 'Add rice and tamari; toss until hot.'],
    'Carbs plus lean protein within a couple of hours of training supports recovery without fuss.'),
  T('Veggie Egg Muffins', ['Eggs'], ['Breakfast', 'Snack', 'Meal Prep'], 25, ['vegetarian', 'glutenFree', 'lowCarb', 'keto'], ['Fat Loss', 'High Protein', 'Healthy Eating'], [240, 20, 6, 15],
    'Baked egg cups with spinach, pepper and a little cheese. Make a dozen, grab three on the go.',
    ['6 eggs', '30 g (1 cup) spinach, chopped', '½ red pepper, diced', '30 g (1 oz) feta', 'Salt, pepper, chives'],
    ['Whisk eggs with seasoning; stir in vegetables and cheese.', 'Pour into a greased muffin tin.', 'Bake at 180 C (350 F) for 18 to 20 minutes.'],
    'The classic fix for "I do not have time for breakfast": three muffins is a serving.'),
  T('Spinach and Feta Omelette', ['Eggs', 'Dairy'], ['Breakfast'], 10, ['vegetarian', 'glutenFree', 'lowCarb', 'keto', 'mediterranean'], ['Low Carb', 'Maintenance'], [340, 26, 6, 24],
    'A three-egg omelette folded around wilted spinach and feta. Simple and satisfying.',
    ['3 eggs', '60 g (2 handfuls) spinach', '25 g (1 oz) feta', '5 ml (1 tsp) olive oil', 'Salt and pepper'],
    ['Wilt the spinach in the pan, set aside.', 'Cook the beaten eggs on medium until almost set.', 'Add spinach and feta, fold and serve.'],
    'Suits low-carb and keto clients; add a slice of toast for anyone training that morning.'),
  T('Eggs on Toast with Avocado', ['Eggs'], ['Breakfast', 'Pre-Workout'], 10, ['vegetarian', 'dairyFree'], ['Balanced Lifestyle', 'Healthy Eating', 'Performance'], [420, 20, 36, 22],
    'Two eggs on whole-grain toast with smashed avocado, chili and lemon. Balanced and quick.',
    ['2 eggs', '2 slices whole-grain bread', '½ avocado', 'Chili flakes, lemon, salt'],
    ['Toast the bread and smash the avocado onto it with lemon and salt.', 'Fry or poach the eggs and place on top.', 'Finish with chili flakes.'],
    'A sensible pre-session breakfast eaten 90 minutes out; drop to one slice for lighter appetites.'),
  T('Greek Yogurt Protein Parfait', ['Dairy'], ['Breakfast', 'Snack', 'Post-Workout'], 5, ['vegetarian', 'highProtein'], ['Muscle Building', 'High Protein', 'Fat Loss'], [320, 28, 34, 8],
    'Thick Greek yogurt layered with berries and a little granola. Ready in the time it takes to open the fridge.',
    ['250 g (1 cup) 0% Greek yogurt', '150 g (1 cup) mixed berries', '25 g (2 tbsp) granola', '1 tsp honey'],
    ['Layer yogurt, berries and granola in a glass or tub.', 'Drizzle with honey if using.'],
    'Show clients the protein per pot on the yogurt label; brands vary a lot.'),
  T('Cottage Cheese Power Bowl', ['Dairy'], ['Snack', 'Breakfast', 'Pre-Workout'], 5, ['vegetarian', 'glutenFree', 'highProtein'], ['Fat Loss', 'High Protein'], [260, 26, 18, 8],
    'Cottage cheese with pineapple or tomato and cucumber. Sweet or savoury, both under five minutes.',
    ['200 g (7 oz) cottage cheese', '80 g (½ cup) pineapple chunks', 'Black pepper or cinnamon', '1 tbsp pumpkin seeds'],
    ['Spoon the cottage cheese into a bowl.', 'Top with fruit or vegetables and seeds; season.'],
    'A high-protein snack that beats a protein bar on cost and ingredients.'),
  T('Crispy Tofu Rice Bowl', ['Tofu'], ['Lunch', 'Dinner', 'Meal Prep'], 25, ['vegan', 'vegetarian', 'dairyFree', 'glutenFree'], ['Muscle Building', 'Balanced Lifestyle', 'Healthy Eating'], [480, 26, 56, 16],
    'Cornflour-crisped tofu over rice with steamed greens and a tamari-lime sauce.',
    ['200 g (7 oz) firm tofu, pressed and cubed', '1 tbsp cornflour', '185 g (1 cup) cooked rice', '90 g (1 cup) steamed broccoli', '15 ml (1 tbsp) tamari', 'Lime juice', '5 ml (1 tsp) oil'],
    ['Toss the tofu in cornflour; pan-fry in oil until golden on all sides.', 'Mix tamari and lime for the sauce.', 'Build the bowl and drizzle.'],
    'Pressing tofu is the step people skip; mention it and the texture problem disappears.'),
  T('Tofu Veggie Scramble', ['Tofu'], ['Breakfast'], 15, ['vegan', 'vegetarian', 'dairyFree', 'glutenFree', 'lowCarb'], ['Fat Loss', 'Healthy Eating', 'Low Carb'], [300, 22, 12, 18],
    'Crumbled tofu with turmeric, peppers and spinach. A plant-based scramble that holds up to eggs.',
    ['200 g (7 oz) firm tofu, crumbled', '½ pepper, diced', '60 g (2 handfuls) spinach', '½ tsp turmeric', '5 ml (1 tsp) olive oil', 'Nutritional yeast, salt, pepper'],
    ['Saute the pepper in oil 3 minutes.', 'Add tofu and turmeric; cook 5 minutes.', 'Stir in spinach and nutritional yeast until wilted.'],
    'A solid vegan breakfast option when a client asks how to hit protein without eggs.'),
  T('Tofu Peanut Noodle Bowl', ['Tofu'], ['Dinner', 'Lunch', 'Meal Prep'], 20, ['vegan', 'vegetarian', 'dairyFree'], ['Performance', 'Muscle Building', 'Balanced Lifestyle'], [540, 28, 60, 20],
    'Rice noodles, tofu and crunchy vegetables in a light peanut and lime sauce.',
    ['150 g (5 oz) firm tofu, cubed', '80 g (3 oz) dry rice noodles', '90 g (1 cup) shredded cabbage and carrot', '16 g (1 tbsp) peanut butter', '15 ml (1 tbsp) tamari', 'Lime juice, chili'],
    ['Cook the noodles; pan-fry the tofu until golden.', 'Whisk peanut butter, tamari, lime and a splash of water.', 'Toss everything together.'],
    'Higher-calorie plant meal for active clients; scale the noodles to their training day.'),
  T('Tempeh Stir-Fry', ['Tempeh'], ['Dinner', 'Lunch', 'Meal Prep'], 20, ['vegan', 'vegetarian', 'dairyFree', 'glutenFree', 'highProtein'], ['Muscle Building', 'Performance', 'Healthy Eating'], [450, 30, 34, 22],
    'Sliced tempeh with peppers, broccoli and a ginger-garlic tamari glaze. Chewy, savoury and protein-dense.',
    ['150 g (5 oz) tempeh, sliced', '165 g (1½ cups) stir-fry vegetables', '15 ml (1 tbsp) tamari', '1 tsp maple syrup', '1 tsp grated ginger', '1 clove garlic', '5 ml (1 tsp) oil'],
    ['Pan-fry the tempeh 3 minutes per side.', 'Add vegetables, ginger and garlic; cook 4 minutes.', 'Add tamari and maple; toss to glaze.'],
    'Tempeh gives vegan clients more protein per bite than tofu; useful when totals are hard to reach.'),
  T('Smoky Tempeh Lettuce Cups', ['Tempeh'], ['Lunch', 'Snack'], 15, ['vegan', 'vegetarian', 'dairyFree', 'glutenFree', 'lowCarb'], ['Fat Loss', 'Low Carb'], [310, 24, 14, 18],
    'Crumbled tempeh with smoked paprika and lime in crisp lettuce cups with tomato and avocado.',
    ['150 g (5 oz) tempeh, crumbled', '1 tsp smoked paprika', '5 ml (1 tsp) oil', '4 lettuce leaves', '½ tomato, diced', '¼ avocado', 'Lime'],
    ['Fry the tempeh with paprika until crisp.', 'Fill the lettuce cups; top with tomato and avocado.', 'Squeeze lime over.'],
    'Plant-based and low-carb rarely coexist easily; this is one of the few that works.'),
  T('Red Lentil Dal', ['Lentils'], ['Dinner', 'Meal Prep', 'Lunch'], 30, ['vegan', 'vegetarian', 'dairyFree', 'glutenFree'], ['Healthy Eating', 'Balanced Lifestyle', 'Maintenance'], [420, 22, 60, 8],
    'Red lentils simmered with tomato, garlic and warm spices. Cheap, filling and freezer-friendly.',
    ['300 g (1½ cups) dry red lentils', '400 g (1 can) chopped tomatoes', '1 onion, diced', '2 cloves garlic', '1 tsp each cumin, turmeric, garam masala', '5 ml (1 tsp) oil', 'Spinach to finish'],
    ['Soften onion and garlic in oil; add spices for 30 seconds.', 'Add lentils, tomatoes and 2.5 cups water; simmer 20 minutes.', 'Stir in spinach and season.'],
    'Add a side of yogurt or a boiled egg for clients who need more protein per meal.'),
  T('Lentil and Roasted Veg Salad', ['Lentils'], ['Lunch', 'Meal Prep'], 25, ['vegan', 'vegetarian', 'dairyFree', 'glutenFree', 'mediterranean'], ['Fat Loss', 'Healthy Eating'], [380, 20, 48, 10],
    'Cooked lentils with roasted peppers and courgette, rocket and a mustard vinaigrette.',
    ['200 g (1 cup) cooked green lentils', '120 g (1 cup) roasted peppers and courgette', '40 g (2 handfuls) rocket', '15 ml (1 tbsp) olive oil', '1 tsp Dijon mustard', 'Red wine vinegar'],
    ['Roast the vegetables (or use leftovers).', 'Whisk oil, mustard and vinegar.', 'Toss everything together.'],
    'Fibre-heavy and satisfying, which helps fat-loss clients between meals.'),
  T('Lentil Protein Wraps', ['Lentils'], ['Lunch', 'Snack', 'Meal Prep'], 15, ['vegan', 'vegetarian', 'dairyFree'], ['Healthy Eating', 'Fat Loss'], [350, 18, 50, 8],
    'Spiced lentils, crunchy slaw and hummus in a whole-grain wrap. Portable and plant-based.',
    ['200 g (1 cup) cooked lentils', '1 tsp cumin and paprika', '1 whole-grain wrap', '30 g (2 tbsp) hummus', '40 g (a handful) slaw mix', 'Lemon juice'],
    ['Warm the lentils with the spices and lemon.', 'Spread hummus on the wrap, add lentils and slaw.', 'Roll and halve.'],
    'A good packed lunch for clients who want plant-based days without a big protein drop.'),
  T('Black Bean Breakfast Bowl', ['Beans'], ['Breakfast', 'Lunch', 'Post-Workout'], 15, ['vegan', 'vegetarian', 'dairyFree', 'glutenFree'], ['Performance', 'Balanced Lifestyle'], [450, 20, 62, 12],
    'Warm black beans, rice, salsa and avocado in a bowl. Add a fried egg for extra protein if eggs are on the menu.',
    ['120 g (½ can, drained) black beans, warmed', '90 g (½ cup) cooked rice', '3 tbsp salsa', '¼ avocado', 'Handful of coriander', 'Lime'],
    ['Warm the beans with a pinch of cumin.', 'Layer rice, beans, salsa and avocado.', 'Finish with coriander and lime.'],
    'Carb-forward, so it fits training mornings better than rest days.'),
  T('White Bean and Kale Soup', ['Beans'], ['Dinner', 'Lunch', 'Meal Prep'], 30, ['vegan', 'vegetarian', 'dairyFree', 'glutenFree', 'mediterranean'], ['Healthy Eating', 'Maintenance', 'Fat Loss'], [340, 18, 48, 8],
    'Cannellini beans, kale, garlic and tomato in a light broth. Makes four portions and reheats well.',
    ['480 g (2 cans, drained) cannellini beans', '200 g (1 bunch) kale, chopped', '1 onion, diced', '2 cloves garlic', '400 g (1 can) chopped tomatoes', '1 litre (4 cups) vegetable stock', '15 ml (1 tbsp) olive oil', 'Rosemary'],
    ['Soften onion and garlic in oil with rosemary.', 'Add tomatoes, stock and beans; simmer 15 minutes.', 'Stir in kale for the last 5 minutes.'],
    'Soups help clients feel full on fewer calories; keep a batch in the freezer for busy weeks.'),
  T('Hummus and Veggie Snack Plate', ['Beans'], ['Snack'], 5, ['vegan', 'vegetarian', 'dairyFree', 'glutenFree', 'mediterranean'], ['Fat Loss', 'Healthy Eating'], [220, 9, 24, 10],
    'Hummus with carrot, cucumber and pepper sticks plus a few wholegrain crackers.',
    ['60 g (4 tbsp) hummus', '1 carrot, 1 small cucumber and ½ pepper, cut into sticks', '4 rice crackers'],
    ['Arrange on a plate.', 'That is it.'],
    'A snack that replaces crisps without feeling like punishment; pair with a protein source for bigger appetites.'),
  T('Post-Workout Protein Shake', ['Whey / Protein Powder'], ['Post-Workout', 'Snack', 'Breakfast'], 5, ['vegetarian', 'glutenFree', 'highProtein'], ['Muscle Building', 'High Protein', 'Performance'], [350, 35, 40, 6],
    'Protein powder blended with banana, oats and milk of choice. Recovery in a glass.',
    ['30 g (1 scoop) whey protein', '1 banana', '25 g (3 tbsp) rolled oats', '250 ml (1 cup) semi-skimmed milk', 'Ice', 'Pinch of cinnamon'],
    ['Blend everything until smooth.', 'Drink within an hour of training.'],
    'Use a plant protein and plant milk to make this dairy-free; the macros stay similar.'),
  T('Protein Overnight Oats', ['Whey / Protein Powder', 'Dairy'], ['Breakfast', 'Pre-Workout', 'Meal Prep'], 5, ['vegetarian', 'glutenFree'], ['Muscle Building', 'Performance', 'Balanced Lifestyle'], [420, 32, 52, 9],
    'Oats soaked overnight with protein powder, Greek yogurt and berries. Five minutes of prep the night before.',
    ['40 g (½ cup) rolled oats', '30 g (1 scoop) protein powder', '100 g (3.5 oz) Greek yogurt', '150 ml (⅔ cup) semi-skimmed milk', '75 g (½ cup) berries', '4 g (1 tsp) chia seeds'],
    ['Stir oats, protein, yogurt, milk and chia in a jar.', 'Refrigerate overnight.', 'Top with berries in the morning.'],
    'Prep three jars at once; it removes the breakfast decision for half the week.'),
  T('Protein Pancakes', ['Whey / Protein Powder', 'Eggs'], ['Breakfast', 'Post-Workout'], 15, ['vegetarian', 'glutenFree'], ['Muscle Building', 'High Protein'], [400, 34, 40, 10],
    'Banana, egg, oats and protein powder blended into a batter. Pancakes that fit the plan.',
    ['1 banana', '2 eggs', '40 g (½ cup) rolled oats', '30 g (1 scoop) protein powder', '½ tsp baking powder', 'Berries to serve'],
    ['Blend all batter ingredients.', 'Cook small pancakes 2 minutes per side on medium heat.', 'Serve with berries.'],
    'A weekend recipe that keeps clients on plan when the family is having pancakes.'),
  T('Chocolate Protein Chia Pudding', ['Whey / Protein Powder'], ['Snack', 'Breakfast', 'Meal Prep'], 5, ['vegetarian', 'glutenFree'], ['Fat Loss', 'High Protein'], [280, 26, 22, 10],
    'Chia seeds, chocolate protein and milk set into a pudding overnight. Tastes like dessert.',
    ['35 g (3 tbsp) chia seeds', '30 g (1 scoop) chocolate protein powder', '250 ml (1 cup) semi-skimmed milk', '1 tsp cocoa', 'Raspberries to serve'],
    ['Whisk everything and rest 10 minutes; whisk again.', 'Refrigerate 4 hours or overnight.', 'Top with raspberries.'],
    'Give this to clients who struggle with evening sweet cravings on a deficit.'),
  T('Banana Peanut Butter Rice Cakes', ['No Preference'], ['Pre-Workout', 'Snack'], 5, ['vegan', 'vegetarian', 'dairyFree', 'glutenFree'], ['Performance'], [280, 8, 44, 9],
    'Rice cakes topped with peanut butter and sliced banana. Quick carbs before a session.',
    ['2 rice cakes', '16 g (1 tbsp) peanut butter', '1 banana, sliced', 'Pinch of cinnamon'],
    ['Spread, top, eat.'],
    'A 30-to-45-minute pre-training snack; low fibre and low fat so it sits easily.'),
];

/* ---------------------------------- rules --------------------------------- */

const DIET_TAG: Partial<Record<Diet, Tag>> = {
  Vegetarian: 'vegetarian',
  Vegan: 'vegan',
  'Gluten-Free': 'glutenFree',
  'Dairy-Free': 'dairyFree',
  'Low-Carb': 'lowCarb',
  'High-Protein': 'highProtein',
  Mediterranean: 'mediterranean',
  'Keto-Friendly': 'keto',
};

export const TIME_LIMIT: Record<CookingTime, number> = {
  'Under 10 Minutes': 10,
  'Under 20 Minutes': 20,
  'Under 30 Minutes': 30,
  Flexible: Infinity,
};

const GOAL_NOTE: Record<ClientGoal, string> = {
  'Fat Loss': 'Keep portions as written and let volume from vegetables do the filling.',
  'Muscle Building': 'Add a second carb source on heavy training days if total intake is short.',
  Maintenance: 'A repeatable staple; rotate two or three of these to keep the week easy.',
  Performance: 'Time it around training: carbs closer to the session, fats further away.',
  'Healthy Eating': 'Emphasise the whole-food swaps here rather than the numbers.',
  'High Protein': 'Anchor the plate on the protein and adjust everything else around it.',
  'Low Carb': 'If energy in training drops, add a small carb portion around sessions only.',
  'Balanced Lifestyle': 'Simple enough to cook on a weeknight, which is what makes it stick.',
};

const NEGATIVE_CUES = /\b(no|not|avoid|avoids|dislike|dislikes|hates?|allerg\w*|intoleran\w*|without|can'?t|cannot|free|sensitive)\b/;

/** Whole-word match with an optional plural, so "egg" never matches "veggie" and "bun" never matches "bunch". */
export function containsTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}(?:s|es)?\\b`, 'i').test(text);
}
const IGNORE = new Set(['food', 'foods', 'meal', 'meals', 'client', 'clients', 'please', 'also', 'them', 'they', 'that', 'this', 'with', 'from', 'have', 'like', 'likes', 'eat', 'eats', 'eating', 'much', 'very', 'really', 'prefer', 'prefers', 'anything', 'something']);
const ALIAS: Record<string, string[]> = {
  nut: ['peanut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'nuts', 'nut butter'],
  nuts: ['peanut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'nuts', 'nut butter'],
  shellfish: ['shrimp', 'prawn'],
  dairy: ['milk', 'yogurt', 'cheese', 'feta', 'cheddar', 'parmesan', 'butter', 'whey'],
  lactose: ['milk', 'yogurt', 'cheese', 'feta', 'cheddar', 'parmesan', 'butter', 'whey'],
  gluten: ['bread', 'wrap', 'toast', 'crackers', 'noodles', 'oats'],
  spicy: ['chili', 'chilli'],
  pork: ['bacon', 'ham', 'pork'],
};

/** Ingredient words a client dislikes or cannot have, parsed from the notes. */
export function dislikedTerms(notes: string): string[] {
  const out = new Set<string>();
  for (const clause of notes.toLowerCase().split(/[,;.\n]|\band\b|\bbut\b/)) {
    if (!NEGATIVE_CUES.test(clause)) continue;
    for (const word of clause.replace(/[^a-z\s]/g, ' ').split(/\s+/)) {
      if (word.length < 4 || IGNORE.has(word) || NEGATIVE_CUES.test(word)) continue;
      for (const term of ALIAS[word] ?? [word.replace(/s$/, '')]) out.add(term);
    }
  }
  return [...out];
}

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function goalAlignment(goal: ClientGoal, n: Nutrition): string {
  switch (goal) {
    case 'Fat Loss':
      return `About ${n.calories} kcal with ${n.proteinG} g protein: filling at a moderate calorie level.`;
    case 'Muscle Building':
      return `${n.proteinG} g protein with ${n.carbsG} g carbs to support training and recovery.`;
    case 'Maintenance':
      return `Balanced at about ${n.calories} kcal: steady energy without excess.`;
    case 'Performance':
      return `${n.carbsG} g carbs and ${n.proteinG} g protein: fuel that can be timed around sessions.`;
    case 'Healthy Eating':
      return 'Whole foods, vegetables and lean protein with minimal processing.';
    case 'High Protein':
      return `${n.proteinG} g protein per serving keeps the plate protein-first.`;
    case 'Low Carb':
      return `Only ${n.carbsG} g carbs, with protein and fats carrying the meal.`;
    case 'Balanced Lifestyle':
      return `Simple and repeatable at about ${n.calories} kcal with ${n.proteinG} g protein.`;
  }
}

/** Goal fit; calorie thresholds follow the per-meal target when a client profile gives one. */
function goalScore(goal: ClientGoal, t: Template, target: number | null): number {
  const n = t.nutrition;
  let s = t.goals.includes(goal) ? 3 : 0;
  const cap = target ? target * 1.05 : 450;
  const high = target ? target * 1.25 : 520;
  switch (goal) {
    case 'Fat Loss': s += n.calories <= cap && n.proteinG >= 24 ? 2 : n.calories > high ? -2 : 0; break;
    case 'Muscle Building': s += n.proteinG >= 30 && n.carbsG >= 30 ? 2 : 0; break;
    case 'High Protein': s += n.proteinG >= 30 ? 3 : n.proteinG >= 24 ? 1 : -2; break;
    case 'Low Carb': s += n.carbsG <= 15 ? 3 : n.carbsG > 35 ? -4 : 0; break;
    case 'Performance': s += n.carbsG >= 35 ? 2 : 0; break;
    case 'Healthy Eating': s += t.tags.includes('mediterranean') ? 1 : 0; break;
    case 'Maintenance':
    case 'Balanced Lifestyle':
      s += (target ? n.calories >= target * 0.7 && n.calories <= target * 1.2 : n.calories >= 320 && n.calories <= 560) ? 1 : 0;
      break;
  }
  return s;
}

function build(t: Template, goal: ClientGoal, mealType: MealType): Recipe {
  const batch = t.servings > 1 ? ` Ingredient quantities make ${t.servings} servings; nutrition is per serving.` : '';
  return {
    name: t.name,
    goalAlignment: goalAlignment(goal, t.nutrition),
    description: t.description,
    ingredients: t.ingredients,
    steps: t.steps,
    timeMinutes: t.time,
    nutrition: t.nutrition,
    nutritionSource: t.computed ? 'estimated' : 'stated',
    coachingNote: `${t.note} ${GOAL_NOTE[goal]}${batch}`,
    mealType,
  };
}

/** Coach notes only count when they contain a real word; "mbjk" is ignored. */
export function meaningfulNotes(notes: string): string {
  const s = notes.trim();
  return s.length >= 4 && /\b[a-z]{3,}\b/i.test(s) && /[aeiou]/i.test(s) ? s : '';
}

const PLACEHOLDERS = /^(abc|abcd|test|testing|xyz|asdf|qwerty|none|n\/a|na|name|sample|demo|example|business|company|coach|brand)$/i;

/** A business name worth printing on a client PDF; placeholders like "abc" or "test" are dropped. */
export function meaningfulBrand(brand: string): string {
  const s = brand.trim().replace(/\s+/g, ' ');
  if (s.length < 3 || s.length > 60) return '';
  if (!/[aeiou]/i.test(s) || !/[a-z]{3,}/i.test(s)) return '';
  if (PLACEHOLDERS.test(s) || /^(.)\1+$/.test(s)) return '';
  return s;
}

export function generateRecipes(input: RecipeInput, variant = 0, count = 3, avoidNames: string[] = []): RecipeSet {
  const avoid = new Set(avoidNames.map((n) => n.toLowerCase()));
  const goal = input.goal ?? 'Balanced Lifestyle';
  const seed = hashString(JSON.stringify([goal, input.proteins, input.diets, input.mealTypes, input.cookingTime, input.notes.trim().toLowerCase()]));
  const requiredTags = input.diets.map((d) => DIET_TAG[d]).filter((t): t is Tag => Boolean(t));
  const limit = TIME_LIMIT[input.cookingTime ?? 'Flexible'];
  const anyProtein = input.proteins.length === 0 || input.proteins.includes('No Preference');
  const wantedMeals = input.mealTypes.length ? input.mealTypes : [...new Set(LIBRARY.flatMap((t) => t.meals))];
  const disliked = dislikedTerms(meaningfulNotes(input.notes));
  const notes: string[] = [];
  const details = input.profile ? calorieTargetDetails(input.profile, goal) : null;
  const daily = details?.target ?? null;

  const dietOk = (t: Template) => requiredTags.every((tag) => t.tags.includes(tag));
  const proteinOk = (t: Template) => anyProtein || t.proteins.some((p) => input.proteins.includes(p));
  const dislikeOk = (t: Template) =>
    !disliked.some((d) => containsTerm(`${t.name} ${t.ingredients.join(' ')}`, d));

  // Dietary needs and dislikes are never relaxed; protein preference, time and meal type may be.
  let pool = LIBRARY.filter((t) => dietOk(t) && dislikeOk(t));
  const strict = pool.filter((t) => proteinOk(t) && t.time <= limit && t.meals.some((m) => wantedMeals.includes(m)));
  let candidates = strict;
  if (candidates.length < count) {
    candidates = pool.filter((t) => proteinOk(t) && t.meals.some((m) => wantedMeals.includes(m)));
    if (candidates.length > strict.length) notes.push('Some recipes take longer than the selected cooking time.');
  }
  if (candidates.length < count) {
    candidates = pool.filter((t) => t.meals.some((m) => wantedMeals.includes(m)));
    if (!anyProtein && candidates.length > 0) notes.push('Not enough recipes matched the preferred proteins with these dietary needs, so other proteins are included.');
  }
  if (candidates.length < count) {
    candidates = pool;
    if (candidates.length > 0) notes.push('Some recipes fall outside the selected meal types.');
  }
  if (!anyProtein && requiredTags.includes('vegan') && input.proteins.some((p) => !['Tofu', 'Tempeh', 'Lentils', 'Beans', 'Whey / Protein Powder'].includes(p))) {
    notes.push('Animal proteins were skipped because Vegan was selected.');
  }

  const rng = mulberry32(seed ^ (variant * 0x9e3779b9));
  const mealOf = (t: Template) => t.meals.find((m) => wantedMeals.includes(m)) ?? t.meals[0];
  const mealTarget = (t: Template) => (daily ? perMealTarget(daily, mealOf(t)) : null);
  const targetPenalty = (t: Template) => {
    const target = mealTarget(t);
    if (!target) return 0;
    return -Math.min(8, (Math.abs(t.nutrition.calories - target) / target) * 12); // strong enough to outweigh goal bonuses when far off
  };
  const floorPenalty = (t: Template) => {
    const meal = t.meals.find((m) => wantedMeals.includes(m)) ?? t.meals[0];
    return proteinFloorProblem({ mealType: meal, nutrition: t.nutrition }, goal) ? -6 : 0;
  };
  const scored = candidates
    .map((t) => ({
      t,
      score:
        goalScore(goal, t, mealTarget(t)) +
        targetPenalty(t) +
        floorPenalty(t) +
        (proteinOk(t) && !anyProtein ? 2 : 0) +
        (t.time <= limit ? 1 : 0) +
        (t.meals.some((m) => wantedMeals.includes(m)) ? 1 : 0) +
        (avoid.has(t.name.toLowerCase()) ? -10 : 0) + // Regenerate: already-shown recipes go to the back
        rng() * (variant === 0 ? 0.9 : 3), // deterministic tie-break; wider on Regenerate for variety
    }))
    .sort((a, b) => b.score - a.score);

  // Pick the best set with some variety: spread across requested meal types and proteins.
  const picked: Template[] = [];
  const usedMeals = new Set<MealType>();
  const usedProteins = new Set<Protein>();
  for (const pass of [0, 1, 2]) {
    for (const { t } of scored) {
      if (picked.length >= count || picked.includes(t)) continue;
      const meal = t.meals.find((m) => wantedMeals.includes(m)) ?? t.meals[0];
      const newMeal = !usedMeals.has(meal);
      const newProtein = t.proteins.some((p) => !usedProteins.has(p));
      if (pass === 0 && !(newMeal && newProtein)) continue;
      if (pass === 1 && !(newMeal || newProtein)) continue;
      picked.push(t);
      usedMeals.add(meal);
      t.proteins.forEach((p) => usedProteins.add(p));
    }
  }

  const recipes = picked.map((t) => build(t, goal, t.meals.find((m) => wantedMeals.includes(m)) ?? t.meals[0]));
  return { recipes, notes: [...new Set(notes)], dailyTarget: daily, targetNote: targetNote(details) ?? undefined };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------- diet sanity checks -------------------------- */

const ANIMAL_FLESH = ['chicken', 'turkey', 'beef', 'steak', 'pork', 'bacon', 'ham', 'lamb', 'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn', 'seafood', 'anchovy', 'anchovies', 'sardine'];
const ANIMAL_PRODUCTS = ['egg', 'milk', 'yogurt', 'yoghurt', 'cheese', 'feta', 'cheddar', 'parmesan', 'mozzarella', 'butter', 'whey', 'honey', 'cream', 'cottage'];
const DAIRY = ['milk', 'yogurt', 'yoghurt', 'cheese', 'feta', 'cheddar', 'parmesan', 'mozzarella', 'butter', 'whey', 'cream', 'cottage'];
const DAIRY_OK = ['almond milk', 'oat milk', 'soy milk', 'coconut milk', 'plant milk', 'rice milk', 'coconut cream', 'peanut butter', 'almond butter', 'nut butter', 'seed butter', 'cocoa butter', 'dairy-free', 'dairy free', 'plant-based', 'vegan'];
const GLUTEN = ['bread', 'toast', 'wrap', 'tortilla', 'pasta', 'noodle', 'couscous', 'flour', 'crackers', 'barley', 'soy sauce', 'pita', 'bun', 'granola'];
const GLUTEN_OK = ['rice noodle', 'gluten-free', 'gluten free', 'tamari', 'corn tortilla', 'rice cake', 'rice crackers', 'cornflour', 'almond flour', 'coconut flour', 'chickpea flour', 'buckwheat', 'lettuce wrap', 'lettuce cup'];

const strip = (text: string, allowed: string[]) => allowed.reduce((acc, ok) => acc.split(ok).join(' '), text);
const findTerm = (text: string, words: string[]) => words.find((w) => containsTerm(text, w));

/**
 * Keyword check of a recipe's name and ingredients against the selected
 * diets plus the numeric checks for low-carb, keto and high-protein.
 * Returns a short reason when something is off, else null. Used to gate
 * model output; the library is verified against it in tests.
 */
export function dietViolation(
  recipe: { name: string; ingredients: string[]; nutrition: Nutrition },
  diets: readonly Diet[],
): string | null {
  const text = ` ${recipe.name} ${recipe.ingredients.join(' ')} `.toLowerCase();
  const has = (words: string[], allowed: string[] = []) => findTerm(strip(text, allowed), words);
  if (diets.includes('Vegan') || diets.includes('Vegetarian')) {
    const hit = has(ANIMAL_FLESH);
    if (hit) return `${hit} is not vegetarian`;
  }
  if (diets.includes('Vegan')) {
    const hit = has(ANIMAL_PRODUCTS, DAIRY_OK);
    if (hit) return `${hit} is not vegan`;
  }
  if (diets.includes('Dairy-Free')) {
    const hit = has(DAIRY, DAIRY_OK);
    if (hit) return `${hit} is not dairy-free`;
  }
  if (diets.includes('Gluten-Free')) {
    const hit = has(GLUTEN, GLUTEN_OK);
    if (hit) return `${hit} may contain gluten`;
  }
  if (diets.includes('Keto-Friendly') && recipe.nutrition.carbsG > 15) return 'too many carbs for keto';
  if (diets.includes('Low-Carb') && recipe.nutrition.carbsG > 25) return 'too many carbs for low-carb';
  if (diets.includes('High-Protein') && recipe.nutrition.proteinG < 24) return 'not high-protein';
  return null;
}

/** Every library template with the tags the validator checks, for self-tests. */
export function libraryForTests(): { name: string; tags: string[]; ingredients: string[]; nutrition: Nutrition }[] {
  return LIBRARY.map((t) => ({ name: t.name, tags: t.tags, ingredients: t.ingredients, nutrition: t.nutrition }));
}

/** Library size, exposed for tests. */
export const RECIPE_LIBRARY_SIZE = LIBRARY.length;
