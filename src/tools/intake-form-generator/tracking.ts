import type { LeadDetails, Questionnaire, TrainerConfig } from './types';
import { FORM_LENGTH_LABELS } from './types';
import { postEvent, trialUrl } from '../../shared/lib/tracking';
import { attributionFields } from './attribution';
import { countQuestions } from './questionUtils';

export const TOOL = 'intake-form-generator';
export const TOOL_SOURCE = 'personal_trainer_intake_form_generator';
const CAMPAIGN = 'lead_magnet';

export const CTA_TEXT = 'Start Your 30-Day Free Trial';
/** dashboard.fitbudd.com/signup?utm_source=personal_trainer_intake_form_generator&utm_medium=tool_cta&utm_campaign=lead_conversion */
export const CTA_URL = trialUrl(TOOL_SOURCE);
export const PRIVACY_URL = 'https://www.fitbudd.com/privacy-policy';

/** "Jane Q Public" → firstname "Jane", lastname "Q Public". */
export function splitName(fullName: string): { firstname: string; lastname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstname: parts[0] ?? '', lastname: parts.slice(1).join(' ') };
}

/** The lead itself: sent once from the email gate, before Gemini is asked. */
export function trackLead(config: TrainerConfig, lead: LeadDetails): void {
  const { firstname, lastname } = splitName(lead.fullName);
  postEvent(TOOL, 'lead', {
    email: lead.email.trim(),
    firstname,
    lastname,
    coaching_business_type: config.businessType ?? '',
    coaching_specializations: config.specializations.join(', '),
    target_clientele: config.clientele.join(', '),
    coaching_format: config.format ?? '',
    intake_form_length: FORM_LENGTH_LABELS[config.length],
    intake_custom_requirements: config.requirements.trim().slice(0, 500),
    lead_magnet_source: TOOL_SOURCE,
    lead_magnet_type: 'intake_form',
    tool_source: TOOL_SOURCE,
    campaign: CAMPAIGN,
    cta_destination: 'fitbudd_30_day_trial',
    submitted_at: new Date().toISOString(),
    ...attributionFields(),
  });
}

/** After a successful generation (secondary event: never creates a second lead). */
export function trackGenerated(email: string, questionnaire: Questionnaire): void {
  postEvent(TOOL, 'generated', {
    email: email.trim(),
    form_generated: 'true',
    form_generated_at: new Date().toISOString(),
    generated_form_title: questionnaire.formTitle,
    question_count: String(countQuestions(questionnaire)),
    tool_source: TOOL_SOURCE,
    ...attributionFields(),
  });
}

export function trackRegenerated(email: string): void {
  postEvent(TOOL, 'regenerate', {
    email: email.trim(),
    form_regenerated: 'true',
    form_regenerated_at: new Date().toISOString(),
    tool_source: TOOL_SOURCE,
    ...attributionFields(),
  });
}

export function trackPdfDownload(email: string, questionnaire: Questionnaire): void {
  postEvent(TOOL, 'pdf_download', {
    email: email.trim(),
    pdf_downloaded: 'true',
    pdf_downloaded_at: new Date().toISOString(),
    generated_form_title: questionnaire.formTitle,
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
