import type { Calendar, CalendarConfig, LeadDetails } from './types.js';
import { postEvent, trialUrl } from '../../shared/lib/tracking';
import { attributionFields } from '../../shared/lib/attribution';

/**
 * The one place that maps this tool's data to HubSpot property names. The
 * route (api/track.ts) sends only the fields the form actually defines.
 */

export const TOOL = 'content-calendar-generator';
export const TOOL_SOURCE = 'fitness_content_calendar_generator';
const CAMPAIGN = 'lead_magnet';

export const CTA_TEXT = 'Start Your 30-Day Free Trial';
/** dashboard.fitbudd.com/signup?utm_source=fitness_content_calendar_generator&utm_medium=tool_cta&utm_campaign=lead_conversion */
export const CTA_URL = trialUrl(TOOL_SOURCE);
export const PRIVACY_URL = 'https://www.fitbudd.com/privacy-policy';

/** "Jane Q Public" → firstname "Jane", lastname "Q Public". */
export function splitName(fullName: string): { firstname: string; lastname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstname: parts[0] ?? '', lastname: parts.slice(1).join(' ') };
}

/** The lead itself: sent once from the gate, before Gemini is asked. `internal_src` is the portal's existing "page or CTA that sourced this lead" property. */
export function trackLead(config: CalendarConfig, lead: LeadDetails): void {
  const { firstname, lastname } = splitName(lead.fullName);
  postEvent(TOOL, 'lead', {
    email: lead.email.trim(),
    firstname,
    lastname,
    business_type: config.businessType ?? '',
    fitness_niche: config.niches.join(', '),
    target_audience: config.audiences.join(', '),
    social_platforms: config.platforms.join(', '),
    content_goals: config.goals.join(', '),
    calendar_duration: config.duration,
    posting_frequency: config.frequency,
    brand_tone: config.tone ?? '',
    main_offer: config.offer.trim().slice(0, 120),
    lead_magnet_source: TOOL_SOURCE,
    lead_magnet_type: 'content_calendar',
    tool_source: TOOL_SOURCE,
    internal_src: TOOL_SOURCE,
    campaign: CAMPAIGN,
    cta_destination: 'fitbudd_30_day_trial',
    submitted_at: new Date().toISOString(),
    ...attributionFields(),
  });
}

/** After a successful generation (secondary event: never creates a second lead). */
export function trackGenerated(email: string, c: Calendar): void {
  postEvent(TOOL, 'generated', {
    email: email.trim(),
    calendar_generated: 'true',
    calendar_generated_at: new Date().toISOString(),
    calendar_duration: `${c.durationDays} Days`,
    planned_posts: String(c.posts.length),
    tool_source: TOOL_SOURCE,
    ...attributionFields(),
  });
}

export function trackRegenerated(email: string, c: Calendar): void {
  postEvent(TOOL, 'regenerate', {
    email: email.trim(),
    calendar_regenerated: 'true',
    calendar_regenerated_at: new Date().toISOString(),
    planned_posts: String(c.posts.length),
    tool_source: TOOL_SOURCE,
    ...attributionFields(),
  });
}

export function trackPdfDownload(email: string): void {
  postEvent(TOOL, 'pdf_download', {
    email: email.trim(),
    pdf_downloaded: 'true',
    pdf_downloaded_at: new Date().toISOString(),
    tool_source: TOOL_SOURCE,
    ...attributionFields(),
  });
}

export function trackCsvDownload(email: string): void {
  postEvent(TOOL, 'csv_download', {
    email: email.trim(),
    csv_downloaded: 'true',
    csv_downloaded_at: new Date().toISOString(),
    tool_source: TOOL_SOURCE,
    ...attributionFields(),
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
    ...attributionFields(),
  });
}
