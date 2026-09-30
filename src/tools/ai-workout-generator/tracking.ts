import { CAMPAIGN, CTA_TEXT, CTA_URL } from './links';
import type { Profession, WorkoutRequest } from './types';
import { currentPageUrl, postEvent } from '../../shared/lib/tracking';

export const TOOL = 'ai-workout-generator';
export const TOOL_SOURCE = 'ai_workout_generator';

/**
 * The lead, posted when a plan is generated. Only the coach's own details
 * and the session settings go to HubSpot: the client's name and the notes
 * about injuries stay in the browser.
 */
export function trackLead(email: string, profession: Profession, request: WorkoutRequest): void {
  const input = request.mode === 'guided' ? request.input : null;
  postEvent(TOOL, 'lead', {
    email: email.trim(),
    are_you_a_fitness_professional: profession,
    workout_mode: request.mode,
    workout_goal: input?.goal ?? '',
    workout_location: input?.location ?? '',
    workout_intensity: input?.intensity ?? '',
    workout_type: input?.workoutType ?? '',
    workout_duration: input ? `${input.durationMin} minutes` : '',
    target_area: input?.targetArea ?? '',
    tool_source: TOOL_SOURCE,
    campaign: CAMPAIGN,
    page_url: currentPageUrl(),
    submitted_at: new Date().toISOString(),
  });
}

export function trackPdfDownload(email: string): void {
  postEvent(TOOL, 'pdf_download', {
    email: email.trim(),
    pdf_downloaded: 'true',
    pdf_downloaded_at: new Date().toISOString(),
    tool_source: TOOL_SOURCE,
    page_url: currentPageUrl(),
  });
}

export function trackCtaClick(email: string): void {
  postEvent(TOOL, 'cta_click', {
    email: email.trim(),
    cta_clicked: 'true',
    cta_text: CTA_TEXT,
    cta_url: CTA_URL,
    cta_clicked_at: new Date().toISOString(),
    tool_source: TOOL_SOURCE,
    page_url: currentPageUrl(),
  });
}
