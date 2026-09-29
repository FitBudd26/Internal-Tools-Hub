import type { UsernameFormState } from './types';
import { currentPageUrl, postEvent, trialUrl } from '../../shared/lib/tracking';

export const TOOL = 'ig-username-generator';
export const TOOL_SOURCE = 'instagram_username_generator';
const CAMPAIGN = 'lead_conversion';

export const CTA_TEXT = 'Start Free Trial';
export const CTA_URL = trialUrl(TOOL_SOURCE);

/** The lead, posted when usernames are generated (the fields the original README asked for). */
export function trackGeneration(form: UsernameFormState, usernames: string[]): void {
  postEvent(TOOL, 'generation', {
    email: form.email.trim(),
    firstname: form.fullName.trim(),
    fitness_niches: form.niches.join(', '),
    trainer_types: form.trainerTypes.join(', '),
    tone_styles: form.tones.join(', '),
    keyword: form.keyword.trim(),
    generated_usernames: usernames.map((u) => `@${u}`).join(', '),
    source: TOOL_SOURCE,
    tool_source: TOOL_SOURCE,
    campaign: CAMPAIGN,
    page_url: currentPageUrl(),
    submitted_at: new Date().toISOString(),
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
