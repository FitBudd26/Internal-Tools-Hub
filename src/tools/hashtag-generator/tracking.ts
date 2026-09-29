import type { HashtagFormState } from './types';
import { currentPageUrl, postEvent, trialUrl } from '../../shared/lib/tracking';

export const TOOL = 'hashtag-generator';
const TOOL_SOURCE = 'hashtag_generator';

export const CTA_TEXT = 'Start Free Trial';
export const CTA_URL = trialUrl(TOOL_SOURCE);

/** Record the lead (name + email) once hashtags are generated — the only data this tool stores. */
export function trackGeneration(form: HashtagFormState): void {
  postEvent(TOOL, 'generation', {
    email: form.email.trim(),
    firstname: form.name.trim(),
    page_url: currentPageUrl(), // context only (HubSpot pageUri)
  });
}
