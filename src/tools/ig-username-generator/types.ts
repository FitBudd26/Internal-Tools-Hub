export const FITNESS_NICHES = [
  'Weight Loss',
  'Fat Loss',
  'Muscle Building',
  'Strength Training',
  'Yoga',
  'Pilates',
  'CrossFit',
  'Mobility',
  'Nutrition',
  'Athletic Performance',
  "Women's Fitness",
  'Senior Fitness',
  'Functional Training',
] as const;

export const TRAINER_TYPES = [
  'Personal Trainer',
  'Online Coach',
  'Gym Owner',
  'Fitness Influencer',
  'Yoga Coach',
  'Pilates Instructor',
  'CrossFit Coach',
  'Nutrition Coach',
  'Strength Coach',
  'Group Fitness Instructor',
] as const;

export const TONE_STYLES = ['Professional', 'Trendy', 'Playful', 'Minimalist', 'Unique'] as const;

export type FitnessNiche = (typeof FITNESS_NICHES)[number];
export type TrainerType = (typeof TRAINER_TYPES)[number];
export type ToneStyle = (typeof TONE_STYLES)[number];

export interface UsernameInput {
  fullName: string;
  niches: FitnessNiche[];
  trainerTypes: TrainerType[];
  tones: ToneStyle[];
  keyword: string;
}

export interface UsernameFormState extends UsernameInput {
  email: string;
}

export interface UsernameResult {
  usernames: string[];
}

/** Handle rules the original tool enforced: short, brandable, no numbers, at most one separator. */
export const HANDLE_MAX_LEN = 18;
export const HANDLE_MIN_LEN = 3;
export const RESULT_COUNT = 10;
