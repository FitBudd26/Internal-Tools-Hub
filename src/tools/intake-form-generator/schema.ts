import { z } from 'zod';
import {
  BUSINESS_TYPES,
  CLIENTELE,
  COACHING_FORMATS,
  FORM_LENGTHS,
  MAX_MULTI,
  MAX_REQUIREMENTS,
  QUESTION_TYPES,
  SPECIALIZATIONS,
} from './types';

/**
 * Zod schemas for the generation route: the request the browser sends and
 * the questionnaire Gemini must return. Imported by api/generate-intake.ts;
 * the browser bundle only needs the plain types in types.ts.
 */

export const generateIntakeRequestSchema = z.object({
  businessType: z.enum(BUSINESS_TYPES),
  specializations: z.array(z.enum(SPECIALIZATIONS)).min(1).max(MAX_MULTI),
  clientele: z.array(z.enum(CLIENTELE)).min(1).max(MAX_MULTI),
  format: z.enum(COACHING_FORMATS),
  length: z.enum(FORM_LENGTHS),
  requirements: z.string().max(MAX_REQUIREMENTS).default(''),
  /** Regenerate counter: a different seed asks for a different form for the same inputs. */
  variant: z.number().int().min(0).max(20).default(0),
  /** Titles already shown, so a regenerated form reads differently. */
  avoidTitles: z.array(z.string().max(120)).max(5).default([]),
});
export type GenerateIntakeRequest = z.infer<typeof generateIntakeRequestSchema>;

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

/** What the model returns, before the route cleans it (ids are reassigned, duplicates removed). */
export const rawQuestionSchema = z.object({
  question: text(5, 240),
  type: z.enum(QUESTION_TYPES),
  required: z.boolean().default(true),
  options: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  helpText: z.string().trim().max(240).default(''),
  scaleLabels: z.array(z.string().trim().max(40)).max(2).default([]),
});

export const rawSectionSchema = z.object({
  title: text(2, 80),
  description: z.string().trim().max(240).default(''),
  questions: z.array(rawQuestionSchema).max(40),
});

export const rawQuestionnaireSchema = z.object({
  formTitle: text(3, 120),
  formDescription: z.string().trim().max(400).default(''),
  sections: z.array(rawSectionSchema).min(1).max(14),
  coachNotes: z.array(z.string().trim().max(300)).max(8).default([]),
  reviewNotice: z.string().trim().max(400).default(''),
});
export type RawQuestionnaire = z.infer<typeof rawQuestionnaireSchema>;

/** The cleaned questionnaire the route returns (and the shape the browser works with). */
export const questionSchema = z.object({
  id: z.string().min(1).max(40),
  question: text(5, 240),
  type: z.enum(QUESTION_TYPES),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(80)).max(12),
  helpText: z.string().max(240),
  scaleLabels: z.tuple([z.string().max(40), z.string().max(40)]).optional(),
});

export const sectionSchema = z.object({
  id: z.string().min(1).max(40),
  title: text(2, 80),
  description: z.string().max(240),
  questions: z.array(questionSchema).min(1).max(40),
});

export const questionnaireSchema = z.object({
  formTitle: text(3, 120),
  formDescription: z.string().max(400),
  sections: z.array(sectionSchema).min(1).max(14),
  coachNotes: z.array(z.string().max(300)).max(8),
  reviewNotice: z.string().max(400),
});
