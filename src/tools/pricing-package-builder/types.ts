export const COACHING_FORMATS = ['1:1 Online', '1:1 In-Person', 'Hybrid', 'Group', '1:1 + Group'] as const;
export const NICHES = [
  'General Fitness',
  'Weight Loss/Fat Loss',
  'Strength & Powerlifting',
  'Bodybuilding/Physique',
  'Sports Performance',
  "Women's Fitness/Pre-Post Natal",
  'Yoga/Mobility',
  'Functional Fitness/CrossFit',
  'Senior Fitness',
  'Youth/Athletic Development',
  'Rehab/Corrective Exercise',
  'Other',
] as const;
export const EXPERIENCE_LEVELS = ['Less than 1 year', '1-3 years', '3+ years'] as const;
export const SERVICES = [
  'Workout Programs',
  'Nutrition Plans',
  'Video Calls',
  'Form Check',
  'Weekly Check-Ins',
  'Messaging Support',
  'Progress Tracking',
  'Habit Coaching',
  'Group Challenges',
  'Supplement Guidance',
] as const;
export const PROGRAM_DURATIONS = ['4 weeks', '8 weeks', '12 weeks', 'Ongoing monthly'] as const;
export const INCOME_GOALS = ['$3,000', '$5,000', '$8,000', '$10,000', '$15,000+'] as const;
export const HOURS_OPTIONS = ['10 hours', '20 hours', '30 hours', '40 hours'] as const;

export type CoachingFormat = (typeof COACHING_FORMATS)[number];
export type Niche = (typeof NICHES)[number];
export type Experience = (typeof EXPERIENCE_LEVELS)[number];
export type Service = (typeof SERVICES)[number];
export type ProgramDuration = (typeof PROGRAM_DURATIONS)[number];
export type IncomeGoal = (typeof INCOME_GOALS)[number];
export type HoursOption = (typeof HOURS_OPTIONS)[number];
export type Tier = 'starter' | 'core' | 'premium';

export const TIERS: Tier[] = ['starter', 'core', 'premium'];
export const TIER_LABEL: Record<Tier, string> = { starter: 'Starter', core: 'Core', premium: 'Premium' };
export const MAX_CLIENTS_MIN = 5;
export const MAX_CLIENTS_MAX = 100;
export const MAX_CLIENTS_DEFAULT = 20;

/** A complete request: everything the pricing maths and the package copy need. */
export interface PricingInput {
  coachingFormat: CoachingFormat;
  niche: Niche;
  experience: Experience;
  services: Service[];
  programDuration: ProgramDuration;
  incomeGoal: IncomeGoal;
  hoursPerWeek: HoursOption;
  maxClients: number;
}

/** The form as the user fills it in. */
export interface PricingFormState {
  coachingFormat: CoachingFormat | null;
  niche: Niche | null;
  experience: Experience | null;
  services: Service[];
  programDuration: ProgramDuration | null;
  incomeGoal: IncomeGoal | null;
  hoursPerWeek: HoursOption | null;
  maxClients: number;
  name: string;
  email: string;
}

/** Tier prices and how the client capacity splits across the tiers. */
export interface Pricing {
  starter: number;
  core: number;
  premium: number;
  starterClients: number;
  coreClients: number;
  premiumClients: number;
  /** Group format: prices are per member. */
  isGroup: boolean;
}

/** Everything derived from the prices that the strategy notes may quote. */
export interface Figures {
  goal: number;
  hours: number;
  maxClients: number;
  hoursPerClient: number;
  impliedHourlyRate: number;
  raisedCore: number;
  extraFromRaise: number;
  totalRevenue: number;
  /** Goal minus projected revenue; zero or negative when the goal is met. */
  revenueGap: number;
  premiumPct: number;
}

export interface PricingPackage {
  tier: Tier;
  name: string;
  priceMonthly: number;
  tagline: string;
  idealFor: string;
  includes: string[];
  deliverySummary: string;
}

export interface PricingStrategy {
  packages: PricingPackage[];
  strategyNotes: string[];
  pricing: Pricing;
  figures: Figures;
}

export const money = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;
export const incomeValue = (goal: IncomeGoal): number => Number(goal.replace(/[^\d]/g, ''));
export const hoursValue = (hours: HoursOption): number => parseInt(hours, 10);

/** The form as a request, or null while anything required is missing. */
export function toPricingInput(form: PricingFormState): PricingInput | null {
  if (!form.coachingFormat || !form.niche || !form.experience || !form.programDuration || !form.incomeGoal || !form.hoursPerWeek || form.services.length === 0) return null;
  if (!Number.isInteger(form.maxClients) || form.maxClients < MAX_CLIENTS_MIN || form.maxClients > MAX_CLIENTS_MAX) return null;
  return {
    coachingFormat: form.coachingFormat,
    niche: form.niche,
    experience: form.experience,
    services: [...form.services],
    programDuration: form.programDuration,
    incomeGoal: form.incomeGoal,
    hoursPerWeek: form.hoursPerWeek,
    maxClients: form.maxClients,
  };
}
