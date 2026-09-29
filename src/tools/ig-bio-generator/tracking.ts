import type { BioFormState, BioResult } from './types';
import { currentPageUrl, postEvent, trialUrl } from '../../shared/lib/tracking';

export const TOOL = 'ig-bio-generator';
export const TOOL_SOURCE = 'instagram_bio_generator';
const CAMPAIGN = 'lead_conversion';

export const CTA_TEXT = 'Start Free Trial';
export const CTA_URL = trialUrl(TOOL_SOURCE);
export const DEMO_URL = 'https://www.fitbudd.com/book-a-demo';

/** The lead, posted when bios are generated (same fields the original tool sent). */
export function trackGeneration(form: BioFormState, result: BioResult, generationCount: number): void {
  postEvent(TOOL, 'generation', {
    email: form.email.trim(),
    firstname: form.name.trim(),
    business_type: form.businessType ?? '',
    years_experience: form.yearsExperience.trim(),
    location: form.location.trim(),
    specializations: form.specializations.join(', '),
    target_audience: form.targetAudience ?? '',
    unique_selling_point: form.uniqueSellingPoint.trim().slice(0, 600),
    tone_preference: result.tone,
    generation_count: String(generationCount),
    generated_bios: result.bios.map((b) => b.text).join('\n'),
    generated_usernames: result.usernames.join(', '),
    tool_source: TOOL_SOURCE,
    campaign: CAMPAIGN,
    page_url: currentPageUrl(),
    submitted_at: new Date().toISOString(),
  });
}

export function trackCtaClick(email: string, ctaText: string, ctaUrl: string): void {
  postEvent(TOOL, 'cta_click', {
    email: email.trim(),
    cta_clicked: 'true',
    cta_text: ctaText,
    cta_url: ctaUrl,
    cta_clicked_at: new Date().toISOString(),
    tool_source: TOOL_SOURCE,
    page_url: currentPageUrl(),
  });
}
