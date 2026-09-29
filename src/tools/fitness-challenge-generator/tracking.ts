import type { Challenge, ChallengeInput } from './types';
import { currentPageUrl, postEvent, trialUrl } from '../../shared/lib/tracking';

export const TOOL = 'fitness-challenge-generator';
export const TOOL_SOURCE = 'fitness_challenge_generator';
const CAMPAIGN = 'lead_magnet';

export const CTA_TEXT = 'Start your 30-day free trial on FitBudd';
export const CTA_URL = trialUrl(TOOL_SOURCE);

/** The lead: submitted from the email gate, before results are shown. */
export function trackLead(
  input: ChallengeInput,
  email: string,
  name: string,
  sendMoreTools: boolean,
  challenge: Challenge,
): void {
  postEvent(TOOL, 'lead', {
    email: email.trim(),
    firstname: name.trim(),
    challenge_types: input.challengeTypes.join(', '),
    audience_types: input.audienceTypes.join(', '),
    fitness_levels: input.fitnessLevels.join(', '),
    challenge_duration: input.duration ?? '',
    equipment_availability: input.equipment.join(', '),
    measurement_preferences: input.measurements.join(', '),
    send_more_tools: sendMoreTools ? 'true' : 'false',
    generated_challenge_name: challenge.challengeName,
    tool_source: TOOL_SOURCE,
    campaign: CAMPAIGN,
    cta_destination: 'fitbudd_30_day_trial',
    page_url: currentPageUrl(),
    submitted_at: new Date().toISOString(),
  });
}

export function trackPdfDownload(email: string, challengeName: string): void {
  postEvent(TOOL, 'pdf_download', {
    email: email.trim(),
    pdf_downloaded: 'true',
    pdf_downloaded_at: new Date().toISOString(),
    challenge_name: challengeName,
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
