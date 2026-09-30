export const GYM_TYPES = [
  'Traditional Gym',
  'CrossFit Box',
  'HYROX Training Gym',
  'Boutique Fitness Studio',
  'Strength & Powerlifting',
  'Yoga Studio',
  'Pilates Studio',
  'MMA & Boxing',
  'Functional Training',
  'Calisthenics Training Gym',
  'Personal Training Studio',
  'Wellness & Recovery',
  'Women’s Fitness Studio',
  'Sports Performance',
] as const;

export const AUDIENCES = [
  'Everyone / General Fitness',
  'Serious Athletes',
  'Women',
  'Busy Professionals',
  'Beginners',
  'Seniors & Active Aging',
  'Youth & Teens',
  'Bodybuilders',
  'Combat Sports Athletes',
  'Families & Community',
] as const;

export const TONE_STYLES = ['Professional', 'Trendy', 'Playful', 'Minimalist', 'Unique'] as const;

export type GymType = (typeof GYM_TYPES)[number];
export type Audience = (typeof AUDIENCES)[number];
export type Tone = (typeof TONE_STYLES)[number];

export interface GymNameInput {
  fullName: string;
  gymTypes: GymType[];
  audiences: Audience[];
  tones: Tone[];
  keyword: string;
}

export interface GymNameFormState extends GymNameInput {
  email: string;
}

export interface GymNameResult {
  names: string[];
}

/** Name rules, shared by the engine and the check on model output. */
export const NAME_MIN_LEN = 4;
export const NAME_MAX_LEN = 24;
export const NAME_MAX_WORDS = 4;
export const RESULT_COUNT = 10;
