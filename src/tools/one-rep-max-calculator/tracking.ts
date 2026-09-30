import { CTA_URL } from './links';
import type { OneRmResult } from './types';
import { currentPageUrl, postEvent } from '../../shared/lib/tracking';

export const TOOL = 'one-rep-max-calculator';
/** The standalone calculator's own lead source value. */
export const TOOL_SOURCE = '1rm_calculator';

/** The lead, posted when a max is calculated. HubSpot keeps the fields its form defines (email today). */
export function trackLead(email: string, result: OneRmResult): void {
  postEvent(TOOL, 'lead', {
    email: email.trim(),
    calculator_exercise: result.input.exercise,
    calculator_1rm_result: String(result.oneRm),
    calculator_unit: result.input.unit,
    lead_source: TOOL_SOURCE,
    tool_source: TOOL_SOURCE,
    page_url: currentPageUrl(),
    submitted_at: new Date().toISOString(),
  });
}

export function trackCtaClick(email: string, text: string, url: string = CTA_URL): void {
  postEvent(TOOL, 'cta_click', {
    email: email.trim(),
    cta_clicked: 'true',
    cta_text: text,
    cta_url: url,
    cta_clicked_at: new Date().toISOString(),
    tool_source: TOOL_SOURCE,
    page_url: currentPageUrl(),
  });
}
