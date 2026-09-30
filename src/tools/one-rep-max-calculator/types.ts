export const EXERCISES = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Other'] as const;
export const REP_OPTIONS = ['1 rep', '2 reps', '3 reps', '4 reps', '5 reps', '6 reps', '7 reps', '8 reps', '9 reps', '10 reps', '11 reps', '12 reps', '15 reps'] as const;
export const UNITS = ['lbs', 'kg'] as const;
export const GOALS = ['Strength', 'Muscle Building', 'Endurance', 'General Fitness'] as const;

export type Exercise = (typeof EXERCISES)[number];
export type RepOption = (typeof REP_OPTIONS)[number];
export type Unit = (typeof UNITS)[number];
export type Goal = (typeof GOALS)[number];

export const WEIGHT_MIN = 1;
export const WEIGHT_MAX = 9999;
export const repsValue = (option: RepOption): number => parseInt(option, 10);

/** A complete, validated calculation request. */
export interface OneRmInput {
  exercise: Exercise;
  weight: number;
  reps: number;
  unit: Unit;
  /** Optional: shapes the training guidance, not the estimate. */
  goal: Goal | null;
}

/** The form as the user fills it in. */
export interface OneRmFormState {
  exercise: Exercise | null;
  weight: string;
  reps: RepOption | null;
  unit: Unit;
  goal: Goal | null;
  email: string;
}

export type FormulaKey = 'epley' | 'brzycki' | 'lombardi' | 'mayhew' | 'oconner' | 'wathan';
export type FormulaResults = Record<FormulaKey, number>;

export interface TrainingZone {
  pct: number;
  weight: number;
  reps: string;
  zone: string;
  /** The two rows coaches program from most. */
  key: boolean;
}

/** Everything the formulas give: never written by the model. */
export interface OneRmResult {
  input: OneRmInput;
  /** The headline estimate (Epley). */
  oneRm: number;
  formulas: FormulaResults;
  average: number;
  high: number;
  low: number;
  /** One rep lifted: the weight is the max, nothing is estimated. */
  alreadyMax: boolean;
  chart: TrainingZone[];
}

export interface WarmupStep {
  percent: number;
  reps: number;
}

export interface PlanWeek {
  week: number;
  focus: string;
  sets: number;
  reps: string;
  percent: number;
  note: string;
}

/** The coaching layer: written by Gemini (or the built-in copy) in percentages; the tool turns them into weights. */
export interface Guidance {
  summary: string;
  warmup: WarmupStep[];
  plan: PlanWeek[];
  tips: string[];
}

/** The form as a request, or null while anything required is missing or out of range. */
export function toOneRmInput(form: OneRmFormState): OneRmInput | null {
  const weight = Number(form.weight);
  if (!form.exercise || !form.reps || !/^\d{1,4}(\.\d)?$/.test(form.weight.trim()) || !(weight >= WEIGHT_MIN && weight <= WEIGHT_MAX)) return null;
  return { exercise: form.exercise, weight, reps: repsValue(form.reps), unit: form.unit, goal: form.goal };
}
