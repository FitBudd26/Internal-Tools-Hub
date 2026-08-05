/**
 * CTA constants. Attribution happens via the UTM parameters on the CTA URL.
 */

const UTM = {
  source: 'ai_tool',
  medium: 'lead_magnet',
  campaign: 'hashtag_generator',
  content: 'bottom_cta',
} as const;

export const CTA_TEXT = 'Start Free Trial';

export const CTA_URL =
  'https://www.fitbudd.com/your-brand-awaits-your-app-self-sign-up' +
  `?utm_source=${UTM.source}` +
  `&utm_medium=${UTM.medium}` +
  `&utm_campaign=${UTM.campaign}` +
  `&utm_content=${UTM.content}`;
