import { z } from 'zod';
import {
  AUDIENCES,
  BUSINESS_TYPES,
  DURATIONS,
  FORMAT_OPTIONS,
  FREQUENCIES,
  GOALS,
  LANGUAGES,
  MAX_AUDIENCES,
  MAX_FORMATS,
  MAX_GOALS,
  MAX_INSTRUCTIONS,
  MAX_NICHES,
  MAX_PLATFORMS,
  MAX_SHORT_TEXT,
  NICHES,
  PILLARS,
  PLATFORMS,
  POST_FORMATS,
  TONES,
} from './types.js';
import { WEEKDAYS } from './dateScheduler.js';

/**
 * Zod schemas for the generation route: the request the browser sends and
 * the posts Gemini must return. Imported by api/generate-calendar.ts; the
 * browser bundle only needs the plain types in types.ts.
 */

export const slotSchema = z.object({
  id: z.string().regex(/^post_\d{3}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day: z.enum(WEEKDAYS),
  pillar: z.enum(PILLARS),
  angle: z.string().max(100),
  platform: z.enum(PLATFORMS),
  format: z.enum(POST_FORMATS),
  adaptFor: z.array(z.enum(PLATFORMS)).max(3).default([]),
});

export const generateCalendarRequestSchema = z.object({
  mode: z.enum(['calendar', 'post']).default('calendar'),
  businessType: z.enum(BUSINESS_TYPES),
  niches: z.array(z.enum(NICHES)).min(1).max(MAX_NICHES),
  audiences: z.array(z.enum(AUDIENCES)).min(1).max(MAX_AUDIENCES),
  platforms: z.array(z.enum(PLATFORMS)).min(1).max(MAX_PLATFORMS),
  goals: z.array(z.enum(GOALS)).min(1).max(MAX_GOALS),
  duration: z.enum(DURATIONS),
  frequency: z.enum(FREQUENCIES),
  tone: z.enum(TONES).nullable().default(null),
  formats: z.array(z.enum(FORMAT_OPTIONS)).max(MAX_FORMATS).default([]),
  offer: z.string().max(MAX_SHORT_TEXT).default(''),
  promotions: z.string().max(MAX_SHORT_TEXT).default(''),
  instructions: z.string().max(MAX_INSTRUCTIONS).default(''),
  /** The first eligible publishing date in the user's local calendar (the browser fills in today). */
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().max(64).default('UTC'),
  language: z.enum(LANGUAGES).default('English'),
  /** Regenerate counter: a different seed asks for different content for the same inputs. */
  variant: z.number().int().min(0).max(20).default(0),
  /** Topics already shown, so regenerated content is new. */
  avoidTopics: z.array(z.string().max(160)).max(60).default([]),
  /** mode 'post': the one slot to write again. */
  slot: slotSchema.optional(),
});
export type GenerateCalendarRequest = z.infer<typeof generateCalendarRequestSchema>;

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const rawAdaptationSchema = z.object({
  platform: z.enum(PLATFORMS),
  format: z.enum(POST_FORMATS).optional(),
  hook: z.string().trim().max(300).default(''),
  caption: text(1, 2500),
});

export const rawPostSchema = z.object({
  id: z.string().trim().max(20),
  topic: text(1, 160),
  hook: text(1, 300),
  caption: text(1, 2500),
  creativeDirection: text(1, 700),
  cta: text(1, 200),
  hashtags: z.array(z.string().trim().max(40)).max(12).default([]),
  productionNotes: z.string().trim().max(400).default(''),
  format: z.enum(POST_FORMATS).optional(),
  adaptations: z.array(rawAdaptationSchema).max(3).default([]),
});

export const rawChunkSchema = z.object({
  strategySummary: z.string().trim().max(700).default(''),
  posts: z.array(rawPostSchema).max(16),
});
export type RawPost = z.infer<typeof rawPostSchema>;
