export const BUSINESS_TYPES = [
  'Personal Trainer',
  'Gym Owner',
  'Boutique Studio Owner',
  'Online Fitness Coach',
  'Group Fitness Instructor',
  'Yoga/Pilates Instructor',
  'CrossFit Coach',
  'Nutrition Coach',
  'Fitness Influencer',
  'Specialized Coach (Martial Arts, Boxing, etc.)',
] as const;

export const TARGET_AUDIENCES = [
  'Busy Parents',
  'Young Professionals',
  'Seniors (55+)',
  'Athletes',
  'Beginners',
  'Women Only',
  'General Population',
] as const;

export const SPECIALIZATIONS = [
  'Weight Loss',
  'Muscle Building',
  'Athletic Performance',
  'Senior Fitness',
  "Women's Health",
  'Youth Training',
  'Injury Recovery',
  'Nutrition Coaching',
  'Mental Health & Fitness',
  'Functional Movement',
] as const;

export const TONES = [
  'Professional & Credible',
  'Motivational & Energetic',
  'Friendly & Approachable',
  'Scientific & Educational',
] as const;

/** Tone dropdown: Auto infers the best fit from the other inputs. */
export const TONE_OPTIONS = ['Auto (based on your input)', ...TONES] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];
export type TargetAudience = (typeof TARGET_AUDIENCES)[number];
export type Specialization = (typeof SPECIALIZATIONS)[number];
export type Tone = (typeof TONES)[number];
export type ToneOption = (typeof TONE_OPTIONS)[number];

export interface BioInput {
  /** Name or business name. */
  name: string;
  businessType: BusinessType | null;
  yearsExperience: string;
  location: string;
  specializations: Specialization[];
  targetAudience: TargetAudience | null;
  uniqueSellingPoint: string;
  tone: ToneOption | null;
}

export interface BioFormState extends BioInput {
  email: string;
}

export interface GeneratedBio {
  text: string;
  charCount: number;
}

export interface BioResult {
  bios: GeneratedBio[];
  /** The tone actually used (Auto resolved). */
  tone: Tone;
}

export const MAX_BIO_CHARS = 150;
