import {
  DURATIONS,
  durationMinutes,
  type Exercise,
  type Goal,
  type GuidedInput,
  type Intensity,
  type Location,
  type RoutineItem,
  type TargetArea,
  type WorkoutPlan,
  type WorkoutType,
} from './types';

/**
 * Deterministic workout engine. In the hub it is the fallback behind Gemini
 * (see aiWorkout.ts): if the model is unavailable or its plan fails the
 * checks, this builds a sound single session from an exercise library.
 *
 * It follows the same programming rules the prompt gives the model:
 * equipment fits the location, listed limitations are worked around, the
 * format is honest (a circuit is prescribed as rounds, not straight sets),
 * pushing is balanced with pulling, the session fits the time budget, and
 * no movement appears twice or in both the warm-up and the main work.
 */

/* ------------------------------ library ------------------------------ */

/** Minimum equipment a move needs: 0 bodyweight, 1 dumbbells, 2 full gym. */
type Equip = 0 | 1 | 2;
type Stress = 'knee' | 'back' | 'shoulder' | 'wrist' | 'jump';
type Pattern =
  | 'squat' | 'hinge' | 'lunge' | 'glute' | 'calf'
  | 'push' | 'press' | 'lateral' | 'row' | 'pulldown' | 'rear' | 'biceps' | 'triceps'
  | 'core' | 'rotation' | 'sidecore' | 'cond' | 'mobility';
/** How the work is counted: reps, reps per side, a timed hold, a timed effort, or a carry. */
type Kind = 'reps' | 'side' | 'hold' | 'time' | 'carry';

interface Move {
  name: string;
  pattern: Pattern;
  equip: Equip;
  cue: string;
  kind: Kind;
  stress: Stress[];
  mod?: string;
  /** Heavy multi-joint lift: gets the strength rep range and the long rest. */
  compound?: boolean;
  /** Mobility drills only: which end of the body they open up. */
  zone?: 'lower' | 'upper' | 'any';
}

const mv = (
  name: string,
  pattern: Pattern,
  equip: Equip,
  cue: string,
  opts: Partial<Pick<Move, 'kind' | 'stress' | 'mod' | 'compound' | 'zone'>> = {},
): Move => ({ name, pattern, equip, cue, kind: opts.kind ?? 'reps', stress: opts.stress ?? [], mod: opts.mod, compound: opts.compound, zone: opts.zone });

const MOVES: Move[] = [
  // squat
  mv('Barbell Back Squat', 'squat', 2, 'Brace, sit between the hips and drive the floor away.', { stress: ['knee', 'back'], compound: true, mod: 'Squat to a box at a comfortable depth.' }),
  mv('Leg Press', 'squat', 2, 'Feet mid-platform, lower under control, no snap at the top.', { stress: ['knee'], compound: true }),
  mv('Goblet Squat', 'squat', 1, 'Elbows inside the knees, chest tall, even foot pressure.', { stress: ['knee'], compound: true, mod: 'Goblet squat to a chair-height box.' }),
  mv('Goblet Box Squat', 'squat', 1, 'Sit back to the box, touch lightly and stand tall.', { compound: true }),
  mv('Bodyweight Squat', 'squat', 0, 'Sit back and down, knees tracking over the toes.', { stress: ['knee'], mod: 'Sit to a chair and stand.' }),
  mv('Chair Sit-to-Stand', 'squat', 0, 'Lean slightly forward and stand without using the hands.'),
  // hinge
  mv('Barbell Romanian Deadlift', 'hinge', 2, 'Push the hips back, bar close to the legs, flat back.', { stress: ['back'], compound: true, mod: 'Shorten the range to just below the knee.' }),
  mv('Trap Bar Deadlift', 'hinge', 2, 'Push the floor away and stand tall without leaning back.', { stress: ['back'], compound: true }),
  mv('Cable Pull-Through', 'hinge', 2, 'Hinge back, then squeeze the glutes to stand tall.'),
  mv('Dumbbell Romanian Deadlift', 'hinge', 1, 'Hinge from the hips with soft knees and a neutral spine.', { stress: ['back'], compound: true }),
  mv('Single-Leg Romanian Deadlift', 'hinge', 0, 'Reach the back heel long and keep the hips square.', { kind: 'side' }),
  mv('Bodyweight Good Morning', 'hinge', 0, 'Hands on the hips, push them back until the hamstrings load.'),
  // lunge
  mv('Bulgarian Split Squat', 'lunge', 1, 'Front foot flat, drop straight down, torso slightly forward.', { kind: 'side', stress: ['knee'] }),
  mv('Dumbbell Reverse Lunge', 'lunge', 1, 'Step back softly, front shin close to vertical.', { kind: 'side', stress: ['knee'], mod: 'Shorten the step and stay in a pain-free range.' }),
  mv('Reverse Lunge', 'lunge', 0, 'Step back softly and push through the front heel.', { kind: 'side', stress: ['knee'] }),
  mv('Low Step-Up', 'lunge', 0, 'Drive through the whole foot and control the way down.', { kind: 'side' }),
  // glute
  mv('Barbell Hip Thrust', 'glute', 2, 'Chin tucked, ribs down, pause at the top.', { compound: true }),
  mv('Cable Glute Kickback', 'glute', 2, 'Small range, squeeze at the top, no arching.', { kind: 'side' }),
  mv('Dumbbell Glute Bridge', 'glute', 1, 'Drive through the heels to a full hip lockout.'),
  mv('Glute Bridge', 'glute', 0, 'Drive through the heels and pause one second at the top.'),
  mv('Single-Leg Glute Bridge', 'glute', 0, 'Keep the hips level as you drive up.', { kind: 'side' }),
  mv('Side-Lying Hip Abduction', 'glute', 0, 'Lead with the heel and keep the torso still.', { kind: 'side' }),
  // calf
  mv('Seated Calf Raise', 'calf', 2, 'Full stretch at the bottom, pause at the top.'),
  mv('Dumbbell Calf Raise', 'calf', 1, 'Rise straight up, pause, lower slowly.'),
  mv('Standing Calf Raise', 'calf', 0, 'Full stretch at the bottom, pause at the top.'),
  // horizontal push
  mv('Barbell Bench Press', 'push', 2, 'Shoulder blades pinned, bar to mid-chest, press up.', { stress: ['shoulder'], compound: true }),
  mv('Machine Chest Press', 'push', 2, 'Handles at mid-chest height, control the return.', { compound: true }),
  mv('Incline Dumbbell Press', 'push', 2, 'Elbows under the wrists, press up and slightly in.', { compound: true }),
  mv('Dumbbell Floor Press', 'push', 1, 'Elbows about 45 degrees from the torso, pause on the floor.', { compound: true }),
  mv('Dumbbell Squeeze Press', 'push', 1, 'Press the dumbbells together the whole way up.'),
  mv('Push-Up', 'push', 0, 'Body in one line, chest between the hands.', { stress: ['wrist'], mod: 'Hands elevated on a bench or counter.' }),
  mv('Incline Push-Up', 'push', 0, 'Hands on a bench, body straight, chest to the edge.'),
  // vertical push
  mv('Barbell Overhead Press', 'press', 2, 'Squeeze the glutes and press up in a straight line.', { stress: ['shoulder', 'back'], compound: true }),
  mv('Landmine Press', 'press', 2, 'Press up and forward, reaching at the top.', { kind: 'side' }),
  mv('Seated Dumbbell Shoulder Press', 'press', 1, 'Ribs down, press up and slightly back.', { stress: ['shoulder'], compound: true, mod: 'Neutral grip in a pain-free range.' }),
  mv('Pike Push-Up', 'press', 0, 'Hips high, lower the head between the hands.', { stress: ['shoulder', 'wrist'], mod: 'Raise the hands on a bench.' }),
  // lateral delts
  mv('Cable Lateral Raise', 'lateral', 2, 'Lead with the elbow and stop at shoulder height.', { kind: 'side' }),
  mv('Dumbbell Lateral Raise', 'lateral', 1, 'Lead with the elbows and stop at shoulder height.'),
  mv('Prone Y Raise', 'lateral', 0, 'Thumbs up, lift from the shoulder blades, no shrug.'),
  // rows
  mv('Seated Cable Row', 'row', 2, 'Tall chest, pull to the lower ribs and pause.', { compound: true }),
  mv('Chest-Supported Dumbbell Row', 'row', 2, 'Chest on the pad, drive the elbows back.', { compound: true }),
  mv('Single-Arm Dumbbell Row', 'row', 1, 'Drive the elbow to the hip with square shoulders.', { kind: 'side', compound: true }),
  mv('Dumbbell Bent-Over Row', 'row', 1, 'Hinge and hold the torso still while you row.', { stress: ['back'], compound: true }),
  mv('Inverted Row Under a Sturdy Table', 'row', 0, 'Body straight, pull the chest to the edge.'),
  mv('Towel Row on a Door', 'row', 0, 'Lean back and pull the elbows past the ribs.'),
  // vertical pull
  mv('Lat Pulldown', 'pulldown', 2, 'Pull the elbows to the back pockets without leaning back.', { compound: true }),
  mv('Assisted Pull-Up', 'pulldown', 2, 'Start from a dead hang and pull the chest up.', { compound: true }),
  mv('Dumbbell Pullover', 'pulldown', 1, 'Ribs down, reach long overhead, pull with the lats.', { stress: ['shoulder'] }),
  mv('Prone Swimmer Pull', 'pulldown', 0, 'Lift the chest slightly and pull the elbows to the ribs.'),
  // rear delts and upper back
  mv('Face Pull', 'rear', 2, 'Pull to the eyebrows with high elbows and rotate out.'),
  mv('Dumbbell Reverse Fly', 'rear', 1, 'Hinge forward and open wide with soft elbows.'),
  mv('Prone T Raise', 'rear', 0, 'Thumbs up, squeeze the shoulder blades together.'),
  // arms
  mv('Cable Curl', 'biceps', 2, 'Elbows pinned to the sides, squeeze at the top.'),
  mv('Dumbbell Curl', 'biceps', 1, 'No swinging, turn the palms up as you lift.'),
  mv('Hammer Curl', 'biceps', 1, 'Thumbs up, elbows still, lower slowly.'),
  mv('Towel Isometric Curl', 'biceps', 0, 'Stand on the towel and pull up hard against it.', { kind: 'hold' }),
  mv('Cable Triceps Pushdown', 'triceps', 2, 'Elbows at the sides, lock out fully.'),
  mv('Dumbbell Skull Crusher', 'triceps', 1, 'Upper arms still, lower to beside the ears.'),
  mv('Dumbbell Triceps Kickback', 'triceps', 1, 'Upper arm parallel to the floor, straighten fully.'),
  mv('Close-Grip Push-Up', 'triceps', 0, 'Hands under the shoulders, elbows brushing the ribs.', { stress: ['wrist'], mod: 'Hands elevated on a bench.' }),
  mv('Bench Dip', 'triceps', 0, 'Shoulders down, bend the elbows to 90 degrees.', { stress: ['shoulder', 'wrist'] }),
  // trunk
  mv('Cable Crunch', 'core', 2, 'Curl the ribs toward the pelvis, hips still.', { stress: ['back'] }),
  mv('Dead Bug', 'core', 0, 'Ribs down, lower back heavy on the floor.', { kind: 'side' }),
  mv('Forearm Plank', 'core', 0, 'Squeeze the glutes and push the floor away.', { kind: 'hold' }),
  mv('Bird Dog', 'core', 0, 'Reach long without letting the hips rotate.', { kind: 'side' }),
  mv('Pallof Press', 'rotation', 2, 'Press straight out and resist the pull sideways.', { kind: 'side' }),
  mv('Dumbbell Russian Twist', 'rotation', 1, 'Turn from the ribs, not the arms.', { stress: ['back'] }),
  mv('Half-Kneeling Dumbbell Chop', 'rotation', 1, 'Move the weight across the body with a still pelvis.', { kind: 'side' }),
  mv('Bicycle Crunch', 'rotation', 0, 'Slow turns, elbow toward the opposite knee.', { stress: ['back'] }),
  mv('Standing Cross-Body Knee Drive', 'rotation', 0, 'Stand tall and bring the knee to the opposite elbow.', { kind: 'side' }),
  mv('Farmer Carry', 'sidecore', 2, 'Walk tall with the shoulders level.', { kind: 'carry' }),
  mv('Suitcase Carry', 'sidecore', 1, 'Stand tall and do not lean toward the weight.', { kind: 'carry' }),
  mv('Side Plank', 'sidecore', 0, 'Straight line from head to heels, hips high.', { kind: 'hold' }),
  // conditioning
  mv('Rowing Machine Interval', 'cond', 2, 'Legs, then hips, then arms, with a smooth return.', { kind: 'time' }),
  mv('Air Bike Sprint', 'cond', 2, 'Drive with the legs and arms together.', { kind: 'time' }),
  mv('Dumbbell Thruster', 'cond', 1, 'Squat, then use the legs to drive the press.', { stress: ['knee', 'shoulder'] }),
  mv('Dumbbell Swing', 'cond', 1, 'Snap the hips and let the weight float to chest height.', { stress: ['back'] }),
  mv('Squat Jump', 'cond', 0, 'Land softly through the whole foot.', { stress: ['jump', 'knee'] }),
  mv('High Knees', 'cond', 0, 'Quick feet, tall posture, fast arms.', { kind: 'time', stress: ['jump', 'knee'] }),
  mv('Mountain Climber', 'cond', 0, 'Hips level, drive the knees forward quickly.', { kind: 'time', stress: ['wrist'] }),
  mv('Fast Step-Up', 'cond', 0, 'Quick, light steps on a low step.', { kind: 'time' }),
  mv('Shadow Boxing', 'cond', 0, 'Stay light on the feet and punch from the hips.', { kind: 'time' }),
  mv('Power March', 'cond', 0, 'March on the spot with high knees and fast arms.', { kind: 'time' }),
  // mobility and recovery drills
  mv('90/90 Hip Switch', 'mobility', 0, 'Rotate from the hips and sit tall in each position.', { zone: 'lower', stress: ['knee'] }),
  mv('Half-Kneeling Hip Flexor Stretch', 'mobility', 0, 'Tuck the pelvis and squeeze the back glute.', { kind: 'side', zone: 'lower', stress: ['knee'] }),
  mv('Supine Hamstring Floss', 'mobility', 0, 'Hold the thigh and straighten the knee slowly.', { kind: 'side', zone: 'lower' }),
  mv('Standing Hip Circle', 'mobility', 0, 'Draw the biggest circle you can with the knee.', { kind: 'side', zone: 'lower' }),
  mv('Wall Ankle Mobilisation', 'mobility', 0, 'Knee to the wall with the heel flat.', { kind: 'side', zone: 'lower' }),
  mv('Deep Squat Hold', 'mobility', 0, 'Hold a support and let the hips sink.', { kind: 'hold', zone: 'lower', stress: ['knee'] }),
  mv('Thread the Needle', 'mobility', 0, 'Reach under and through, then open to the ceiling.', { kind: 'side', zone: 'upper', stress: ['wrist'] }),
  mv('Side-Lying Thoracic Rotation', 'mobility', 0, 'Keep the knees stacked and follow the hand with the eyes.', { kind: 'side', zone: 'upper' }),
  mv('Wall Slide', 'mobility', 0, 'Forearms on the wall, slide up in a pain-free range.', { zone: 'upper' }),
  mv('Shoulder Controlled Rotation', 'mobility', 0, 'Slow, full circles with the ribs still.', { kind: 'side', zone: 'upper' }),
  mv('Doorway Pec Stretch', 'mobility', 0, 'Elbow at shoulder height, turn gently away.', { kind: 'hold', zone: 'upper', stress: ['shoulder'] }),
  mv('Segmental Cat-Cow', 'mobility', 0, 'Move one segment of the spine at a time.', { zone: 'any', stress: ['wrist'] }),
  mv('Supine Knee Rock', 'mobility', 0, 'Knees together, rock side to side with the shoulders down.', { zone: 'any' }),
  mv('Crocodile Breathing', 'mobility', 0, 'Face down, breathe into the belly and lower back.', { kind: 'hold', zone: 'any' }),
  mv('Standing Side Bend Reach', 'mobility', 0, 'Reach up and over without twisting.', { kind: 'side', zone: 'any' }),
];

type Zone = 'lower' | 'upper' | 'any';
interface Routine { name: string; duration: string; zone: Zone; stress: Stress[]; notes: string }
const rt = (name: string, duration: string, zone: Zone, notes: string, stress: Stress[] = []): Routine => ({ name, duration, zone, stress, notes });

const WARMUPS: Routine[] = [
  rt('Brisk Walk or Easy March', '2 min', 'any', 'Build to a light sweat with easy nose breathing.'),
  rt('Hip Circles', '1 min', 'lower', 'Big, slow circles in each direction.'),
  rt('Leg Swings', '1 min/side', 'lower', 'Hold a wall and swing front to back under control.'),
  rt('Ankle Rocks', '1 min', 'lower', 'Let the knee travel over the toes with the heel down.'),
  rt('Standing Knee Hug', '1 min', 'lower', 'Tall posture, alternate sides.'),
  rt('Arm Circles', '1 min', 'upper', 'Small to large, both directions.'),
  rt('Shoulder Blade Squeeze', '1 min', 'upper', 'Pull the shoulder blades back and down, pause, release.'),
  rt('Open Book Rotation', '1 min/side', 'upper', 'Lie on one side and open the top arm across the body.'),
  rt('Torso Rotation', '1 min', 'any', 'Feet planted, turn from the ribs.'),
  rt('Inchworm', '1 min', 'any', 'Walk the hands out to a plank and back.', ['wrist', 'back']),
];

const COOLDOWNS: Routine[] = [
  rt('Easy Walk', '2 min', 'any', 'Bring the heart rate down gradually.'),
  rt('Supine Hamstring Stretch', '45s/side', 'lower', 'Leg up with a soft knee, breathe out to ease further.'),
  rt('Side-Lying Quad Stretch', '45s/side', 'lower', 'Heel toward the glute, only to a comfortable range.'),
  rt('Standing Hip Flexor Stretch', '45s/side', 'lower', 'Tuck the pelvis and squeeze the back glute.'),
  rt('Supine Figure-4 Stretch', '45s/side', 'lower', 'Draw the legs in until the outer hip stretches.'),
  rt('Standing Calf Stretch', '30s/side', 'lower', 'Back heel down with a straight knee.'),
  rt('Doorway Chest Stretch', '45s/side', 'upper', 'Elbow at shoulder height, turn gently away.', ['shoulder']),
  rt('Cross-Body Shoulder Stretch', '30s/side', 'upper', 'Keep the shoulder down, away from the ear.'),
  rt('Wall Lat Stretch', '45s/side', 'upper', 'Hips back, arm long, breathe into the ribs.'),
  rt("Child's Pose", '1 min', 'any', 'Breathe into the lower back.', ['knee']),
  rt('Supine Spinal Twist', '45s/side', 'any', 'Let the knees fall to one side with both shoulders down.', ['back']),
  rt('Box Breathing', '2 min', 'any', 'In for 4, hold 4, out for 4, hold 4.'),
];

/* ------------------------------ planning ------------------------------ */

const AREA_PLAN: Record<TargetArea, Pattern[]> = {
  'Full Body': ['squat', 'row', 'hinge', 'push', 'core', 'lunge', 'pulldown', 'press', 'glute', 'sidecore'],
  'Upper Body': ['push', 'row', 'press', 'pulldown', 'lateral', 'rear', 'biceps', 'triceps', 'core'],
  'Lower Body': ['squat', 'hinge', 'lunge', 'glute', 'core', 'calf', 'sidecore', 'glute'],
  Legs: ['squat', 'lunge', 'hinge', 'calf', 'core', 'glute', 'sidecore', 'squat'],
  Core: ['core', 'rotation', 'sidecore', 'glute', 'core', 'rotation', 'hinge', 'sidecore'],
  Glutes: ['glute', 'hinge', 'lunge', 'glute', 'core', 'squat', 'sidecore', 'glute'],
  Chest: ['push', 'row', 'push', 'pulldown', 'triceps', 'rear', 'core', 'push'],
  Back: ['row', 'pulldown', 'row', 'rear', 'hinge', 'biceps', 'core', 'pulldown'],
  Shoulders: ['press', 'row', 'lateral', 'rear', 'push', 'pulldown', 'core', 'lateral'],
  Arms: ['biceps', 'triceps', 'biceps', 'triceps', 'row', 'push', 'core', 'rear'],
};

/** Where to look when a pattern has no suitable move for this client. */
const ALTERNATES: Partial<Record<Pattern, Pattern[]>> = {
  squat: ['glute', 'hinge'],
  lunge: ['glute', 'hinge'],
  hinge: ['glute'],
  press: ['lateral', 'push'],
  push: ['triceps', 'lateral'],
  pulldown: ['row', 'rear'],
  row: ['pulldown', 'rear'],
  rotation: ['core', 'sidecore'],
  cond: ['core'],
  triceps: ['push'],
  biceps: ['row'],
};

const UPPER_AREAS: TargetArea[] = ['Upper Body', 'Chest', 'Back', 'Shoulders', 'Arms'];
const LOWER_AREAS: TargetArea[] = ['Lower Body', 'Legs', 'Glutes'];
const TIMED_TYPES: WorkoutType[] = ['HIIT', 'Circuit', 'Tabata', 'EMOM', 'AMRAP', 'Sport-Specific Conditioning'];
const FLOW_TYPES: WorkoutType[] = ['Mobility', 'Recovery'];

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
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

function shuffled<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Letters only, for comparing two movement names. */
export function exerciseKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

/** What the notes, the age and the intensity say to work around. */
export function limitationsFrom(notes: string, age: number, intensity: Intensity): Set<Stress> {
  const n = notes.toLowerCase();
  const out = new Set<Stress>();
  if (/knee|patell|acl|meniscus/.test(n)) out.add('knee');
  if (/\bback\b|spine|spinal|\bdisc\b|herniat|sciatic|lumbar/.test(n)) out.add('back');
  if (/shoulder|rotator|impingement/.test(n)) out.add('shoulder');
  if (/wrist|carpal/.test(n)) out.add('wrist');
  if (/jump|impact|plyo/.test(n) || out.has('knee') || age >= 60 || intensity === 'Low') out.add('jump');
  return out;
}

function equipmentFor(location: Location, notes: string): Equip {
  const n = notes.toLowerCase();
  if (/no equipment|bodyweight only|body weight only|without equipment/.test(n)) return 0;
  const base: Equip = location === 'Gym' ? 2 : location === 'Outdoor' || location === 'No Equipment' ? 0 : 1;
  if (base === 0 && /dumbbell|kettlebell/.test(n)) return 1;
  return base;
}

const EQUIPMENT_LINE: Record<Equip, string> = {
  0: 'Equipment: none, just floor space and a sturdy chair or step.',
  1: 'Equipment: a pair of dumbbells and a mat.',
  2: 'Equipment: a fully equipped gym (barbell, cables, machines, dumbbells).',
};

type Scheme = 'strength' | 'hypertrophy' | 'fatloss' | 'endurance' | 'general';

function schemeFor(goal: Goal, type: WorkoutType): Scheme {
  if (type === 'Strength') return goal === 'Muscle Building' ? 'hypertrophy' : goal === 'Fat Loss' ? 'fatloss' : goal === 'Endurance' ? 'endurance' : 'strength';
  if (type === 'Hypertrophy') return 'hypertrophy';
  if (goal === 'Strength') return 'strength';
  if (goal === 'Muscle Building') return 'hypertrophy';
  if (goal === 'Fat Loss') return 'fatloss';
  if (goal === 'Endurance') return 'endurance';
  return 'general';
}

interface Context {
  input: GuidedInput;
  equip: Equip;
  avoid: Set<Stress>;
  rng: () => number;
  gentle: boolean;
  budgetMin: number;
}

/** Moves for a pattern this client can do, best-equipped first, shuffled within a level. */
function candidates(pattern: Pattern, ctx: Context): Move[] {
  const usable = MOVES.filter((m) => m.pattern === pattern && m.equip <= ctx.equip && !m.stress.some((s) => ctx.avoid.has(s)));
  const out: Move[] = [];
  for (const level of [2, 1, 0] as Equip[]) out.push(...shuffled(usable.filter((m) => m.equip === level), ctx.rng));
  return out;
}

function pickMoves(patterns: Pattern[], count: number, ctx: Context): Move[] {
  const picked: Move[] = [];
  const used = new Set<string>();
  const take = (pattern: Pattern): boolean => {
    const move = candidates(pattern, ctx).find((m) => !used.has(m.name));
    if (!move) return false;
    used.add(move.name);
    picked.push(move);
    return true;
  };
  for (const pattern of patterns) {
    if (picked.length >= count) break;
    if (take(pattern)) continue;
    for (const alt of ALTERNATES[pattern] ?? []) if (take(alt)) break;
  }
  // Short on moves (tight limitations): fill from trunk and glute work, which suits nearly everyone.
  for (const pattern of ['core', 'glute', 'sidecore', 'rear', 'calf'] as Pattern[]) {
    while (picked.length < count && take(pattern)) { /* keep taking */ }
  }
  return picked;
}

const WARM_MIN = (d: number) => (d <= 20 ? 4 : d <= 45 ? 6 : 8);
const COOL_MIN = (d: number) => (d <= 20 ? 2 : d <= 30 ? 3 : 5);

/* --------------------------- straight sets --------------------------- */

const SCHEMES: Record<Scheme, { reps: string; compoundReps: string; rest: number; compoundRest: number; hold: string; rpe: string; tempo?: string; label: string }> = {
  strength: { reps: '8-10', compoundReps: '5-6', rest: 90, compoundRest: 150, hold: '30-45s hold', rpe: 'RPE 7-8: leave 2 reps in reserve.', label: 'Strength session' },
  hypertrophy: { reps: '10-12', compoundReps: '8-10', rest: 75, compoundRest: 90, hold: '30-45s hold', rpe: 'RPE 8-9: finish with 1-2 reps in reserve.', tempo: '3-1-1', label: 'Hypertrophy session' },
  fatloss: { reps: '12-15', compoundReps: '12-15', rest: 45, compoundRest: 60, hold: '30s hold', rpe: 'RPE 7: steady pace, 2-3 reps in reserve.', label: 'Strength-based session for fat loss' },
  endurance: { reps: '15-20', compoundReps: '15-20', rest: 30, compoundRest: 45, hold: '45s hold', rpe: 'RPE 6-7: smooth and repeatable.', label: 'Muscular endurance session' },
  general: { reps: '10-12', compoundReps: '8-10', rest: 60, compoundRest: 90, hold: '30s hold', rpe: 'RPE 7: leave 2-3 reps in reserve.', label: 'General strength session' },
};

const restLabel = (sec: number) => (sec >= 150 ? '2-3 min' : sec >= 120 ? '2 min' : `${sec}s`);

function straightSets(ctx: Context): { rows: Exercise[]; format: string; scheme: Scheme } {
  const { input } = ctx;
  const scheme = schemeFor(input.goal, input.workoutType);
  const spec = SCHEMES[scheme];
  const short = input.durationMin <= 20;
  const sets = ctx.gentle ? 2 : input.intensity === 'High' ? 4 : 3;
  let count = input.durationMin <= 15 ? 3 : input.durationMin <= 20 ? 4 : input.durationMin <= 30 ? 5 : input.durationMin <= 45 ? 6 : input.durationMin <= 60 ? 7 : 8;
  const minCount = input.durationMin <= 15 ? 2 : 3;

  const isHeavy = (m: Move) => Boolean(m.compound) && m.equip >= 1 && scheme !== 'fatloss' && scheme !== 'endurance';
  // Heavy lifts need long rest; in a very short session the rest is trimmed and the reps go up a little.
  let restCap = short ? 90 : Infinity;
  const restOf = (m: Move) => Math.min(restCap, isHeavy(m) ? spec.compoundRest : spec.rest);
  const setsOf = (m: Move, base: number) => (isHeavy(m) ? base : Math.max(2, Math.min(base, 3)));
  // A heavy low-rep set takes about 30s, everything else about 40s; 10% on top for transitions.
  const minutes = (moves: Move[], base: number) =>
    moves.reduce((sum, m) => sum + (setsOf(m, base) * ((restOf(m) >= 150 ? 30 : 40) + restOf(m))) / 60, 0) * 1.1;

  let moves = pickMoves(AREA_PLAN[input.targetArea], count, ctx);
  let base = sets;
  // Fit the clock: trim a fourth set first, then exercises, then sets, and only then go below the usual exercise count.
  const softMin = input.durationMin >= 60 ? 5 : input.durationMin >= 45 ? 4 : minCount;
  while (minutes(moves, base) > ctx.budgetMin) {
    if (base > 3) base -= 1;
    else if (moves.length > softMin) moves = moves.slice(0, --count);
    else if (base > 2) base -= 1;
    else if (moves.length > minCount) moves = moves.slice(0, --count);
    else if (restCap > 60) restCap = Math.min(restCap, 90) - 15; // last resort in a very short session: shorter rest
    else break;
  }

  const rows = moves.map<Exercise>((m) => {
    const heavy = isHeavy(m);
    const range = heavy ? (short && scheme === 'strength' ? '6-8' : spec.compoundReps) : spec.reps;
    const reps =
      m.kind === 'hold' ? (ctx.gentle ? '20-30s hold' : spec.hold)
      : m.kind === 'carry' ? '30-40m carry'
      : m.kind === 'time' ? '30s hard effort'
      : m.kind === 'side' ? `${range}/side`
      : range;
    const counted = m.kind === 'reps' || m.kind === 'side';
    const effort = !counted ? 'Stop when form slips.' : ctx.gentle ? 'Stop with about 3 good reps left.' : m.equip === 0 && scheme !== 'endurance' ? `Slow the lowering to 3 seconds. ${spec.rpe}` : spec.rpe;
    return {
      exercise: m.name,
      sets: String(setsOf(m, base)),
      reps,
      rest: restLabel(restOf(m)),
      ...(spec.tempo && counted ? { tempo: spec.tempo } : {}),
      notes: `${m.cue} ${effort}`,
      ...(m.mod ? { modification: m.mod } : {}),
    };
  });
  const heavy = moves.filter(isHeavy);
  const light = moves.filter((m) => !isHeavy(m));
  const describe = (group: Move[]) => `${setsOf(group[0], base)} sets with ${restLabel(restOf(group[0]))} rest`;
  const format =
    heavy.length && light.length ? `${spec.label}: straight sets. Main lifts ${describe(heavy)}, the other exercises ${describe(light)}.`
    : `${spec.label}: straight sets. Every exercise ${describe(heavy.length ? heavy : light)}.`;
  return { rows, format, scheme };
}

/* ------------------------ rounds, intervals, flows ------------------------ */

function timedPatterns(area: TargetArea): Pattern[] {
  const base = AREA_PLAN[area];
  // Lead with a conditioning piece and drop one in every third slot.
  const out: Pattern[] = [];
  base.forEach((p, i) => {
    if (i % 3 === 0) out.push('cond');
    out.push(p);
  });
  return out;
}

const repsFor = (m: Move, gentle: boolean): string =>
  m.kind === 'hold' ? '30s hold' : m.kind === 'carry' ? '30s carry' : m.kind === 'time' ? '30s fast' : m.kind === 'side' ? (gentle ? '6/side' : '8/side') : gentle ? '8 reps' : m.compound ? '8 reps' : '10 reps';

function timedSession(ctx: Context): { rows: Exercise[]; format: string } {
  const { input, budgetMin: budget } = ctx;
  const type = input.workoutType;
  const gentle = ctx.gentle;
  const patterns = timedPatterns(input.targetArea);
  const cue = (m: Move) => `${m.cue}${m.kind === 'side' ? ' Switch sides halfway through each effort.' : m.kind === 'time' ? '' : ' Keep every rep clean as you tire.'}`;
  const row = (m: Move, sets: string, reps: string, rest: string): Exercise => ({ exercise: m.name, sets, reps, rest, notes: cue(m), ...(m.mod ? { modification: m.mod } : {}) });

  if (type === 'Tabata') {
    const n = Math.max(2, Math.min(8, Math.floor(budget / 5)));
    const moves = pickMoves(patterns, n, ctx);
    return {
      rows: moves.map((m) => row(m, '8 rounds', '20s work', '10s')),
      format: `Tabata: ${moves.length} blocks. Each block is 8 rounds of 20s work / 10s rest on one exercise, with 60s between blocks.`,
    };
  }
  if (type === 'EMOM') {
    const n = budget >= 45 ? 6 : budget >= 30 ? 5 : budget >= 12 ? 4 : 3;
    const moves = pickMoves(patterns, n, ctx);
    const rounds = Math.max(2, Math.min(10, Math.floor(budget / moves.length)));
    return {
      rows: moves.map((m) => row(m, `${rounds} rounds`, repsFor(m, gentle), 'rest of the minute')),
      format: `EMOM ${rounds * moves.length}: one exercise at the top of each minute, in order, ${rounds} times through. Finish the reps, then rest until the next minute starts.`,
    };
  }
  if (type === 'AMRAP') {
    const blocks = budget > 40 ? 3 : budget > 22 ? 2 : 1;
    const window = Math.max(6, Math.min(20, Math.floor((budget - 3 * (blocks - 1)) / blocks)));
    const moves = pickMoves(patterns, window >= 15 ? 5 : 4, ctx);
    return {
      rows: moves.map((m) => row(m, `AMRAP ${window} min`, repsFor(m, gentle), 'only as needed')),
      format: `AMRAP: ${blocks === 1 ? `one ${window}-minute window` : `${blocks} windows of ${window} minutes with 3 min rest between them`}. Cycle through the exercises in order for as many quality rounds as possible.`,
    };
  }
  // Circuit, HIIT and sport conditioning: stations for time.
  const [work, rest] =
    type === 'HIIT' ? (gentle ? [20, 40] : input.intensity === 'High' ? [40, 20] : [30, 30])
    : type === 'Sport-Specific Conditioning' ? (gentle ? [20, 40] : [30, 30])
    : gentle ? [30, 30] : input.intensity === 'High' ? [45, 15] : [40, 20];
  let n = input.durationMin <= 20 ? 4 : input.durationMin <= 30 ? 5 : input.durationMin <= 60 ? 6 : input.durationMin <= 75 ? 7 : 8;
  const roundMin = (k: number) => (k * (work + rest)) / 60 + 1;
  while (n > 3 && Math.floor(budget / roundMin(n)) < 2) n -= 1;
  const moves = pickMoves(patterns, n, ctx);
  const rounds = Math.max(2, Math.min(6, Math.floor(budget / roundMin(moves.length))));
  const label = type === 'HIIT' ? 'HIIT intervals' : type === 'Sport-Specific Conditioning' ? 'Conditioning circuit' : 'Circuit';
  return {
    rows: moves.map((m) => row(m, `${rounds} rounds`, `${work}s work`, `${rest}s`)),
    format: `${label}: ${rounds} rounds of all ${moves.length} exercises in order, ${work}s work / ${rest}s rest per station, 60s between rounds.`,
  };
}

function flowSession(ctx: Context): { rows: Exercise[]; format: string } {
  const { input, budgetMin: budget } = ctx;
  const zone: Zone = UPPER_AREAS.includes(input.targetArea) ? 'upper' : LOWER_AREAS.includes(input.targetArea) ? 'lower' : 'any';
  const usable = MOVES.filter((m) => m.pattern === 'mobility' && !m.stress.some((s) => ctx.avoid.has(s)));
  const ordered = [
    ...shuffled(usable.filter((m) => zone !== 'any' && m.zone === zone), ctx.rng),
    ...shuffled(usable.filter((m) => m.zone === 'any'), ctx.rng),
    ...shuffled(usable.filter((m) => m.zone !== 'any' && m.zone !== zone), ctx.rng),
  ];
  const want = input.durationMin <= 15 ? 4 : input.durationMin <= 20 ? 5 : input.durationMin <= 30 ? 6 : input.durationMin <= 45 ? 7 : 8;
  const moves = (zone === 'any' ? shuffled(usable, ctx.rng) : ordered).slice(0, want);
  const rounds = Math.max(1, Math.min(4, Math.floor(budget / (moves.length * 1.25))));
  const recovery = input.workoutType === 'Recovery';
  return {
    rows: moves.map((m) => ({
      exercise: m.name,
      sets: `${rounds} ${rounds === 1 ? 'round' : 'rounds'}`,
      reps: m.kind === 'hold' ? '45s hold' : m.kind === 'side' ? '8 slow reps/side' : '10 slow reps',
      rest: '15s',
      notes: `${m.cue} Breathe out as you move into the stretch.`,
    })),
    format: `${recovery ? 'Recovery flow' : 'Mobility flow'}: ${rounds} ${rounds === 1 ? 'round' : 'rounds'} of ${moves.length} drills in order, slow controlled reps and 45s holds, 15s to change position. Effort stays easy throughout.`,
  };
}

/* ----------------------------- bookends ----------------------------- */

function pickRoutine(list: Routine[], count: number, lead: string | null, last: string | null, ctx: Context, taken: Set<string>): RoutineItem[] {
  const area = ctx.input.targetArea;
  const zone: Zone = UPPER_AREAS.includes(area) ? 'upper' : LOWER_AREAS.includes(area) ? 'lower' : 'any';
  const ok = list.filter((r) => !r.stress.some((s) => ctx.avoid.has(s)) && !taken.has(exerciseKey(r.name)));
  const fixed = [lead, last].filter((n): n is string => Boolean(n));
  const pool = ok.filter((r) => !fixed.includes(r.name));
  const matching = shuffled(pool.filter((r) => zone === 'any' ? true : r.zone === zone), ctx.rng);
  const others = shuffled(pool.filter((r) => zone !== 'any' && r.zone !== zone), ctx.rng);
  // A full-body session gets a drill for each end of the body.
  const mixed = zone === 'any'
    ? [...matching.filter((r) => r.zone === 'lower').slice(0, 1), ...matching.filter((r) => r.zone === 'upper').slice(0, 1), ...matching.filter((r) => r.zone === 'any'), ...matching]
    : [...matching, ...others];
  const chosen: Routine[] = [];
  const add = (r: Routine | undefined) => {
    if (r && !chosen.includes(r)) chosen.push(r);
  };
  add(ok.find((r) => r.name === lead));
  const middle = count - (last && ok.some((r) => r.name === last) ? 1 : 0);
  for (const r of mixed) {
    if (chosen.length >= middle) break;
    add(r);
  }
  add(ok.find((r) => r.name === last));
  return chosen.map((r) => ({ movement: r.name, duration: r.duration, notes: r.notes }));
}

/* ------------------------------ copy ------------------------------ */

const LOCATION_PHRASE: Record<Location, string> = {
  Gym: 'a fully equipped gym',
  Home: 'home training',
  Outdoor: 'an outdoor space',
  Hotel: 'a hotel room or small hotel gym',
  'No Equipment': 'training with no equipment',
  'Limited Equipment': 'limited equipment',
};

const LIMITATION_LINE: Record<Stress, string> = {
  knee: 'Knee: lower-body work stays in a pain-free range with no jumping or deep loaded knee bend.',
  back: 'Back: loaded forward bending and twisting are left out; keep a neutral spine throughout.',
  shoulder: 'Shoulder: heavy overhead pressing is left out; stay below any pinching range.',
  wrist: 'Wrist: weight-bearing on the hands is kept off the plan; use fists or handles if needed.',
  jump: '',
};

function weeklySplit(input: GuidedInput, flow: boolean, timed: boolean): string {
  if (flow) return 'Use this 2-4 times per week, on rest days or after training. It supports the main program and does not replace it.';
  const area = input.targetArea;
  if (area === 'Core') return 'Add this to 2-3 full-body or split sessions per week. Core-only work is not a complete program.';
  if (UPPER_AREAS.includes(area)) return 'Pair this with a lower-body day so the whole body is trained: upper, lower, rest, upper, lower across the week.';
  if (LOWER_AREAS.includes(area)) return 'Pair this with an upper-body day so the whole body is trained: lower, upper, rest, lower, upper across the week.';
  if (timed) return 'Run this 3 times per week on non-consecutive days, with easy walking on the days between.';
  return 'Run this 3 times per week on non-consecutive days. Alternate it (day A, squat first) with a day B that leads with the hinge.';
}

function progression(scheme: Scheme | null, flow: boolean, timed: boolean, gentle: boolean): string {
  const ramp = gentle ? 'Weeks 1-2 stay at 2 sets, weeks 3-4 build to 3. ' : '';
  if (flow) return 'Add 10-15 seconds per hold or one extra round every 2 weeks. Range should feel easier, never forced.';
  if (timed) return `${gentle ? 'Hold the rounds steady for 2 weeks. ' : ''}Add one round in week 2 or 3, then lengthen the work by 5 seconds while the rest stays the same.`;
  if (scheme === 'strength') return `${ramp}Add load in the smallest jump available once every set reaches the top of the rep range with clean form.`;
  if (scheme === 'hypertrophy') return `${ramp}Add reps within the range first, then load. From week 3 add one set to the first two exercises or slow the lowering to 3-4 seconds.`;
  return `${ramp}Add 1-2 reps per set each week for 3 weeks, then raise the load by about 5-10% and return to the lower end of the range.`;
}

function trainerNotes(ctx: Context, scheme: Scheme | null, flow: boolean, timed: boolean): string {
  const { input, avoid, equip } = ctx;
  const parts: string[] = [];
  parts.push(flow ? 'Breathing: slow breaths, exhale into each stretch.' : timed ? 'Breathing: keep it rhythmic and never hold the breath during work intervals.' : 'Breathing: inhale on the way down, exhale on the effort.');
  for (const s of ['knee', 'back', 'shoulder', 'wrist'] as Stress[]) if (avoid.has(s)) parts.push(LIMITATION_LINE[s]);
  if (ctx.gentle && !flow) parts.push('Intensity: the client should be able to speak in short sentences during the work.');
  if (input.goal === 'Fat Loss') parts.push('Fat loss is driven mainly by a calorie deficit from nutrition and daily steps; this session supports it.');
  if (scheme === 'hypertrophy' && equip === 0) parts.push('Bodyweight-only muscle gain plateaus without added load, so progress to harder variations, slower tempo and pauses early.');
  if (input.age < 16) parts.push('For a young client, keep the focus on technique and enjoyment, not load.');
  return parts.join(' ');
}

/* ------------------------------ engine ------------------------------ */

export function generateWorkout(input: GuidedInput, variant = 0): WorkoutPlan {
  const seed = hashString(JSON.stringify([input.clientName.toLowerCase(), input.goal, input.location, input.intensity, input.workoutType, input.durationMin, input.age, input.targetArea, input.notes.toLowerCase()])) ^ hashString(`variant-${variant}`);
  const avoid = limitationsFrom(input.notes, input.age, input.intensity);
  const ctx: Context = {
    input,
    equip: equipmentFor(input.location, input.notes),
    avoid,
    rng: mulberry32(seed),
    gentle: input.intensity === 'Low' || input.age >= 60 || input.age < 16,
    budgetMin: input.durationMin - WARM_MIN(input.durationMin) - COOL_MIN(input.durationMin),
  };
  const flow = FLOW_TYPES.includes(input.workoutType);
  const timed = TIMED_TYPES.includes(input.workoutType);

  let rows: Exercise[];
  let format: string;
  let scheme: Scheme | null = null;
  if (flow) ({ rows, format } = flowSession(ctx));
  else if (timed) ({ rows, format } = timedSession(ctx));
  else ({ rows, format, scheme } = straightSets(ctx));

  const taken = new Set(rows.map((r) => exerciseKey(r.exercise)));
  const d = input.durationMin;
  const warmup = pickRoutine(WARMUPS, d <= 20 ? 3 : d >= 60 ? 5 : 4, 'Brisk Walk or Easy March', null, ctx, taken);
  const cooldown = pickRoutine(COOLDOWNS, d <= 20 ? 2 : d <= 30 ? 3 : 4, timed ? 'Easy Walk' : null, d > 20 ? 'Box Breathing' : null, ctx, taken);

  const limits = (['knee', 'back', 'shoulder', 'wrist'] as Stress[]).filter((s) => avoid.has(s));
  const typeLabel = /^(HIIT|EMOM|AMRAP|Tabata)$/.test(input.workoutType) ? input.workoutType : input.workoutType.toLowerCase();
  const purpose = input.workoutType.toLowerCase() === input.goal.toLowerCase() ? '' : ` for ${input.goal.toLowerCase()}`;
  const goalSummary = [
    `A ${d}-minute ${input.intensity.toLowerCase()}-intensity ${typeLabel} session${purpose}, focused on the ${input.targetArea.toLowerCase()} and built for ${LOCATION_PHRASE[input.location]}.`,
    EQUIPMENT_LINE[ctx.equip],
    limits.length ? `Movements are chosen to work around the ${limits.join(' and ')}.` : '',
  ].filter(Boolean).join(' ');

  return {
    clientName: input.clientName,
    goal: input.goal,
    duration: `${d} minutes`,
    trainingFormat: format,
    goalSummary,
    warmup,
    mainWorkout: rows,
    cooldown,
    progression: progression(scheme, flow, timed, ctx.gentle),
    weeklySplitRecommendation: weeklySplit(input, flow, timed),
    trainerNotes: trainerNotes(ctx, scheme, flow, timed),
  };
}

/* --------------------------- chat fallback --------------------------- */

const pickFirst = <T extends string>(text: string, table: [RegExp, T][], fallback: T): T => table.find(([re]) => re.test(text))?.[1] ?? fallback;

/**
 * Reads the programming variables out of a free-text description, for the
 * case where Gemini is unavailable. Anything not stated gets a sensible
 * default; the full text is kept as the notes so limitations still apply.
 */
export function parseChatPrompt(text: string): GuidedInput {
  const t = text.toLowerCase();
  const goal = pickFirst<Goal>(t, [
    [/fat loss|weight loss|lose weight|lean|burn/, 'Fat Loss'],
    [/hypertrophy|muscle|build|mass|bulk/, 'Muscle Building'],
    [/strength|strong|powerlift/, 'Strength'],
    [/endurance|stamina|marathon|cardio/, 'Endurance'],
    [/mobility|flexib|stretch/, 'Mobility'],
    [/conditioning|hiit|tabata|metcon|emom|amrap/, 'Conditioning'],
    [/sport|athlete|football|soccer|tennis|basketball/, 'Sport-Specific'],
  ], 'General Fitness');
  const typeDefault: Record<Goal, WorkoutType> = { 'Fat Loss': 'Circuit', 'Muscle Building': 'Hypertrophy', Strength: 'Strength', Endurance: 'Circuit', Mobility: 'Mobility', Conditioning: 'HIIT', 'Sport-Specific': 'Sport-Specific Conditioning', 'General Fitness': 'Strength' };
  const workoutType = pickFirst<WorkoutType>(t, [
    [/tabata/, 'Tabata'], [/emom/, 'EMOM'], [/amrap/, 'AMRAP'], [/hiit|interval/, 'HIIT'], [/circuit/, 'Circuit'],
    [/hypertrophy/, 'Hypertrophy'], [/recovery|deload/, 'Recovery'], [/mobility|flexib|stretch/, 'Mobility'], [/strength/, 'Strength'],
  ], typeDefault[goal]);
  const location = pickFirst<Location>(t, [
    [/no equipment|bodyweight|body weight/, 'No Equipment'], [/hotel|travel/, 'Hotel'], [/outdoor|park|outside/, 'Outdoor'],
    [/\bhome\b|living room|garage/, 'Home'], [/dumbbell|kettlebell|band|limited/, 'Limited Equipment'], [/gym|barbell|machine/, 'Gym'],
  ], 'Gym');
  const intensity = pickFirst<Intensity>(t, [[/beginner|novice|gentle|easy|low[- ]intensity|deconditioned|senior/, 'Low'], [/advanced|intense|high[- ]intensity|hard|athlete/, 'High']], 'Moderate');
  const targetArea = pickFirst<TargetArea>(t, [
    [/upper[- ]body/, 'Upper Body'], [/lower[- ]body/, 'Lower Body'], [/glute/, 'Glutes'], [/chest/, 'Chest'], [/\bback\b(?! pain)/, 'Back'],
    [/shoulder(?! pain)/, 'Shoulders'], [/\barms?\b|biceps|triceps/, 'Arms'], [/\blegs?\b/, 'Legs'], [/\bcore\b|\babs\b/, 'Core'],
  ], 'Full Body');
  const minutes = Number(/(\d{2,3})\s*-?\s*min/.exec(t)?.[1] ?? 45);
  const durationMin = DURATIONS.map(durationMinutes).reduce((best, d) => (Math.abs(d - minutes) < Math.abs(best - minutes) ? d : best), 45);
  const ageMatch = Number(/(\d{2})\s*-?\s*(?:year|yr|yo\b)/.exec(t)?.[1] ?? 30);
  const age = ageMatch >= 10 && ageMatch <= 99 ? ageMatch : 30;
  return { clientName: '', goal, location, intensity, workoutType, durationMin, age, targetArea, notes: text.trim() };
}
