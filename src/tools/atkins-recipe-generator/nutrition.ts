import type { Ingredient, Nutrition } from './types.js';

/**
 * Reference nutrition data and the per-serving calculation for the Atkins
 * Diet Recipe Generator. Every recipe ingredient carries a quantity and a
 * unit, so nutrition is computed deterministically from this table (USDA
 * FoodData Central style figures per 100 g: kcal, protein, total carbs,
 * fiber, fat). Net carbs = total carbs minus fiber for whole foods; sugar
 * alcohols and allulose carry their own net-carb figure instead of being
 * subtracted wholesale. This is practical reference data for coaches, not a
 * licensed clinical database: results are labelled approximate everywhere.
 */

export interface Food {
  keys: string[];
  /** per 100 g (per 100 ml for liquids): kcal, protein, total carbs, fiber, fat */
  per100: [number, number, number, number, number];
  /** grams for one of these units when a recipe uses them */
  piece?: number;
  slice?: number;
  tbsp?: number;
  tsp?: number;
  cup?: number;
  /** grams per millilitre for liquids (default 1) */
  density?: number;
  /** essentially calorie-free (seasonings, water): recognised, but adds nothing */
  negligible?: boolean;
  /** net carbs per 100 g when they are not total minus fiber (erythritol, allulose, maltitol) */
  netCarbsPer100?: number;
}

const OIL = 0.92;

export const FOODS: Food[] = [
  /* ---- poultry (raw weight unless the name says cooked) ---- */
  { keys: ['chicken breast', 'chicken breasts', 'chicken fillet', 'chicken tenders', 'chicken mini fillets'], per100: [120, 22.5, 0, 0, 2.6], piece: 170 },
  { keys: ['chicken thigh', 'chicken thighs', 'boneless thigh'], per100: [121, 19.7, 0, 0, 4.3], piece: 110 },
  { keys: ['chicken drumstick', 'chicken drumsticks', 'chicken leg', 'chicken wings', 'chicken wing'], per100: [161, 18, 0, 0, 9.7], piece: 90 },
  { keys: ['ground chicken', 'chicken mince', 'minced chicken'], per100: [143, 17, 0, 0, 8] },
  { keys: ['rotisserie chicken', 'cooked chicken', 'shredded chicken', 'leftover chicken', 'grilled chicken'], per100: [165, 31, 0, 0, 3.6], cup: 140 },
  { keys: ['chicken sausage', 'chicken sausages'], per100: [180, 14, 3, 0, 13], piece: 70 },
  { keys: ['chicken'], per100: [120, 22.5, 0, 0, 2.6], piece: 170 },
  { keys: ['turkey breast', 'turkey steak', 'turkey cutlet', 'turkey cutlets'], per100: [114, 24, 0, 0, 1.5], piece: 150 },
  { keys: ['ground turkey', 'turkey mince', 'minced turkey'], per100: [148, 19.7, 0, 0, 7.7] },
  { keys: ['deli turkey', 'sliced turkey', 'turkey slices', 'smoked turkey'], per100: [104, 17, 4, 0, 1], slice: 28 },
  { keys: ['turkey bacon'], per100: [382, 29, 3, 0, 28], slice: 15 },
  { keys: ['turkey sausage', 'turkey sausages'], per100: [196, 15, 2, 0, 14], piece: 70 },
  { keys: ['turkey'], per100: [114, 24, 0, 0, 1.5], piece: 150 },
  { keys: ['duck breast', 'duck'], per100: [201, 18, 0, 0, 14], piece: 180 },
  /* ---- beef, pork, lamb ---- */
  { keys: ['ground beef', 'beef mince', 'minced beef', 'lean ground beef', 'beef mince (lean)'], per100: [176, 20, 0, 0, 10] },
  { keys: ['sirloin steak', 'sirloin', 'rump steak', 'flank steak', 'skirt steak', 'beef strips', 'steak strips', 'stir-fry beef', 'lean steak'], per100: [142, 22, 0, 0, 5.5], piece: 200 },
  { keys: ['ribeye', 'rib-eye', 'ribeye steak', 'strip steak', 'new york strip'], per100: [291, 24, 0, 0, 21], piece: 225 },
  { keys: ['beef brisket', 'chuck roast', 'stewing beef', 'beef chuck', 'beef stew meat'], per100: [190, 20, 0, 0, 12] },
  { keys: ['beef jerky'], per100: [410, 33, 11, 2, 26] },
  { keys: ['steak', 'beef'], per100: [142, 22, 0, 0, 5.5], piece: 200 },
  { keys: ['pork tenderloin', 'pork fillet', 'pork loin'], per100: [120, 21, 0, 0, 3.5], piece: 170 },
  { keys: ['pork chop', 'pork chops'], per100: [143, 21, 0, 0, 6], piece: 170 },
  { keys: ['pork belly'], per100: [518, 9, 0, 0, 53] },
  { keys: ['pork shoulder', 'pulled pork'], per100: [240, 18, 0, 0, 18] },
  { keys: ['ground pork', 'pork mince', 'minced pork'], per100: [263, 17, 0, 0, 21] },
  { keys: ['pork rinds', 'pork rind', 'pork scratchings', 'chicharrones', 'crushed pork rinds'], per100: [544, 58, 0, 0, 31], cup: 30 },
  { keys: ['bacon', 'streaky bacon', 'bacon rashers', 'bacon strips'], per100: [417, 13, 1.4, 0, 40], slice: 28, piece: 28 },
  { keys: ['pancetta'], per100: [450, 12, 0, 0, 45], tbsp: 15 },
  { keys: ['prosciutto', 'parma ham', 'serrano ham'], per100: [250, 26, 0, 0, 16], slice: 15 },
  { keys: ['ham', 'deli ham', 'cooked ham'], per100: [145, 21, 1.5, 0, 6], slice: 28 },
  { keys: ['salami', 'pepperoni'], per100: [336, 22, 1, 0, 26], slice: 10 },
  { keys: ['chorizo'], per100: [455, 24, 2, 0, 38], piece: 60 },
  { keys: ['sausage', 'sausages', 'pork sausage', 'breakfast sausage', 'italian sausage', 'bratwurst'], per100: [300, 16, 2, 0, 26], piece: 70 },
  { keys: ['pork'], per100: [143, 21, 0, 0, 6], piece: 170 },
  { keys: ['lamb chop', 'lamb chops', 'lamb', 'ground lamb', 'lamb mince'], per100: [282, 17, 0, 0, 23], piece: 120 },
  /* ---- fish and seafood ---- */
  { keys: ['smoked salmon', 'lox'], per100: [117, 18, 0, 0, 4.3], slice: 28 },
  { keys: ['salmon', 'salmon fillet', 'salmon fillets'], per100: [208, 20, 0, 0, 13], piece: 150 },
  { keys: ['tuna steak', 'fresh tuna', 'ahi tuna'], per100: [109, 24, 0, 0, 0.5], piece: 150 },
  { keys: ['canned tuna', 'tinned tuna', 'tuna in water', 'tuna in olive oil', 'tuna'], per100: [116, 26, 0, 0, 1], piece: 120 },
  { keys: ['cod', 'cod fillet', 'cod fillets', 'haddock', 'pollock', 'hake', 'white fish', 'whitefish', 'basa', 'flounder', 'sole'], per100: [82, 18, 0, 0, 0.7], piece: 150 },
  { keys: ['tilapia'], per100: [96, 20, 0, 0, 1.7], piece: 150 },
  { keys: ['halibut'], per100: [91, 19, 0, 0, 1.3], piece: 150 },
  { keys: ['sea bass', 'seabass', 'snapper', 'red snapper', 'barramundi'], per100: [97, 18, 0, 0, 2], piece: 150 },
  { keys: ['trout', 'rainbow trout'], per100: [148, 21, 0, 0, 6.6], piece: 150 },
  { keys: ['mackerel'], per100: [205, 19, 0, 0, 14], piece: 120 },
  { keys: ['sardines', 'sardine', 'canned sardines'], per100: [208, 25, 0, 0, 11], piece: 25 },
  { keys: ['anchovies', 'anchovy', 'anchovy fillets'], per100: [210, 29, 0, 0, 10], piece: 4 },
  { keys: ['fish'], per100: [82, 18, 0, 0, 0.7], piece: 150 },
  { keys: ['shrimp', 'prawns', 'prawn', 'king prawns', 'jumbo shrimp'], per100: [85, 20, 0, 0, 0.5], piece: 12, cup: 145 },
  { keys: ['scallops', 'scallop'], per100: [69, 12, 3, 0, 0.5], piece: 25 },
  { keys: ['squid', 'calamari'], per100: [92, 16, 3, 0, 1.4] },
  { keys: ['crab', 'crab meat', 'crabmeat', 'lump crab'], per100: [83, 18, 0, 0, 0.7], cup: 135 },
  { keys: ['lobster', 'lobster tail'], per100: [77, 16, 0, 0, 0.8], piece: 110 },
  { keys: ['mussels', 'mussel'], per100: [86, 12, 4, 0, 2], cup: 150 },
  { keys: ['clams', 'clam'], per100: [86, 15, 4, 0, 1], cup: 150 },
  { keys: ['octopus'], per100: [82, 15, 2, 0, 1] },
  { keys: ['seafood', 'mixed seafood', 'seafood mix'], per100: [88, 18, 1, 0, 1], cup: 150 },
  /* ---- eggs ---- */
  { keys: ['egg white', 'egg whites'], per100: [52, 11, 1, 0, 0], piece: 33, cup: 243 },
  { keys: ['egg yolk', 'egg yolks'], per100: [322, 16, 3.6, 0, 27], piece: 17 },
  { keys: ['egg', 'eggs', 'large egg', 'large eggs'], per100: [143, 13, 1, 0, 10], piece: 50 },
  /* ---- soy and plant proteins ---- */
  { keys: ['silken tofu', 'soft tofu'], per100: [55, 5, 2, 0, 2.7] },
  { keys: ['tofu', 'firm tofu', 'extra-firm tofu', 'extra firm tofu'], per100: [144, 17, 3, 2, 9], piece: 85 },
  { keys: ['tempeh'], per100: [192, 20, 8, 1, 11], piece: 85 },
  { keys: ['seitan'], per100: [370, 75, 14, 1, 2] },
  { keys: ['edamame', 'soybeans', 'soy beans'], per100: [121, 12, 9, 5, 5], cup: 155 },
  { keys: ['pea protein', 'protein powder', 'whey protein', 'whey', 'casein', 'collagen powder', 'collagen', 'collagen peptides'], per100: [375, 75, 8, 0, 5], tbsp: 10, cup: 120 },
  { keys: ['gelatin', 'gelatine'], per100: [335, 86, 0, 0, 0], tbsp: 7, tsp: 2.5 },
  { keys: ['nutritional yeast'], per100: [325, 50, 35, 20, 5], tbsp: 5 },
  /* ---- cheese and dairy ---- */
  { keys: ['paneer'], per100: [321, 18, 4, 0, 25], cup: 120 },
  { keys: ['halloumi'], per100: [321, 22, 2, 0, 26], slice: 30 },
  { keys: ['cheddar', 'cheddar cheese', 'sharp cheddar', 'shredded cheddar', 'colby', 'monterey jack', 'pepper jack'], per100: [403, 25, 1.3, 0, 33], tbsp: 8, cup: 113, slice: 28 },
  { keys: ['mozzarella', 'mozzarella cheese', 'shredded mozzarella', 'fresh mozzarella'], per100: [300, 22, 2.2, 0, 22], tbsp: 8, cup: 113, slice: 28 },
  { keys: ['parmesan', 'parmesan cheese', 'grated parmesan', 'pecorino', 'grana padano', 'parmigiano'], per100: [431, 38, 4, 0, 29], tbsp: 6, cup: 100 },
  { keys: ['feta', 'feta cheese', 'crumbled feta'], per100: [264, 14, 4, 0, 21], tbsp: 10, cup: 150 },
  { keys: ['goat cheese', "goat's cheese", 'chevre'], per100: [364, 22, 0.1, 0, 30], tbsp: 14 },
  { keys: ['cream cheese'], per100: [342, 6, 4, 0, 34], tbsp: 14 },
  { keys: ['cottage cheese'], per100: [98, 11, 3.4, 0, 4.3], cup: 225, tbsp: 15 },
  { keys: ['ricotta', 'ricotta cheese'], per100: [174, 11, 3, 0, 13], cup: 246, tbsp: 15 },
  { keys: ['blue cheese', 'gorgonzola', 'roquefort', 'stilton'], per100: [353, 21, 2.3, 0, 29], tbsp: 10 },
  { keys: ['gruyere', 'gruyère', 'swiss cheese', 'emmental', 'gouda', 'edam', 'provolone', 'havarti', 'manchego'], per100: [393, 30, 1, 0, 31], slice: 28, cup: 108 },
  { keys: ['brie', 'camembert'], per100: [334, 21, 0.5, 0, 28], piece: 30 },
  { keys: ['mascarpone'], per100: [429, 4, 4, 0, 44], tbsp: 15 },
  { keys: ['cheese', 'shredded cheese', 'grated cheese', 'cheese slices', 'mixed cheese'], per100: [350, 24, 2, 0, 27], tbsp: 8, cup: 113, slice: 28 },
  { keys: ['greek yogurt', 'greek yoghurt', 'skyr', 'full-fat greek yogurt', 'plain greek yogurt'], per100: [97, 9, 4, 0, 5], cup: 245, tbsp: 15 },
  { keys: ['coconut yogurt', 'coconut yoghurt', 'almond yogurt', 'soy yogurt', 'plant yogurt'], per100: [90, 1, 5, 0, 7], cup: 240, tbsp: 15 },
  { keys: ['yogurt', 'yoghurt', 'plain yogurt', 'natural yogurt', 'whole-milk yogurt', 'kefir'], per100: [61, 3.5, 4.7, 0, 3.3], cup: 245, tbsp: 15 },
  { keys: ['heavy cream', 'double cream', 'whipping cream', 'heavy whipping cream', 'thickened cream'], per100: [340, 2.1, 2.8, 0, 36], cup: 240, tbsp: 15, density: 1 },
  { keys: ['half-and-half', 'half and half', 'single cream', 'light cream'], per100: [130, 3, 4.3, 0, 11.5], cup: 240, tbsp: 15 },
  { keys: ['sour cream', 'creme fraiche', 'crème fraîche'], per100: [198, 2.4, 4.6, 0, 19], cup: 230, tbsp: 15 },
  { keys: ['ghee', 'clarified butter'], per100: [900, 0, 0, 0, 100], tbsp: 13, tsp: 4.5 },
  { keys: ['butter', 'salted butter', 'unsalted butter'], per100: [717, 0.9, 0.1, 0, 81], tbsp: 14, tsp: 4.7 },
  { keys: ['whole milk', 'milk', 'skim milk', 'semi-skimmed milk', 'buttermilk'], per100: [61, 3.2, 4.8, 0, 3.3], cup: 245, tbsp: 15 },
  { keys: ['almond milk', 'unsweetened almond milk', 'cashew milk', 'macadamia milk', 'hemp milk', 'flax milk'], per100: [15, 0.6, 0.6, 0.3, 1.2], cup: 240, tbsp: 15 },
  { keys: ['soy milk', 'unsweetened soy milk'], per100: [40, 3.3, 1.5, 0.5, 1.8], cup: 240 },
  { keys: ['oat milk'], per100: [45, 1, 7, 0.8, 1.5], cup: 240 },
  { keys: ['coconut cream'], per100: [330, 3.6, 6.6, 2, 34], cup: 240, tbsp: 15 },
  { keys: ['light coconut milk', 'lite coconut milk'], per100: [70, 0.7, 1.4, 0, 6], cup: 240, tbsp: 15 },
  { keys: ['coconut milk', 'canned coconut milk', 'full-fat coconut milk'], per100: [197, 2, 2.8, 0, 21], cup: 240, tbsp: 15 },
  /* ---- fats and oils ---- */
  { keys: ['olive oil', 'extra virgin olive oil', 'extra-virgin olive oil', 'evoo'], per100: [884, 0, 0, 0, 100], tbsp: 13.5, tsp: 4.5, density: OIL },
  { keys: ['coconut oil', 'avocado oil', 'sesame oil', 'toasted sesame oil', 'peanut oil', 'vegetable oil', 'canola oil', 'rapeseed oil', 'sunflower oil', 'walnut oil', 'ghee oil', 'cooking oil', 'oil', 'mct oil', 'chili oil', 'chilli oil'], per100: [884, 0, 0, 0, 100], tbsp: 13.5, tsp: 4.5, density: OIL },
  { keys: ['cooking spray', 'oil spray'], per100: [0, 0, 0, 0, 0], negligible: true },
  { keys: ['lard', 'tallow', 'beef tallow', 'duck fat', 'bacon fat', 'bacon grease'], per100: [900, 0, 0, 0, 100], tbsp: 13 },
  { keys: ['mayonnaise', 'mayo', 'aioli', 'avocado mayo', 'avocado oil mayo'], per100: [680, 1, 0.6, 0, 75], tbsp: 14, tsp: 5 },
  { keys: ['avocado'], per100: [160, 2, 8.5, 6.7, 14.7], piece: 150, cup: 150, tbsp: 15 },
  { keys: ['guacamole'], per100: [160, 2, 8, 6, 15], tbsp: 15, cup: 230 },
  { keys: ['olives', 'olive', 'kalamata olives', 'green olives', 'black olives', 'sliced olives'], per100: [115, 0.8, 6.3, 3.2, 10.7], piece: 4, tbsp: 9, cup: 135 },
  /* ---- vegetables ---- */
  { keys: ['spinach', 'baby spinach', 'frozen spinach'], per100: [23, 2.9, 3.6, 2.2, 0.4], cup: 30 },
  { keys: ['kale', 'curly kale', 'lacinato kale', 'tuscan kale', 'cavolo nero'], per100: [49, 4.3, 8.8, 3.6, 0.9], cup: 67 },
  { keys: ['romaine', 'romaine lettuce', 'cos lettuce', 'romaine hearts'], per100: [17, 1.2, 3.3, 2.1, 0.3], cup: 47, piece: 15 },
  { keys: ['butter lettuce', 'bibb lettuce', 'little gem', 'iceberg lettuce', 'iceberg', 'lettuce', 'lettuce leaves', 'lettuce cups', 'lettuce wraps', 'lettuce wrap'], per100: [15, 1.4, 2.9, 1.3, 0.2], cup: 47, piece: 15 },
  { keys: ['mixed greens', 'salad greens', 'spring mix', 'baby greens', 'mixed salad leaves', 'salad leaves', 'mesclun', 'leafy greens'], per100: [20, 2, 3.7, 2, 0.3], cup: 40 },
  { keys: ['arugula', 'rocket', 'baby arugula'], per100: [25, 2.6, 3.7, 1.6, 0.7], cup: 20 },
  { keys: ['watercress'], per100: [11, 2.3, 1.3, 0.5, 0.1], cup: 34 },
  { keys: ['swiss chard', 'chard', 'rainbow chard'], per100: [19, 1.8, 3.7, 1.6, 0.2], cup: 36 },
  { keys: ['collard greens', 'collards'], per100: [32, 3, 5.4, 4, 0.6], cup: 36 },
  { keys: ['endive', 'escarole', 'radicchio', 'chicory', 'frisee'], per100: [17, 1.3, 3.4, 3.1, 0.2], cup: 50 },
  { keys: ['red cabbage', 'napa cabbage', 'savoy cabbage', 'green cabbage', 'cabbage', 'shredded cabbage', 'coleslaw mix', 'slaw mix', 'slaw'], per100: [25, 1.3, 5.8, 2.5, 0.1], cup: 90 },
  { keys: ['sauerkraut'], per100: [19, 0.9, 4.3, 2.9, 0.1], cup: 140, tbsp: 10 },
  { keys: ['kimchi'], per100: [15, 1.1, 2.4, 1.6, 0.5], cup: 150, tbsp: 10 },
  { keys: ['broccoli', 'broccoli florets', 'broccolini', 'tenderstem broccoli', 'frozen broccoli'], per100: [34, 2.8, 6.6, 2.6, 0.4], cup: 90 },
  { keys: ['cauliflower rice', 'riced cauliflower', 'cauliflower', 'cauliflower florets', 'frozen cauliflower', 'cauliflower mash'], per100: [25, 1.9, 5, 2, 0.3], cup: 107 },
  { keys: ['zucchini', 'courgette', 'zucchini noodles', 'zoodles', 'courgetti', 'summer squash', 'yellow squash', 'squash'], per100: [17, 1.2, 3.1, 1, 0.3], piece: 200, cup: 125 },
  { keys: ['spaghetti squash'], per100: [31, 0.6, 6.9, 1.5, 0.6], cup: 100 },
  { keys: ['cucumber', 'english cucumber', 'persian cucumbers', 'persian cucumber'], per100: [15, 0.7, 3.6, 0.5, 0.1], piece: 300, cup: 120 },
  { keys: ['celery', 'celery stalks', 'celery stalk', 'celery sticks'], per100: [16, 0.7, 3, 1.6, 0.2], piece: 40, cup: 100 },
  { keys: ['asparagus', 'asparagus spears'], per100: [20, 2.2, 3.9, 2.1, 0.1], piece: 16, cup: 134 },
  { keys: ['green beans', 'string beans', 'french beans', 'haricots verts', 'runner beans'], per100: [31, 1.8, 7, 2.7, 0.1], cup: 100 },
  { keys: ['snow peas', 'sugar snap peas', 'snap peas', 'mangetout'], per100: [42, 2.8, 7.5, 2.6, 0.2], cup: 63 },
  { keys: ['bean sprouts', 'beansprouts', 'mung bean sprouts'], per100: [30, 3, 6, 1.8, 0.2], cup: 104 },
  { keys: ['portobello', 'portobello mushrooms', 'portobello mushroom', 'cremini', 'cremini mushrooms', 'button mushrooms', 'shiitake', 'shiitake mushrooms', 'oyster mushrooms', 'mushrooms', 'mushroom', 'sliced mushrooms'], per100: [22, 3.1, 3.3, 1, 0.3], piece: 18, cup: 70 },
  { keys: ['eggplant', 'aubergine'], per100: [25, 1, 5.9, 3, 0.2], piece: 450, cup: 82 },
  { keys: ['bok choy', 'pak choi', 'baby bok choy'], per100: [13, 1.5, 2.2, 1, 0.2], cup: 70, piece: 100 },
  { keys: ['brussels sprouts', 'brussel sprouts', 'sprouts'], per100: [43, 3.4, 9, 3.8, 0.3], cup: 88, piece: 19 },
  { keys: ['radishes', 'radish', 'daikon', 'daikon radish'], per100: [16, 0.7, 3.4, 1.6, 0.1], piece: 5, cup: 116 },
  { keys: ['turnip', 'turnips', 'kohlrabi', 'swede', 'rutabaga'], per100: [28, 0.9, 6.4, 1.8, 0.1], piece: 120, cup: 130 },
  { keys: ['fennel', 'fennel bulb'], per100: [31, 1.2, 7.3, 3.1, 0.2], piece: 230, cup: 87 },
  { keys: ['jalapeño', 'jalapeno', 'jalapenos', 'jalapeños', 'serrano', 'serrano pepper', 'green chili', 'green chilli', 'red chili', 'red chilli', 'chili pepper', 'chilli pepper', "bird's eye chili", 'thai chili'], per100: [29, 0.9, 6.5, 2.8, 0.4], piece: 14 },
  { keys: ['bell pepper', 'bell peppers', 'red pepper', 'red peppers', 'green pepper', 'green peppers', 'yellow pepper', 'capsicum', 'roasted red pepper', 'roasted red peppers', 'roasted peppers', 'mixed peppers', 'sweet pepper', 'sweet peppers', 'peppers'], per100: [31, 1, 6, 2.1, 0.3], piece: 120, cup: 150 },
  { keys: ['cherry tomatoes', 'cherry tomato', 'grape tomatoes'], per100: [18, 0.9, 3.9, 1.2, 0.2], piece: 17, cup: 150 },
  { keys: ['sun-dried tomatoes', 'sun-dried tomato', 'sundried tomatoes'], per100: [258, 14, 56, 12, 3], tbsp: 7, piece: 2 },
  { keys: ['tomato paste', 'tomato purée', 'tomato puree (concentrate)'], per100: [82, 4.3, 19, 4.1, 0.5], tbsp: 16, tsp: 5 },
  { keys: ['passata', 'tomato puree', 'tomato sauce', 'marinara', 'marinara sauce', 'crushed tomatoes', 'canned tomatoes', 'tinned tomatoes', 'diced tomatoes', 'chopped tomatoes', 'tomato sauce (no sugar added)'], per100: [32, 1.4, 6.5, 1.5, 0.3], cup: 245, tbsp: 16, piece: 400 },
  { keys: ['tomato', 'tomatoes', 'plum tomatoes', 'roma tomatoes', 'roma tomato', 'beef tomato'], per100: [18, 0.9, 3.9, 1.2, 0.2], piece: 120, cup: 180 },
  { keys: ['salsa', 'pico de gallo', 'salsa verde'], per100: [36, 1.5, 7, 1.9, 0.2], tbsp: 16, cup: 260 },
  { keys: ['red onion', 'white onion', 'yellow onion', 'brown onion', 'onion', 'onions'], per100: [40, 1.1, 9.3, 1.7, 0.1], piece: 110, cup: 160, tbsp: 10 },
  { keys: ['shallot', 'shallots'], per100: [72, 2.5, 17, 3.2, 0.1], piece: 25, tbsp: 10 },
  { keys: ['scallions', 'scallion', 'green onion', 'green onions', 'spring onion', 'spring onions'], per100: [32, 1.8, 7.3, 2.6, 0.2], piece: 15, cup: 100, tbsp: 6 },
  { keys: ['leek', 'leeks'], per100: [61, 1.5, 14, 1.8, 0.3], piece: 90, cup: 89 },
  { keys: ['garlic', 'garlic cloves', 'garlic clove', 'minced garlic', 'crushed garlic'], per100: [149, 6.4, 33, 2.1, 0.5], piece: 3, tsp: 3, tbsp: 9 },
  { keys: ['ginger', 'fresh ginger', 'grated ginger', 'ginger paste', 'ginger-garlic paste', 'ginger garlic paste'], per100: [80, 1.8, 18, 2, 0.8], tsp: 2, tbsp: 6, piece: 15 },
  { keys: ['artichoke hearts', 'artichoke', 'artichokes'], per100: [47, 3.3, 10.5, 5.4, 0.2], piece: 50, cup: 170 },
  { keys: ['hearts of palm', 'palm hearts'], per100: [28, 2.5, 4.6, 2.4, 0.6], cup: 146 },
  { keys: ['bamboo shoots'], per100: [27, 2.6, 5.2, 2.2, 0.3], cup: 120 },
  { keys: ['water chestnuts'], per100: [97, 1.4, 24, 3, 0.1], cup: 124 },
  { keys: ['okra'], per100: [33, 1.9, 7.5, 3.2, 0.2], cup: 100 },
  { keys: ['carrot', 'carrots', 'baby carrots', 'grated carrot', 'shredded carrot'], per100: [41, 0.9, 9.6, 2.8, 0.2], piece: 60, cup: 110, tbsp: 8 },
  { keys: ['pumpkin', 'pumpkin puree', 'pumpkin purée'], per100: [26, 1, 6.5, 0.5, 0.1], cup: 245, tbsp: 15 },
  { keys: ['butternut squash', 'butternut', 'winter squash', 'acorn squash', 'kabocha'], per100: [45, 1, 11.7, 2, 0.1], cup: 140 },
  { keys: ['beetroot', 'beets', 'beet'], per100: [43, 1.6, 9.6, 2.8, 0.2], piece: 80, cup: 136 },
  { keys: ['seaweed', 'nori', 'nori sheets', 'nori sheet', 'wakame', 'kelp'], per100: [35, 6, 5, 0.3, 0.3], piece: 3, tbsp: 2 },
  { keys: ['shirataki noodles', 'shirataki', 'konjac noodles', 'konjac rice', 'miracle noodles', 'kelp noodles', 'shirataki rice'], per100: [10, 0, 3, 3, 0], cup: 140 },
  { keys: ['pickles', 'pickle', 'dill pickles', 'gherkins', 'cornichons'], per100: [11, 0.3, 2.3, 1.2, 0.2], piece: 35, tbsp: 10 },
  { keys: ['capers'], per100: [23, 2, 5, 3, 0.9], tbsp: 9, tsp: 3 },
  { keys: ['stir-fry vegetables', 'mixed vegetables', 'frozen vegetables', 'vegetable mix', 'roasted vegetables', 'vegetables'], per100: [40, 1.8, 7, 2.5, 0.5], cup: 110 },
  /* ---- nuts, seeds, nut flours ---- */
  { keys: ['almond flour', 'almond meal', 'ground almonds', 'blanched almond flour'], per100: [579, 21, 22, 12.5, 50], tbsp: 7, cup: 96 },
  { keys: ['almond butter'], per100: [614, 21, 19, 10, 56], tbsp: 16 },
  { keys: ['almonds', 'almond', 'sliced almonds', 'flaked almonds', 'slivered almonds', 'roasted almonds'], per100: [579, 21, 22, 12.5, 50], tbsp: 9, cup: 95, piece: 1.2 },
  { keys: ['walnuts', 'walnut', 'chopped walnuts', 'walnut halves'], per100: [654, 15, 14, 6.7, 65], tbsp: 7.5, cup: 100, piece: 4 },
  { keys: ['pecans', 'pecan', 'pecan halves', 'chopped pecans'], per100: [691, 9, 14, 9.6, 72], tbsp: 7, cup: 100, piece: 2 },
  { keys: ['macadamia', 'macadamias', 'macadamia nuts'], per100: [718, 8, 14, 8.6, 76], tbsp: 8, cup: 134, piece: 3 },
  { keys: ['cashews', 'cashew', 'cashew nuts', 'cashew butter'], per100: [553, 18, 30, 3.3, 44], tbsp: 9, cup: 130, piece: 1.5 },
  { keys: ['pistachios', 'pistachio', 'shelled pistachios'], per100: [560, 20, 28, 10, 45], tbsp: 8, cup: 123, piece: 0.7 },
  { keys: ['hazelnuts', 'hazelnut'], per100: [628, 15, 17, 9.7, 61], tbsp: 8, cup: 135, piece: 1.2 },
  { keys: ['brazil nuts', 'brazil nut'], per100: [659, 14, 12, 7.5, 67], piece: 5 },
  { keys: ['pine nuts', 'pine nut', 'pignoli'], per100: [673, 14, 13, 3.7, 68], tbsp: 9, cup: 135 },
  { keys: ['peanut butter', 'natural peanut butter', 'nut butter', 'mixed nut butter'], per100: [588, 25, 20, 6, 50], tbsp: 16 },
  { keys: ['peanuts', 'peanut', 'roasted peanuts', 'crushed peanuts'], per100: [567, 26, 16, 8.5, 49], tbsp: 9, cup: 146 },
  { keys: ['mixed nuts', 'nuts', 'chopped nuts'], per100: [607, 20, 21, 7, 54], tbsp: 8, cup: 135 },
  { keys: ['pumpkin seeds', 'pepitas', 'pumpkin seed'], per100: [559, 30, 11, 6, 49], tbsp: 10, cup: 129 },
  { keys: ['sunflower seeds', 'sunflower seed'], per100: [584, 21, 20, 8.6, 51], tbsp: 9, cup: 140 },
  { keys: ['chia seeds', 'chia seed', 'chia'], per100: [486, 17, 42, 34, 31], tbsp: 12, tsp: 4 },
  { keys: ['flaxseed', 'flax seeds', 'flax seed', 'flaxseed meal', 'ground flaxseed', 'ground flax', 'linseed', 'linseeds', 'flax'], per100: [534, 18, 29, 27, 42], tbsp: 10, tsp: 3.3, cup: 150 },
  { keys: ['sesame seeds', 'sesame seed', 'toasted sesame seeds', 'black sesame seeds', 'white sesame seeds'], per100: [573, 18, 23, 12, 50], tbsp: 9, tsp: 3 },
  { keys: ['hemp seeds', 'hemp hearts', 'hemp seed'], per100: [553, 32, 8.7, 4, 49], tbsp: 10 },
  { keys: ['tahini', 'sesame paste'], per100: [595, 17, 21, 9, 54], tbsp: 15, tsp: 5 },
  { keys: ['coconut flour'], per100: [400, 18, 60, 38, 14], tbsp: 8, cup: 112 },
  { keys: ['shredded coconut', 'desiccated coconut', 'coconut flakes', 'unsweetened shredded coconut', 'unsweetened coconut', 'coconut chips', 'coconut'], per100: [660, 7, 24, 16, 65], tbsp: 6, cup: 80 },
  { keys: ['psyllium husk', 'psyllium', 'psyllium husk powder'], per100: [200, 0, 80, 80, 0], tbsp: 9, tsp: 3 },
  /* ---- fruit ---- */
  { keys: ['strawberries', 'strawberry', 'sliced strawberries'], per100: [32, 0.7, 7.7, 2, 0.3], cup: 150, piece: 12 },
  { keys: ['raspberries', 'raspberry'], per100: [52, 1.2, 12, 6.5, 0.7], cup: 125, tbsp: 8 },
  { keys: ['blueberries', 'blueberry'], per100: [57, 0.7, 14.5, 2.4, 0.3], cup: 150, tbsp: 9 },
  { keys: ['blackberries', 'blackberry'], per100: [43, 1.4, 9.6, 5.3, 0.5], cup: 145 },
  { keys: ['cranberries', 'fresh cranberries'], per100: [46, 0.4, 12, 3.6, 0.1], cup: 100 },
  { keys: ['dried cranberries', 'craisins'], per100: [308, 0, 82, 5, 1.4], tbsp: 10 },
  { keys: ['mixed berries', 'berries', 'frozen berries', 'berry mix'], per100: [50, 1, 12, 5, 0.5], cup: 140 },
  { keys: ['cherries', 'cherry', 'pitted cherries'], per100: [63, 1, 16, 2.1, 0.2], cup: 150, piece: 8 },
  { keys: ['cantaloupe', 'melon', 'honeydew', 'honeydew melon', 'rockmelon'], per100: [34, 0.8, 8, 0.9, 0.2], cup: 160 },
  { keys: ['watermelon'], per100: [30, 0.6, 7.5, 0.4, 0.2], cup: 152 },
  { keys: ['lemon juice', 'fresh lemon juice', 'juice of lemon'], per100: [22, 0.4, 6.9, 0.3, 0.2], tbsp: 15, tsp: 5, cup: 240 },
  { keys: ['lime juice', 'fresh lime juice', 'juice of lime'], per100: [25, 0.4, 8.4, 0.4, 0.1], tbsp: 15, tsp: 5, cup: 240 },
  { keys: ['lemon'], per100: [29, 1.1, 9.3, 2.8, 0.3], piece: 60 },
  { keys: ['lime'], per100: [30, 0.7, 10.5, 2.8, 0.2], piece: 45 },
  { keys: ['apple', 'apples', 'green apple'], per100: [52, 0.3, 14, 2.4, 0.2], piece: 180, cup: 110 },
  { keys: ['pear', 'pears'], per100: [57, 0.4, 15, 3.1, 0.1], piece: 180 },
  { keys: ['orange', 'oranges', 'orange segments'], per100: [47, 0.9, 12, 2.4, 0.1], piece: 130 },
  { keys: ['orange juice'], per100: [45, 0.7, 10, 0.2, 0.2], cup: 248, tbsp: 15 },
  { keys: ['banana', 'bananas'], per100: [89, 1.1, 23, 2.6, 0.3], piece: 118 },
  { keys: ['grapes', 'grape'], per100: [69, 0.7, 18, 0.9, 0.2], cup: 150, piece: 5 },
  { keys: ['mango', 'mangoes'], per100: [60, 0.8, 15, 1.6, 0.4], cup: 165, piece: 200 },
  { keys: ['pineapple'], per100: [50, 0.5, 13, 1.4, 0.1], cup: 165 },
  { keys: ['peach', 'peaches', 'nectarine', 'nectarines'], per100: [39, 0.9, 9.5, 1.5, 0.3], piece: 150 },
  { keys: ['plum', 'plums'], per100: [46, 0.7, 11, 1.4, 0.3], piece: 66 },
  { keys: ['kiwi', 'kiwis', 'kiwifruit'], per100: [61, 1.1, 15, 3, 0.5], piece: 70 },
  { keys: ['dates', 'date', 'medjool dates'], per100: [277, 1.8, 75, 6.7, 0.2], piece: 24 },
  { keys: ['raisins', 'sultanas'], per100: [299, 3, 79, 3.7, 0.5], tbsp: 10 },
  { keys: ['figs', 'fig', 'fresh figs'], per100: [74, 0.8, 19, 2.9, 0.3], piece: 50 },
  { keys: ['pomegranate seeds', 'pomegranate arils', 'pomegranate'], per100: [83, 1.7, 19, 4, 1.2], tbsp: 10, cup: 174 },
  /* ---- legumes ---- */
  { keys: ['red lentils', 'dry lentils', 'uncooked lentils', 'dried lentils'], per100: [352, 25, 60, 11, 1], cup: 190 },
  { keys: ['lentils', 'lentil', 'cooked lentils', 'green lentils', 'brown lentils', 'black lentils', 'dal', 'dhal'], per100: [116, 9, 20, 7.9, 0.4], cup: 200 },
  { keys: ['chickpea flour', 'gram flour', 'besan'], per100: [387, 22, 58, 11, 7], tbsp: 8, cup: 92 },
  { keys: ['chickpeas', 'chickpea', 'garbanzo beans', 'garbanzos', 'chana'], per100: [164, 8.9, 27, 7.6, 2.6], cup: 165, piece: 240 },
  { keys: ['hummus'], per100: [166, 8, 14, 6, 10], tbsp: 15, cup: 245 },
  { keys: ['black beans', 'black bean'], per100: [132, 8.9, 24, 8.7, 0.5], cup: 172, piece: 240 },
  { keys: ['kidney beans', 'kidney bean', 'rajma'], per100: [127, 8.7, 22.8, 6.4, 0.5], cup: 177, piece: 240 },
  { keys: ['cannellini', 'cannellini beans', 'white beans', 'navy beans', 'butter beans', 'lima beans', 'great northern beans'], per100: [139, 9.7, 25, 6.3, 0.6], cup: 179, piece: 240 },
  { keys: ['pinto beans', 'refried beans', 'baked beans', 'beans', 'bean'], per100: [143, 9, 26, 9, 0.65], cup: 171, piece: 240 },
  { keys: ['green peas', 'peas', 'frozen peas', 'split peas'], per100: [81, 5.4, 14, 5.7, 0.4], cup: 145, tbsp: 10 },
  /* ---- grains and starches ---- */
  { keys: ['brown rice', 'cooked brown rice'], per100: [112, 2.3, 23, 1.8, 0.8], cup: 195 },
  { keys: ['wild rice'], per100: [101, 4, 21, 1.8, 0.3], cup: 164 },
  { keys: ['rice', 'white rice', 'cooked rice', 'basmati rice', 'jasmine rice'], per100: [130, 2.7, 28, 0.4, 0.3], cup: 158 },
  { keys: ['rice flour', 'flour', 'all-purpose flour', 'plain flour', 'wheat flour', 'whole wheat flour', 'self-raising flour'], per100: [364, 10, 76, 2.7, 1], tbsp: 8, cup: 125 },
  { keys: ['quinoa', 'cooked quinoa'], per100: [120, 4.4, 21, 2.8, 1.9], cup: 185 },
  { keys: ['oats', 'rolled oats', 'oatmeal', 'porridge oats', 'steel-cut oats', 'quick oats'], per100: [379, 13, 68, 10, 6.5], cup: 81, tbsp: 8 },
  { keys: ['oat fiber', 'oat fibre'], per100: [0, 0, 100, 100, 0], tbsp: 6 },
  { keys: ['low-carb bread', 'low carb bread', 'keto bread', 'protein bread'], per100: [150, 15, 25, 15, 5], slice: 30 },
  { keys: ['bread', 'sourdough', 'whole grain bread', 'wholemeal bread', 'toast', 'baguette', 'bun', 'burger bun', 'bagel', 'pita', 'pita bread', 'naan', 'roti', 'chapati'], per100: [265, 9, 49, 2.7, 3.2], slice: 30, piece: 60 },
  { keys: ['low-carb tortilla', 'low carb tortilla', 'low-carb tortillas', 'keto tortilla', 'keto tortillas', 'low-carb wrap', 'low-carb wraps'], per100: [170, 14, 32, 22, 5], piece: 40 },
  { keys: ['corn tortilla', 'corn tortillas'], per100: [218, 5.7, 45, 6, 2.9], piece: 25 },
  { keys: ['tortilla', 'tortillas', 'flour tortilla', 'flour tortillas', 'wrap', 'wraps'], per100: [300, 8, 50, 3, 7], piece: 45 },
  { keys: ['chickpea pasta', 'lentil pasta', 'protein pasta'], per100: [170, 13, 27, 5, 2.5], cup: 140 },
  { keys: ['pasta', 'spaghetti', 'penne', 'fusilli', 'macaroni', 'linguine', 'fettuccine', 'noodles', 'noodle', 'egg noodles', 'rice noodles', 'ramen', 'udon', 'orzo', 'couscous'], per100: [158, 5.8, 31, 1.8, 0.9], cup: 140 },
  { keys: ['potato', 'potatoes', 'baby potatoes', 'new potatoes', 'russet potato'], per100: [77, 2, 17, 2.2, 0.1], piece: 150, cup: 150 },
  { keys: ['sweet potato', 'sweet potatoes', 'yam', 'yams'], per100: [86, 1.6, 20, 3, 0.1], piece: 130, cup: 133 },
  { keys: ['corn', 'sweetcorn', 'corn kernels', 'baby corn'], per100: [86, 3.3, 19, 2.7, 1.2], cup: 145, piece: 90 },
  { keys: ['cornstarch', 'cornflour', 'corn starch', 'arrowroot', 'tapioca starch', 'potato starch'], per100: [381, 0.3, 91, 0.9, 0.1], tbsp: 8, tsp: 2.7 },
  { keys: ['breadcrumbs', 'bread crumbs', 'panko', 'panko breadcrumbs'], per100: [395, 13, 72, 5, 5], tbsp: 7, cup: 108 },
  { keys: ['crackers', 'cracker', 'rice cakes', 'rice cake'], per100: [400, 8, 70, 3, 10], piece: 7 },
  { keys: ['granola', 'muesli'], per100: [471, 10, 64, 7, 20], cup: 110, tbsp: 12 },
  /* ---- sauces, condiments, pantry ---- */
  { keys: ['tamari', 'gluten-free soy sauce', 'gluten free soy sauce'], per100: [60, 10, 5.6, 0.8, 0.1], tbsp: 18, tsp: 6 },
  { keys: ['soy sauce', 'light soy sauce', 'dark soy sauce', 'shoyu'], per100: [53, 8, 4.9, 0.8, 0], tbsp: 16, tsp: 5.5 },
  { keys: ['coconut aminos'], per100: [100, 0, 20, 0, 0], tbsp: 15, tsp: 5 },
  { keys: ['fish sauce'], per100: [35, 5, 3.6, 0, 0], tbsp: 18, tsp: 6 },
  { keys: ['oyster sauce'], per100: [51, 1.4, 11, 0, 0], tbsp: 16, tsp: 5 },
  { keys: ['hoisin', 'hoisin sauce'], per100: [220, 3, 44, 3, 3], tbsp: 16 },
  { keys: ['teriyaki', 'teriyaki sauce'], per100: [89, 6, 16, 0, 0], tbsp: 18 },
  { keys: ['sriracha', 'chili garlic sauce', 'sambal oelek', 'sambal', 'gochujang'], per100: [93, 2, 19, 2, 1], tsp: 5, tbsp: 15 },
  { keys: ['hot sauce', 'tabasco', 'buffalo sauce', 'franks red hot', "frank's red hot", 'chili crisp', 'chilli crisp'], per100: [30, 0.5, 3, 0.5, 2], tsp: 5, tbsp: 15 },
  { keys: ['harissa', 'harissa paste'], per100: [130, 3, 12, 4, 9], tbsp: 15, tsp: 5 },
  { keys: ['miso', 'miso paste', 'white miso', 'red miso'], per100: [199, 12, 26, 5, 6], tbsp: 17, tsp: 6 },
  { keys: ['red curry paste', 'green curry paste', 'thai curry paste', 'curry paste', 'yellow curry paste', 'massaman paste', 'tikka paste', 'tandoori paste'], per100: [150, 3, 12, 4, 10], tbsp: 15, tsp: 5 },
  { keys: ['pesto', 'basil pesto', 'green pesto', 'red pesto'], per100: [460, 5, 6, 2, 47], tbsp: 16, tsp: 5 },
  { keys: ['tzatziki'], per100: [90, 4, 4, 0, 7], tbsp: 15, cup: 230 },
  { keys: ['ranch dressing', 'ranch', 'caesar dressing', 'blue cheese dressing'], per100: [430, 1, 5, 0, 45], tbsp: 15 },
  { keys: ['vinaigrette', 'italian dressing', 'salad dressing', 'dressing', 'lemon vinaigrette'], per100: [400, 0, 5, 0, 40], tbsp: 15 },
  { keys: ['dijon mustard', 'dijon', 'wholegrain mustard', 'whole grain mustard', 'yellow mustard', 'mustard'], per100: [66, 4, 5, 3, 4], tsp: 5, tbsp: 15 },
  { keys: ['horseradish', 'prepared horseradish'], per100: [48, 1.2, 11, 3.3, 0.7], tsp: 5, tbsp: 15 },
  { keys: ['worcestershire sauce', 'worcestershire'], per100: [78, 0, 19, 0, 0], tsp: 5.5, tbsp: 17 },
  { keys: ['sugar-free ketchup', 'sugar free ketchup', 'no sugar ketchup', 'low-carb ketchup'], per100: [20, 0.5, 5, 0.5, 0.1], tbsp: 17 },
  { keys: ['ketchup', 'tomato ketchup'], per100: [101, 1, 27, 0.3, 0.1], tbsp: 17 },
  { keys: ['sugar-free bbq sauce', 'sugar free bbq sauce', 'low-carb bbq sauce'], per100: [30, 0.5, 6, 1, 0.3], tbsp: 17 },
  { keys: ['bbq sauce', 'barbecue sauce'], per100: [172, 0.8, 41, 1, 0.6], tbsp: 17 },
  { keys: ['bone broth'], per100: [40, 9, 0, 0, 0.5], cup: 240 },
  { keys: ['chicken broth', 'chicken stock', 'beef broth', 'beef stock', 'vegetable broth', 'vegetable stock', 'fish stock', 'stock', 'broth', 'bouillon', 'dashi'], per100: [5, 0.3, 0.8, 0, 0.1], cup: 240, tbsp: 15, tsp: 5 },
  { keys: ['cocoa powder', 'unsweetened cocoa', 'cacao powder', 'cocoa', 'cacao'], per100: [228, 20, 58, 33, 14], tbsp: 5, tsp: 1.7 },
  { keys: ['cacao nibs', 'cocoa nibs'], per100: [600, 13, 38, 30, 50], tbsp: 10 },
  { keys: ['sugar-free chocolate chips', 'sugar free chocolate chips', 'sugar-free dark chocolate', 'sugar-free chocolate', 'keto chocolate chips', 'stevia chocolate chips', 'lily\'s chocolate chips'], per100: [500, 5, 55, 10, 40], netCarbsPer100: 10, tbsp: 10 },
  { keys: ['dark chocolate', '85% dark chocolate', '90% dark chocolate', '70% dark chocolate', 'dark chocolate chips', 'dark chocolate (85%)'], per100: [598, 10, 35, 15, 48], piece: 10, tbsp: 10 },
  { keys: ['chocolate chips', 'milk chocolate', 'chocolate'], per100: [535, 8, 59, 3, 30], tbsp: 10, piece: 10 },
  { keys: ['erythritol', 'monk fruit sweetener', 'monkfruit sweetener', 'monk fruit', 'swerve', 'lakanto', 'besti', 'truvia', 'powdered erythritol', 'granulated sweetener', 'brown sugar substitute', 'sugar substitute', 'keto sweetener', 'low-carb sweetener', 'sweetener'], per100: [0, 0, 100, 0, 0], netCarbsPer100: 0, tsp: 4, tbsp: 12, cup: 200 },
  { keys: ['allulose'], per100: [20, 0, 100, 0, 0], netCarbsPer100: 0, tsp: 4, tbsp: 12, cup: 200 },
  { keys: ['xylitol'], per100: [240, 0, 100, 0, 0], netCarbsPer100: 40, tsp: 4, tbsp: 12 },
  { keys: ['maltitol'], per100: [210, 0, 100, 0, 0], netCarbsPer100: 50, tsp: 4, tbsp: 12 },
  { keys: ['stevia', 'liquid stevia', 'stevia drops', 'stevia extract', 'sucralose', 'liquid sweetener', 'sweetener drops'], per100: [0, 0, 0, 0, 0], negligible: true },
  { keys: ['honey', 'raw honey'], per100: [304, 0.3, 82, 0.2, 0], tsp: 7, tbsp: 21 },
  { keys: ['maple syrup', 'agave', 'agave syrup', 'golden syrup', 'corn syrup', 'syrup'], per100: [260, 0, 67, 0, 0], tsp: 7, tbsp: 20 },
  { keys: ['sugar-free syrup', 'sugar free syrup', 'sugar-free maple syrup', 'keto syrup'], per100: [10, 0, 3, 1, 0], netCarbsPer100: 1, tbsp: 15, tsp: 5 },
  { keys: ['sugar', 'brown sugar', 'coconut sugar', 'powdered sugar', 'icing sugar', 'caster sugar', 'cane sugar'], per100: [387, 0, 100, 0, 0], tsp: 4, tbsp: 12.5, cup: 200 },
  { keys: ['jam', 'jelly', 'marmalade', 'fruit preserves'], per100: [278, 0.4, 69, 1, 0.1], tbsp: 20 },
  { keys: ['vanilla protein powder', 'chocolate protein powder'], per100: [375, 75, 8, 0, 5], tbsp: 10 },
  { keys: ['heavy cream powder', 'cream powder'], per100: [500, 5, 30, 0, 40], tbsp: 8 },
  { keys: ['coconut butter', 'coconut manna'], per100: [660, 7, 24, 16, 65], tbsp: 16 },
  { keys: ['olive tapenade', 'tapenade'], per100: [230, 1.5, 6, 3, 22], tbsp: 15 },
  { keys: ['lemon zest', 'lime zest', 'orange zest', 'zest'], per100: [47, 1.5, 16, 10, 0.3], tsp: 2, tbsp: 6 },
  { keys: ['wine', 'white wine', 'red wine', 'dry white wine', 'cooking wine', 'sake', 'mirin', 'sherry', 'marsala', 'rice wine', 'shaoxing wine'], per100: [83, 0.1, 2.6, 0, 0], tbsp: 15, cup: 240 },
  { keys: ['beer'], per100: [43, 0.5, 3.6, 0, 0], cup: 240 },
  /* ---- seasonings and essentially calorie-free items ---- */
  {
    keys: [
      'salt', 'sea salt', 'kosher salt', 'flaky salt', 'black pepper', 'white pepper', 'pepper', 'cracked pepper', 'peppercorns', 'red pepper flakes', 'chili flakes', 'chilli flakes', 'pepper flakes',
      'cayenne', 'cayenne pepper', 'paprika', 'smoked paprika', 'cumin', 'ground cumin', 'cumin seeds', 'coriander', 'ground coriander', 'coriander seeds', 'turmeric', 'garam masala', 'curry powder', 'chili powder', 'chilli powder',
      'cinnamon', 'nutmeg', 'cardamom', 'cloves', 'allspice', 'star anise', 'fennel seeds', 'mustard seeds', 'caraway', 'caraway seeds', 'nigella seeds', 'fenugreek', 'fenugreek seeds', 'celery seed', 'celery seeds', 'poppy seeds',
      'bay leaf', 'bay leaves', 'thyme', 'rosemary', 'oregano', 'dried oregano', 'basil', 'fresh basil', 'dried basil', 'parsley', 'fresh parsley', 'cilantro', 'fresh cilantro', 'fresh coriander', 'coriander leaves', 'dill', 'fresh dill', 'chives', 'mint', 'fresh mint', 'sage', 'tarragon', 'marjoram', 'herbs', 'mixed herbs', 'italian seasoning', 'italian herbs', 'herbes de provence', 'za\'atar', 'zaatar', 'sumac', 'ras el hanout', 'baharat', 'everything bagel seasoning', 'taco seasoning', 'fajita seasoning', 'cajun seasoning', 'old bay', 'seasoning', 'spice mix', 'spices', 'spice blend', 'five spice', 'chinese five spice', 'curry leaves', 'kaffir lime leaves', 'lime leaves', 'lemongrass', 'saffron', 'vanilla', 'vanilla extract', 'almond extract', 'vanilla bean', 'peppermint extract',
      'garlic powder', 'onion powder', 'ginger powder', 'ground ginger', 'mustard powder', 'dry mustard', 'chipotle powder', 'ancho chili powder', 'chipotle in adobo', 'adobo', 'adobo seasoning', 'bouillon powder', 'stock cube', 'bouillon cube',
      'vinegar', 'apple cider vinegar', 'white vinegar', 'red wine vinegar', 'white wine vinegar', 'balsamic vinegar', 'balsamic', 'rice vinegar', 'sherry vinegar', 'malt vinegar', 'wasabi', 'liquid smoke',
      'water', 'ice', 'ice cubes', 'sparkling water', 'coffee', 'espresso', 'brewed coffee', 'instant coffee', 'tea', 'green tea', 'matcha', 'matcha powder', 'black tea',
      'baking powder', 'baking soda', 'bicarbonate of soda', 'xanthan gum', 'guar gum', 'cream of tartar', 'food coloring', 'food colouring', 'rose water', 'orange blossom water', 'lemon slices', 'lime wedges', 'lemon wedges', 'lime wedge', 'lemon wedge',
    ],
    per100: [0, 0, 0, 0, 0],
    negligible: true,
  },
];

/* --------------------------------- lookup --------------------------------- */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const keyRe = new Map<string, RegExp>();
function reFor(key: string): RegExp {
  let re = keyRe.get(key);
  if (!re) {
    re = new RegExp(`(^|[^a-z])${escape(key)}(es|s)?(?![a-z])`);
    keyRe.set(key, re);
  }
  return re;
}

/** Lowercase, accents folded, punctuation spaced out. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The reference food an ingredient name refers to: the longest matching key wins; real foods beat seasonings. */
export function findFood(name: string): Food | null {
  const n = normalizeName(name);
  let best: { food: Food; len: number } | null = null;
  let seasoning: { food: Food; len: number } | null = null;
  for (const food of FOODS) {
    for (const key of food.keys) {
      if (!reFor(key).test(n)) continue;
      const hit = { food, len: key.length };
      if (food.negligible) {
        if (!seasoning || key.length > seasoning.len) seasoning = hit;
      } else if (!best || key.length > best.len) best = hit;
    }
  }
  // "salt and pepper" is seasoning; "cracked pepper on the steak" is steak. Prefer the longer, more specific key.
  if (best && seasoning && seasoning.len > best.len) return seasoning.food;
  return best?.food ?? seasoning?.food ?? fuzzyFood(n);
}

/** One-letter slips in longer words ("aspargus", "brocolli") still match their food; short words never do. */
function fuzzyFood(normalized: string): Food | null {
  const tokens = normalized.split(' ').filter((t) => t.length >= 6);
  if (!tokens.length) return null;
  for (const food of FOODS) {
    if (food.negligible) continue;
    for (const key of food.keys) {
      if (key.includes(' ') || key.length < 6) continue;
      for (const token of tokens) {
        if (Math.abs(token.length - key.length) <= 1 && editDistance(token.replace(/(es|s)$/, ''), key.replace(/(es|s)$/, '')) <= 1) return food;
      }
    }
  }
  return null;
}

/** Levenshtein distance with transposition, capped at 2 (enough to test "<= 1"). */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  const prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  let prevPrev: number[] = [];
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prevPrev[j - 2] + 1);
      cur.push(v);
    }
    prevPrev = prev.slice();
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/** What to assume for an ingredient whose weight cannot be derived (a "piece" of something unknown). */
export const UNKNOWN_MASS_G = 40;

/** Grams for an ingredient line given its food (null when the unit cannot be converted for that food). */
export function gramsFor(ing: Pick<Ingredient, 'quantity' | 'unit'>, food: Food | null): number | null {
  const q = Number.isFinite(ing.quantity) && ing.quantity >= 0 ? ing.quantity : 0;
  const density = food?.density ?? 1;
  switch (ing.unit) {
    case 'g':
      return q;
    case 'ml':
      return q * density;
    case 'tbsp':
      return q * (food?.tbsp ?? 15 * density);
    case 'tsp':
      return q * (food?.tsp ?? (food?.tbsp ? food.tbsp / 3 : 5 * density));
    case 'cup':
      return q * (food?.cup ?? (food?.density ? 240 * density : 120));
    case 'piece':
      return food?.piece != null ? q * food.piece : null;
    case 'slice':
      return food?.slice != null ? q * food.slice : food?.piece != null ? q * food.piece : null;
    case 'clove':
      return q * 3;
    case 'pinch':
      return q * 0.3;
    case 'to taste':
      return 0;
    default:
      return null;
  }
}

/** Grams for an ingredient line, resolving the food from its name (null when unknown). */
export function ingredientGrams(ing: Ingredient): number | null {
  return gramsFor(ing, findFood(ing.name));
}

export interface Calculation {
  calories: number;
  protein: number;
  totalCarbs: number;
  fiber: number;
  netCarbs: number;
  fat: number;
  /** share of ingredient weight matched to reference data (0-1) */
  coverage: number;
  /** ingredient lines that added to the totals */
  recognized: number;
  /** ingredient names that could not be matched or weighed */
  unmatched: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Per-serving totals from the ingredient list. Seasonings count as recognised but weightless. */
export function calculateNutrition(ingredients: Ingredient[]): Calculation {
  let kcal = 0, p = 0, c = 0, fib = 0, net = 0, f = 0;
  let matchedMass = 0, unmatchedMass = 0, recognized = 0;
  const unmatched: string[] = [];
  for (const ing of ingredients) {
    const food = findFood(ing.name);
    const grams = gramsFor(ing, food);
    if (!food || grams === null) {
      // Weight it with the unit alone (or a default) so a big unknown item lowers the coverage honestly.
      const guess = gramsFor(ing, null) ?? UNKNOWN_MASS_G;
      unmatchedMass += Math.max(guess, ing.unit === 'to taste' || ing.unit === 'pinch' ? 0 : UNKNOWN_MASS_G / 2);
      unmatched.push(ing.name);
      continue;
    }
    recognized += 1;
    if (food.negligible) continue;
    matchedMass += grams;
    const [k, pp, cc, ff, fat] = food.per100;
    const share = grams / 100;
    kcal += k * share;
    p += pp * share;
    c += cc * share;
    fib += ff * share;
    f += fat * share;
    net += (food.netCarbsPer100 ?? Math.max(0, cc - ff)) * share;
  }
  const total = matchedMass + unmatchedMass;
  return {
    calories: Math.round(kcal),
    protein: round1(p),
    totalCarbs: round1(c),
    fiber: round1(fib),
    netCarbs: round1(net),
    fat: round1(f),
    coverage: total > 0 ? matchedMass / total : 0,
    recognized,
    unmatched,
  };
}

export interface NutritionEstimate {
  calories?: number;
  protein?: number;
  totalCarbs?: number;
  fiber?: number;
  fat?: number;
}

/** The model's figures are only acceptable when they are complete and internally consistent. */
export function plausibleEstimate(e: NutritionEstimate | null | undefined): Required<NutritionEstimate> | null {
  if (!e) return null;
  const vals = [e.calories, e.protein, e.totalCarbs, e.fiber, e.fat];
  if (vals.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0)) return null;
  const { calories, protein, totalCarbs, fiber, fat } = e as Required<NutritionEstimate>;
  if (fiber > totalCarbs) return null;
  const fromMacros = 4 * protein + 4 * (totalCarbs - fiber) + 9 * fat;
  if (fromMacros < 20 || Math.abs(calories - fromMacros) / Math.max(fromMacros, 1) > 0.35) return null;
  return { calories, protein, totalCarbs, fiber, fat };
}

/** Calculated figures when the ingredient list is well covered; the model's estimate (labelled) when it is not; nothing otherwise. */
export function resolveNutrition(ingredients: Ingredient[], estimate: NutritionEstimate | null | undefined): Nutrition {
  const calc = calculateNutrition(ingredients);
  if (calc.coverage >= 0.9 && calc.recognized >= 3 && calc.calories >= 40) {
    return { calories: calc.calories, protein: Math.round(calc.protein), totalCarbs: Math.round(calc.totalCarbs), fiber: Math.round(calc.fiber), netCarbs: Math.round(calc.netCarbs), fat: Math.round(calc.fat), status: 'calculated', coverage: calc.coverage };
  }
  const est = plausibleEstimate(estimate);
  if (est) {
    return { calories: Math.round(est.calories), protein: Math.round(est.protein), totalCarbs: Math.round(est.totalCarbs), fiber: Math.round(est.fiber), netCarbs: Math.round(Math.max(0, est.totalCarbs - est.fiber)), fat: Math.round(est.fat), status: 'estimated', coverage: calc.coverage };
  }
  return { calories: null, protein: null, totalCarbs: null, fiber: null, netCarbs: null, fat: null, status: 'not_calculated', coverage: calc.coverage };
}
