import { exerciseKey, generateWorkout, limitationsFrom, mainBudgetMinutes, parseChatPrompt } from './generateWorkout';
import type { Exercise, GuidedInput, RoutineItem, WorkoutPlan, WorkoutRequest } from './types';

/**
 * Gemini-first workout plans with a guaranteed answer. The shared route asks
 * Gemini for the session in a fixed schema; the answer is checked here
 * (complete rows, no header rows, no repeated movements, no warm-up drill
 * reused as a working exercise, no jumping or contraindicated stretches
 * for a client who cannot do them, a session that fits the clock, tidy
 * tempo and names, no dashes, the client's own name and goal) and anything
 * that fails falls back to the built-in engine, in whole or, for a thin
 * warm-up or cool-down, in part.
 */

export type GenerationSource = 'ai' | 'local';
export interface WorkoutGeneration { plan: WorkoutPlan; source: GenerationSource }

/** Just above the route's own 26s upstream limit, so the route answers first. */
const REQUEST_TIMEOUT_MS = 29_000;
const MIN_EXERCISES = 3;
const MAX_EXERCISES = 10;
const FAT_LOSS_NOTE = 'Fat loss is driven mainly by a calorie deficit from nutrition and daily steps; this session supports it.';

/** Plain hyphens only, single spaces, no list numbering carried over from the model. */
const tidy = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().slice(0, max).trim() : '';

/** "C1: Push-Up", "A2 - Row" and "Minute 3: Row" compare as "Push-Up" and "Row". */
const baseKey = (name: string): string => exerciseKey(name.replace(/^[A-Za-z]+\s?\d{0,2}\s*:\s+/, '').replace(/^[A-Za-z]{1,2}\d{1,2}\s*[-.)]\s+/, ''));

const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'over', 'per', 'the', 'to', 'under', 'with']);
/** "seated dumbbell press" reads "Seated Dumbbell Press"; words already capitalised (RDL, EMOM) are left alone. */
export const titleCase = (name: string): string =>
  name
    .split(' ')
    .map((word, i) =>
      word
        .split('-')
        .map((part, j) => ((i > 0 || j > 0) && SMALL_WORDS.has(part) ? part : part.replace(/^[a-z]/, (c) => c.toUpperCase())))
        .join('-'),
    )
    .join(' ');

/** Lifting tempo as digits ("3-1-1"); nothing for timed work or for words such as "Fast". */
function tempoOf(raw: unknown, reps: string): string {
  const t = tidy(raw, 24).replace(/\s/g, '');
  if (/\d\s*s\b|sec|work|hold|min/i.test(reps)) return '';
  if (/^\d{3,4}$/.test(t)) return t.split('').join('-');
  return /^\d(-\d){2,3}$/.test(t) ? t : '';
}

/** High-impact work, for clients who cannot jump. */
const IMPACT = /jump|burpee|plyo|\bhops?\b|high knees|plank jack/i;
/** Stretches and positions that load a listed knee or lower back. */
const KNEE_LOADING = /child'?s? pose|hero pose|deep squat|couch stretch|pigeon|standing quad|kneeling quad/i;
const BACK_LOADING = /forward fold|toe[- ]touch|sit and reach|seated hamstring|standing hamstring/i;
const HEADER_ROW = /^(circuit|block|round|superset|part|section|set|warm[- ]?up|cool[- ]?down|finisher)\s*[a-z0-9]{0,2}\s*:?$/i;
const NO_NAME = /^(client|the client|n\/?a|none|unknown|not given|anonymous)$/i;

function routine(v: unknown): RoutineItem[] {
  if (!Array.isArray(v)) return [];
  const out: RoutineItem[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    const o = (x ?? {}) as Record<string, unknown>;
    const movement = titleCase(tidy(o.movement, 80));
    const duration = tidy(o.duration, 40);
    const notes = tidy(o.notes, 200);
    const key = exerciseKey(movement);
    if (!movement || !duration || seen.has(key)) continue;
    seen.add(key);
    out.push({ movement, duration, ...(notes ? { notes } : {}) });
    if (out.length >= 6) break;
  }
  return out;
}

function exercises(v: unknown): Exercise[] {
  if (!Array.isArray(v)) return [];
  const out: Exercise[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    const o = (x ?? {}) as Record<string, unknown>;
    const exercise = titleCase(tidy(o.exercise, 100).replace(/^\d+[.)]\s+/, ''));
    const sets = tidy(o.sets, 30);
    const reps = tidy(o.reps, 40);
    const rest = tidy(o.rest, 40);
    const key = baseKey(exercise);
    // Header rows ("Circuit 1") and half-filled rows would render as broken numbered items.
    if (!exercise || !sets || !reps || !rest || !key || HEADER_ROW.test(exercise) || seen.has(key)) continue;
    seen.add(key);
    const tempo = tempoOf(o.tempo, reps);
    const notes = tidy(o.notes, 260);
    const modification = tidy(o.modification, 220);
    out.push({ exercise, sets, reps, rest, ...(tempo ? { tempo } : {}), notes, ...(modification && !/^(n\/?a|none|-)$/i.test(modification) ? { modification } : {}) });
    if (out.length >= MAX_EXERCISES) break;
  }
  // In a circuit the rest between rounds belongs to the format, not to the last station.
  const rounds = out.length >= 3 && out.every((e) => /rounds?$/i.test(e.sets));
  if (rounds && new Set(out.slice(0, -1).map((e) => e.rest)).size === 1) out[out.length - 1].rest = out[0].rest;
  // One circuit needs no label: drop a word prefix that every row shares ("Circuit: ...").
  const shared = /^([A-Za-z][A-Za-z ]{1,14}):\s+/.exec(out[0]?.exercise ?? '')?.[0];
  if (shared && out.length > 1 && out.every((e) => e.exercise.startsWith(shared) && e.exercise.length > shared.length)) {
    for (const e of out) e.exercise = titleCase(e.exercise.slice(shared.length));
  }
  return out;
}

const seconds = (text: string, fallback: number): number => {
  const nums = (text.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  if (!nums.length) return fallback;
  const value = nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0];
  return /min/i.test(text) ? value * 60 : value;
};

/** Minutes of main work for straight sets, or null when the rows are rounds, intervals or otherwise not countable. */
export function straightSetMinutes(rows: Exercise[]): number | null {
  let total = 0;
  for (const r of rows) {
    const sets = /^(\d+)(\s*sets?)?$/i.exec(r.sets.trim());
    if (!sets) return null;
    const timed = /\d\s*s\b|sec|min/i.test(r.reps);
    const top = Math.max(...(r.reps.match(/\d+/g) ?? ['10']).map(Number));
    const work = timed ? seconds(r.reps, 40) : top <= 6 ? 30 : 40;
    total += (Number(sets[1]) * (work + seconds(r.rest, 60))) / 60;
  }
  return total * 1.1;
}

/**
 * The model tends to over-program. When straight sets clearly overshoot the
 * main-work budget, a fourth set goes first, then the last exercises (never
 * below four), and in a short session a third set from the end backwards.
 */
export function fitToBudget(rows: Exercise[], budgetMin: number): Exercise[] {
  const over = (list: Exercise[]) => {
    const minutes = straightSetMinutes(list);
    return minutes !== null && minutes > budgetMin * 1.1;
  };
  if (!over(rows)) return rows;
  let out = rows.map((r) => (/^[4-9](\s*sets?)?$/i.test(r.sets.trim()) ? { ...r, sets: r.sets.trim().replace(/^\d/, '3') } : r));
  while (over(out) && out.length > 4) out = out.slice(0, -1);
  for (let i = out.length - 1; i >= 0 && over(out); i--) {
    if (/^3(\s*sets?)?$/i.test(out[i].sets.trim())) out[i] = { ...out[i], sets: out[i].sets.trim().replace(/^3/, '2') };
  }
  return out;
}

/** Sentences about how the plan was produced ("no client name was provided") are not coaching notes. */
const META_NOTE = /client name|no name|from the prompt|from the description|as instructed|the instructions|default profile|was (explicitly )?(set|provided|given|specified)|were (not )?(provided|given|specified)/i;
export const coachingOnly = (notes: string): string =>
  (notes.match(/[^.!?]+[.!?]*/g) ?? [notes])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !META_NOTE.test(sentence))
    .join(' ');

/** The model's plan made safe to show, or null when it is not usable. */
export function cleanPlan(raw: unknown, request: WorkoutRequest, base: GuidedInput, local: WorkoutPlan): WorkoutPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const guided = request.mode === 'guided';
  const avoid = limitationsFrom(base.notes, base.age, base.intensity);
  const minutes = guided ? base.durationMin : Number(/\d+/.exec(tidy(o.duration, 40))?.[0] ?? base.durationMin);

  // No jumping for a client who cannot jump, then make the session fit the clock.
  let mainWorkout = exercises(o.mainWorkout);
  if (avoid.has('jump')) mainWorkout = mainWorkout.filter((e) => !IMPACT.test(e.exercise));
  if (mainWorkout.length < MIN_EXERCISES) return null;
  mainWorkout = fitToBudget(mainWorkout, mainBudgetMinutes(minutes >= 10 && minutes <= 120 ? minutes : base.durationMin));

  const working = new Set(mainWorkout.map((e) => baseKey(e.exercise)));
  const suitable = (items: RoutineItem[]) =>
    items.filter(
      (i) =>
        !working.has(exerciseKey(i.movement)) &&
        !(avoid.has('jump') && IMPACT.test(i.movement)) &&
        !(avoid.has('knee') && KNEE_LOADING.test(i.movement)) &&
        !(avoid.has('back') && BACK_LOADING.test(i.movement)),
    );
  // A thin warm-up or cool-down is topped up from the engine, which already respects the limitations.
  const topUp = (items: RoutineItem[], spare: RoutineItem[]) => {
    const out = [...items];
    for (const extra of suitable(spare)) {
      if (out.length >= 4) break;
      if (!out.some((i) => exerciseKey(i.movement) === exerciseKey(extra.movement))) out.push(extra);
    }
    return out;
  };
  let warmup = suitable(routine(o.warmup));
  let cooldown = suitable(routine(o.cooldown));
  if (warmup.length < 2) warmup = topUp(warmup, local.warmup);
  if (cooldown.length < 2) cooldown = topUp(cooldown, local.cooldown);
  if (warmup.length < 2 || cooldown.length < 2) return null;

  const aiName = tidy(o.clientName, 80);
  const goal = guided ? base.goal : tidy(o.goal, 60) || base.goal;
  let trainerNotes = coachingOnly(tidy(o.trainerNotes, 700)) || local.trainerNotes;
  if (/fat loss|weight loss/i.test(goal) && !/deficit|nutrition/i.test(trainerNotes)) trainerNotes = `${trainerNotes} ${FAT_LOSS_NOTE}`.trim();

  return {
    clientName: guided ? base.clientName : NO_NAME.test(aiName) ? '' : aiName,
    goal,
    duration: guided ? `${base.durationMin} minutes` : tidy(o.duration, 40) || `${base.durationMin} minutes`,
    trainingFormat: tidy(o.trainingFormat, 360) || local.trainingFormat,
    goalSummary: tidy(o.goalSummary, 460) || local.goalSummary,
    warmup,
    mainWorkout,
    cooldown,
    progression: tidy(o.progression, 460) || local.progression,
    weeklySplitRecommendation: tidy(o.weeklySplitRecommendation, 460) || local.weeklySplitRecommendation,
    trainerNotes,
  };
}

export async function generateWorkoutWithAi(request: WorkoutRequest, variant = 0, avoid: string[] = []): Promise<WorkoutGeneration> {
  const base = request.mode === 'guided' ? request.input : parseChatPrompt(request.prompt);
  const local = generateWorkout(base, variant);
  const raw = await fetchAi(request, variant, avoid);
  const plan = raw ? cleanPlan(raw, request, base, local) : null;
  return plan ? { plan, source: 'ai' } : { plan: local, source: 'local' };
}

async function fetchAi(request: WorkoutRequest, variant: number, avoid: string[]): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        tool: 'workout',
        ...(request.mode === 'guided' ? { mode: 'guided', ...request.input } : { mode: 'chat', prompt: request.prompt.trim().slice(0, 600) }),
        variant,
        avoid: avoid.slice(0, 12),
      }),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return null;
    const data = (await res.json()) as { plan?: unknown };
    return data.plan ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
