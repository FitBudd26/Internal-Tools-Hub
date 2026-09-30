export const GOALS = ['Fat Loss', 'Muscle Building', 'Strength', 'Endurance', 'Mobility', 'Conditioning', 'Sport-Specific', 'General Fitness'] as const;
export const LOCATIONS = ['Gym', 'Home', 'Outdoor', 'Hotel', 'No Equipment', 'Limited Equipment'] as const;
export const INTENSITIES = ['Low', 'Moderate', 'High'] as const;
export const WORKOUT_TYPES = ['Strength', 'Hypertrophy', 'HIIT', 'Circuit', 'Mobility', 'Recovery', 'Tabata', 'EMOM', 'AMRAP', 'Sport-Specific Conditioning'] as const;
export const DURATIONS = ['15 min', '20 min', '30 min', '45 min', '60 min', '75 min', '90 min'] as const;
export const TARGET_AREAS = ['Full Body', 'Upper Body', 'Lower Body', 'Core', 'Glutes', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs'] as const;
/** The options of the HubSpot dropdown "are_you_a_fitness_professional", value for value. */
export const PROFESSIONS = ['Fitness Coach', 'Personal Trainer', 'Just for Myself', 'Influencer/Creator'] as const;

export type Goal = (typeof GOALS)[number];
export type Location = (typeof LOCATIONS)[number];
export type Intensity = (typeof INTENSITIES)[number];
export type WorkoutType = (typeof WORKOUT_TYPES)[number];
export type DurationLabel = (typeof DURATIONS)[number];
export type TargetArea = (typeof TARGET_AREAS)[number];
export type Profession = (typeof PROFESSIONS)[number];
export type InputMode = 'guided' | 'chat';

export const AGE_MIN = 10;
export const AGE_MAX = 99;
export const CHAT_MIN_LEN = 10;
export const CHAT_MAX_LEN = 600;
export const NOTES_MAX_LEN = 500;

/** The guided form as the user fills it in. */
export interface GuidedFormState {
  clientName: string;
  goal: Goal | null;
  location: Location | null;
  intensity: Intensity | null;
  workoutType: WorkoutType | null;
  duration: DurationLabel | null;
  age: string;
  targetArea: TargetArea | null;
  notes: string;
}

/** A complete, validated guided request. */
export interface GuidedInput {
  clientName: string;
  goal: Goal;
  location: Location;
  intensity: Intensity;
  workoutType: WorkoutType;
  durationMin: number;
  age: number;
  targetArea: TargetArea;
  notes: string;
}

export type WorkoutRequest = { mode: 'guided'; input: GuidedInput } | { mode: 'chat'; prompt: string };

export interface RoutineItem {
  movement: string;
  duration: string;
  notes?: string;
}

export interface Exercise {
  exercise: string;
  sets: string;
  reps: string;
  rest: string;
  tempo?: string;
  notes: string;
  modification?: string;
}

export interface WorkoutPlan {
  clientName: string;
  goal: string;
  duration: string;
  trainingFormat: string;
  goalSummary: string;
  warmup: RoutineItem[];
  mainWorkout: Exercise[];
  cooldown: RoutineItem[];
  progression: string;
  weeklySplitRecommendation: string;
  trainerNotes: string;
}

export const SAMPLE_FORM: GuidedFormState = {
  clientName: 'Alex Morgan',
  goal: 'Fat Loss',
  location: 'Home',
  intensity: 'Moderate',
  workoutType: 'Circuit',
  duration: '45 min',
  age: '35',
  targetArea: 'Full Body',
  notes: 'Mild left knee discomfort on deep squats. Only dumbbells and a yoga mat. Prefers no jumping.',
};

export const CHAT_EXAMPLES = [
  '45-min fat loss workout for a 35-year-old beginner at home with knee pain and only dumbbells.',
  '60-min hypertrophy upper-body session for a 28-year-old intermediate at a commercial gym.',
  '20-min Tabata conditioning for a 40-year-old at a hotel with no equipment.',
] as const;

export function durationMinutes(label: DurationLabel): number {
  return parseInt(label, 10);
}

/** The guided form as a request, or null while anything required is missing or out of range. */
export function toGuidedInput(form: GuidedFormState): GuidedInput | null {
  const age = Number(form.age);
  if (!form.clientName.trim() || !form.goal || !form.location || !form.intensity || !form.workoutType || !form.duration || !form.targetArea) return null;
  if (!/^\d{1,2}$/.test(form.age.trim()) || age < AGE_MIN || age > AGE_MAX) return null;
  return {
    clientName: form.clientName.trim(),
    goal: form.goal,
    location: form.location,
    intensity: form.intensity,
    workoutType: form.workoutType,
    durationMin: durationMinutes(form.duration),
    age,
    targetArea: form.targetArea,
    notes: form.notes.trim(),
  };
}
