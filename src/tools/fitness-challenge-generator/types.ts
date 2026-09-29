export const CHALLENGE_TYPES = [
  'Fat Loss',
  'Muscle Building',
  'Habit Building',
  'Consistency / Accountability',
  'Strength',
  'Conditioning',
  'Mobility & Recovery',
  'Lifestyle / Wellness',
  'Community Engagement',
] as const;

export const AUDIENCE_TYPES = [
  '1-on-1 Clients',
  'Group Coaching Clients',
  'Gym Members',
  'Studio Members',
  'Online Community',
  'Corporate / Workplace Groups',
  'Social Media Audience',
] as const;

export const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Mixed Levels'] as const;

export const DURATIONS = ['7 Days', '14 Days', '21 Days', '28 Days', '30 Days'] as const;

export const EQUIPMENT_OPTIONS = [
  'No Equipment',
  'Dumbbells',
  'Barbell',
  'Resistance Bands',
  'Machines',
  'Kettlebells',
  'Bodyweight Only',
  'Mixed Equipment',
] as const;

export const MEASUREMENT_OPTIONS = [
  'Kilograms (kg)',
  'Pounds (lb)',
  'Centimeters (cm)',
  'Inches (in)',
] as const;

export type ChallengeType = (typeof CHALLENGE_TYPES)[number];
export type AudienceType = (typeof AUDIENCE_TYPES)[number];
export type FitnessLevel = (typeof FITNESS_LEVELS)[number];
export type Duration = (typeof DURATIONS)[number];
export type Equipment = (typeof EQUIPMENT_OPTIONS)[number];
export type Measurement = (typeof MEASUREMENT_OPTIONS)[number];

export interface ChallengeInput {
  challengeTypes: ChallengeType[];
  audienceTypes: AudienceType[];
  fitnessLevels: FitnessLevel[];
  duration: Duration | null;
  equipment: Equipment[];
  measurements: Measurement[];
}

/** What the single-screen form holds; mapped to ChallengeInput on submit. */
export interface ChallengeFormState {
  challengeTypes: ChallengeType[];
  audience: AudienceType | null;
  fitnessLevel: FitnessLevel | null;
  duration: Duration | null;
  equipment: Equipment | null;
  measurements: Measurement[];
  name: string;
  email: string;
  sendMoreTools: boolean;
}

export interface DailyRule {
  title: string;
  details: string[];
}

export interface WeeklyTheme {
  /** "Week 1", or "Days 22-30" for the tail of a 30-day run. */
  label: string;
  name: string;
  focus: string;
  coachTip: string;
}

export interface PdfSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  numbered?: DailyRule[];
  /** Renders the day-by-day check-in grid instead of text. */
  tracker?: boolean;
}

export interface Challenge {
  challengeName: string;
  subtitle: string;
  designedFor: string;
  level: string;
  duration: string;
  durationDays: number;
  objective: string;
  howItWorks: string;
  dailyRules: DailyRule[];
  weeklyThemes: WeeklyTheme[];
  scoringSystem: string[];
  progressTracking: string[];
  coachingNotes: string[];
  clientInstructions: string[];
  pdfSections: PdfSection[];
}
