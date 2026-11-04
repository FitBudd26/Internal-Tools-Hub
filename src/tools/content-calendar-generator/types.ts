/**
 * Option lists and data shapes for the Fitness Content Calendar Generator.
 * Shared by the form, the results modal, the exports and (through schema.ts,
 * dateScheduler.ts and contentStrategy.ts) the serverless generation route,
 * so every list lives here once. Nothing in this file touches React or the DOM.
 */

export const BUSINESS_TYPES = [
  'Personal Trainer',
  'Online Fitness Coach',
  'Gym Owner',
  'Fitness Studio Owner',
  'Yoga Instructor',
  'Pilates Instructor',
  'Nutrition Coach',
  'Strength Coach',
  'Fitness Influencer',
  'Group Fitness Coach',
  'Hybrid Fitness Coach',
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const NICHES = [
  'Weight Loss / Fat Loss',
  'Muscle Building',
  'Strength Training',
  'Bodybuilding',
  'General Fitness',
  'Functional Fitness',
  'HIIT',
  'Yoga',
  'Pilates',
  'Mobility & Recovery',
  'Nutrition Coaching',
  'Athletic Performance',
  "Women's Fitness",
  'Senior Fitness',
  'Lifestyle Coaching',
  'Group Fitness',
  'Mindfulness & Wellness',
] as const;
export type Niche = (typeof NICHES)[number];

export const AUDIENCES = [
  'Beginners',
  'Busy Professionals',
  'Busy Parents',
  'Women',
  'Men',
  'Seniors 55+',
  'Athletes',
  'Gym Beginners',
  'Intermediate Lifters',
  'Advanced Lifters',
  'General Population',
  'Corporate Professionals',
  'Online Coaching Clients',
] as const;
export type Audience = (typeof AUDIENCES)[number];

export const PLATFORMS = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'YouTube', 'Pinterest', 'Threads', 'Twitter/X'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const GOALS = [
  'Generate More Leads',
  'Increase Engagement',
  'Build Brand Awareness',
  'Grow Followers',
  'Sell Coaching Programs',
  'Promote Gym Memberships',
  'Increase Class Bookings',
  'Build Community',
  'Educate Audience',
  'Improve Client Retention',
] as const;
export type Goal = (typeof GOALS)[number];

export const DURATIONS = ['7 Days', '14 Days', '30 Days'] as const;
export type Duration = (typeof DURATIONS)[number];
export const DURATION_DAYS: Record<Duration, number> = { '7 Days': 7, '14 Days': 14, '30 Days': 30 };

export const FREQUENCIES = ['3 Posts Per Week', '4 Posts Per Week', '5 Posts Per Week', 'Daily'] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const FREQUENCY_POSTS: Record<Frequency, number> = { '3 Posts Per Week': 3, '4 Posts Per Week': 4, '5 Posts Per Week': 5, Daily: 7 };
export const DEFAULT_FREQUENCY: Frequency = '5 Posts Per Week';

export const TONES = ['Professional', 'Motivational', 'Friendly', 'Educational', 'Bold', 'Premium', 'Fun & Relatable'] as const;
export type Tone = (typeof TONES)[number];

export const FORMAT_OPTIONS = [
  'Reels / Short Videos',
  'Carousel Posts',
  'Static Images',
  'Stories',
  'Educational Videos',
  'Testimonials',
  'Behind-the-Scenes',
  'Live Sessions',
  'Short Text Posts',
] as const;
export type FormatOption = (typeof FORMAT_OPTIONS)[number];

export const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch', 'Hindi'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Most selections allowed in each multi-select (also enforced by the API). */
export const MAX_NICHES = 5;
export const MAX_AUDIENCES = 4;
export const MAX_PLATFORMS = 4;
export const MAX_GOALS = 4;
export const MAX_FORMATS = 6;
export const MAX_SHORT_TEXT = 120;
export const MAX_INSTRUCTIONS = 300;

/** Screen 1: the content strategy inputs. Nothing here is a lead field. */
export interface CalendarConfig {
  businessType: BusinessType | null;
  niches: Niche[];
  audiences: Audience[];
  platforms: Platform[];
  goals: Goal[];
  duration: Duration;
  frequency: Frequency;
  tone: Tone | null;
  formats: FormatOption[];
  offer: string;
  promotions: string;
  instructions: string;
  /** YYYY-MM-DD in the user's local calendar, or '' for "today". */
  startDate: string;
  language: Language;
}

/** Screen 2: the lead. Never sent to Gemini. */
export interface LeadDetails {
  fullName: string;
  email: string;
}

/* ------------------------------- calendar -------------------------------- */

export const PILLARS = ['Educational', 'Engagement', 'Authority', 'Promotional'] as const;
export type Pillar = (typeof PILLARS)[number];
export const PILLAR_LABELS: Record<Pillar, string> = {
  Educational: 'Educational / Value',
  Engagement: 'Engagement / Community',
  Authority: 'Authority / Trust',
  Promotional: 'Promotional / Conversion',
};

/** Concrete publishing formats a post can take (platform-aware). */
export const POST_FORMATS = [
  'Reel',
  'Short Video',
  'YouTube Short',
  'Educational Video',
  'Carousel',
  'Static Image',
  'Story',
  'Text Post',
  'Live Session',
  'Behind-the-Scenes',
  'Testimonial',
  'Pin',
] as const;
export type PostFormat = (typeof POST_FORMATS)[number];

/** A publishing slot the scheduler plans before the model writes anything. */
export interface Slot {
  id: string;
  /** YYYY-MM-DD, local calendar date */
  date: string;
  /** "Monday" */
  day: string;
  pillar: Pillar;
  /** A strategic angle such as "common mistake and the fix" that keeps posts varied. */
  angle: string;
  platform: Platform;
  format: PostFormat;
  /** Platforms this idea should also be adapted for (never counted as separate posts). */
  adaptFor: Platform[];
}

export interface Adaptation {
  platform: Platform;
  format: PostFormat;
  hook: string;
  caption: string;
}

export interface Post {
  id: string;
  date: string;
  day: string;
  platforms: Platform[];
  pillar: Pillar;
  format: PostFormat;
  topic: string;
  hook: string;
  caption: string;
  creativeDirection: string;
  cta: string;
  hashtags: string[];
  productionNotes: string;
  status: 'draft';
  adaptations: Adaptation[];
}

export interface PillarShare {
  name: Pillar;
  targetPercentage: number;
  plannedPosts: number;
}

export interface ContentStrategy {
  primaryGoal: Goal;
  goals: Goal[];
  targetAudience: Audience[];
  platforms: Platform[];
  contentPillars: PillarShare[];
  /** Two or three sentences from the model on how this calendar serves the goals. */
  summary: string;
}

export interface Calendar {
  calendarTitle: string;
  businessType: BusinessType;
  niches: Niche[];
  durationDays: number;
  postsPerWeek: number;
  startDate: string;
  endDate: string;
  timezone: string;
  language: Language;
  tone: Tone | null;
  contentStrategy: ContentStrategy;
  posts: Post[];
  /** Slots the model could not fill after the repair pass (surfaced, never hidden). */
  unfilled: number;
}

export type PageSize = 'letter' | 'a4';
export interface PdfOptions {
  pageSize: PageSize;
}
