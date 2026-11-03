/**
 * Option lists and data shapes for the Personal Trainer Intake Form
 * Generator. Shared by the form, the results modal, the PDF builder and
 * (through schema.ts) the serverless generation route, so the lists live
 * here once and nothing in this file touches React or the DOM.
 */

export const BUSINESS_TYPES = [
  'Personal Trainer',
  'Online Fitness Coach',
  'Hybrid Fitness Coach',
  'Gym Owner',
  'Fitness Studio Owner',
  'Strength & Conditioning Coach',
  'Nutrition Coach',
  'Yoga Instructor',
  'Pilates Instructor',
  'Group Fitness Coach',
  'Sports Performance Coach',
  'Other',
] as const;

export const SPECIALIZATIONS = [
  'Weight Loss / Fat Loss',
  'Muscle Building',
  'Strength Training',
  'Bodybuilding',
  'General Fitness',
  'Athletic Performance',
  'Functional Fitness',
  'Mobility & Flexibility',
  'Yoga & Mindfulness',
  'Pilates',
  'Nutrition Coaching',
  'Lifestyle & Habit Coaching',
  'Senior Fitness',
  'Pre/Postnatal Fitness',
  'Corrective Exercise / Movement Quality',
  'Endurance Training',
  'HIIT & Conditioning',
] as const;

export const CLIENTELE = [
  'Beginners',
  'Intermediate Lifters',
  'Advanced Athletes',
  'Busy Professionals',
  'Busy Parents',
  'Women',
  'Men',
  'Seniors (55+)',
  'Teen Athletes',
  'Recreational Athletes',
  'Competitive Athletes',
  'Postnatal Clients',
  'General Population',
  'Corporate Wellness Clients',
] as const;

export const COACHING_FORMATS = [
  'In-Person Training',
  'Online Coaching',
  'Hybrid Coaching',
  'Group Coaching',
  'Gym / Studio Membership',
  'Corporate Wellness',
] as const;

/** Form length keys (sent to the API) with their labels and question ranges. */
export const FORM_LENGTHS = ['quick', 'standard', 'comprehensive'] as const;
export type FormLength = (typeof FORM_LENGTHS)[number];

export const FORM_LENGTH_LABELS: Record<FormLength, string> = {
  quick: 'Quick Intake · 10-14 questions',
  standard: 'Standard Intake · 16-22 questions',
  comprehensive: 'Comprehensive Intake · 24-30 questions',
};

export const FORM_LENGTH_RANGES: Record<FormLength, { min: number; max: number }> = {
  quick: { min: 10, max: 14 },
  standard: { min: 16, max: 22 },
  comprehensive: { min: 24, max: 30 },
};

export const FORM_LENGTH_OPTIONS = FORM_LENGTHS.map((k) => FORM_LENGTH_LABELS[k]);
export function formLengthFromLabel(label: string | null): FormLength | null {
  return FORM_LENGTHS.find((k) => FORM_LENGTH_LABELS[k] === label) ?? null;
}

/** Most selections a trainer can make in each multi-select (also enforced by the API). */
export const MAX_MULTI = 6;
/** Longest "Specific Questions or Requirements" text accepted (also enforced by the API). */
export const MAX_REQUIREMENTS = 500;

export type BusinessType = (typeof BUSINESS_TYPES)[number];
export type Specialization = (typeof SPECIALIZATIONS)[number];
export type Clientele = (typeof CLIENTELE)[number];
export type CoachingFormat = (typeof COACHING_FORMATS)[number];

/** Screen 1: what the trainer tells us about their business. */
export interface TrainerConfig {
  businessType: BusinessType | null;
  specializations: Specialization[];
  clientele: Clientele[];
  format: CoachingFormat | null;
  length: FormLength;
  requirements: string;
}

/** Screen 2: the lead. Never sent to Gemini. */
export interface LeadDetails {
  fullName: string;
  email: string;
}

/* ------------------------------ questionnaire ------------------------------ */

export const QUESTION_TYPES = [
  'short_text',
  'long_text',
  'single_select',
  'multi_select',
  'yes_no',
  'number',
  'date',
  'rating',
  'acknowledgment',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: 'Short answer',
  long_text: 'Long answer',
  single_select: 'Single choice',
  multi_select: 'Multiple choice',
  yes_no: 'Yes / No',
  number: 'Number',
  date: 'Date',
  rating: 'Rating 1-5',
  acknowledgment: 'Acknowledgment',
};

export const CHOICE_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>(['single_select', 'multi_select']);

export interface IntakeQuestion {
  id: string;
  question: string;
  type: QuestionType;
  required: boolean;
  /** Choice questions only (2-12 options). */
  options: string[];
  helpText: string;
  /** Rating questions only: the labels under 1 and 5. */
  scaleLabels?: [string, string];
}

export interface IntakeSection {
  id: string;
  title: string;
  description: string;
  questions: IntakeQuestion[];
}

export interface Questionnaire {
  formTitle: string;
  formDescription: string;
  sections: IntakeSection[];
  /** For the trainer, shown in the results modal; never printed on the client PDF. */
  coachNotes: string[];
  reviewNotice: string;
}

/** PDF choices the trainer makes in the results modal. */
export type PageSize = 'letter' | 'a4';
export interface CoachLogo {
  dataUrl: string;
  /** height / width */
  ratio: number;
}
export interface PdfOptions {
  pageSize: PageSize;
  coachName: string;
  coachLogo: CoachLogo | null;
}
