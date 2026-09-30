import type { GymNameFormState } from './types';
import { currentPageUrl, postEvent } from '../../shared/lib/tracking';

export const TOOL = 'gym-name-generator';
export const TOOL_SOURCE = 'gym_name_generator';
const CAMPAIGN = 'gym_name_generator';

export const CTA_TEXT = 'Start Free Trial';

/** Same destination and UTM tags as the standalone tool, so attribution carries over. */
export const CTA_URL =
  'https://www.fitbudd.com/your-brand-awaits-your-app-self-sign-up' +
  `?utm_source=ai_tool&utm_medium=lead_magnet&utm_campaign=${CAMPAIGN}&utm_content=bottom_cta`;

/** The lead, posted when names are generated. HubSpot keeps the fields its form defines. */
export function trackGeneration(form: GymNameFormState, names: string[]): void {
  postEvent(TOOL, 'generation', {
    email: form.email.trim(),
    firstname: form.fullName.trim(),
    gym_types: form.gymTypes.join(', '),
    target_audiences: form.audiences.join(', '),
    tone_styles: form.tones.join(', '),
    keyword: form.keyword.trim(),
    generated_gym_names: names.join(', '),
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
