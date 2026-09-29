import type { HashtagFormState } from '../types';

/**
 * CTA constants and HubSpot lead capture.
 *
 * When hashtags are generated, the visitor's name and email are POSTed to
 * our own serverless route (/api/track), which forwards them to FitBudd's
 * HubSpot form. Those two values are the only data recorded — the form has
 * exactly those two fields and nothing else is meant to be stored. The call
 * is fire-and-forget: tracking can never block results or the CTA.
 */

const TOOL_SOURCE: string =
  import.meta.env.VITE_TOOL_SOURCE || 'hashtag_generator';
const CAMPAIGN = 'lead_conversion';

export const CTA_TEXT = 'Start Free Trial';

export const CTA_URL =
  'https://dashboard.fitbudd.com/signup' +
  `?utm_source=${TOOL_SOURCE}` +
  '&utm_medium=tool_cta' +
  `&utm_campaign=${CAMPAIGN}`;

function post(type: string, fields: Record<string, string>): void {
  // Dev runs skip tracking so local testing doesn't pollute the CRM, unless
  // VITE_TRACK_IN_DEV=true is set to verify the HubSpot wiring end to end.
  if (import.meta.env.DEV && import.meta.env.VITE_TRACK_IN_DEV !== 'true') return;
  try {
    void fetch('/api/track', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, fields }),
    }).catch(() => {});
  } catch {
    /* never block the UI on tracking */
  }
}

/** Record the lead (name + email) once hashtags have been generated. */
export function trackGeneration(form: HashtagFormState): void {
  post('generation', {
    email: form.email.trim(),
    firstname: form.name.trim(),
    // Context only (HubSpot's pageUri): the embedding page when in an iframe.
    page_url: document.referrer || window.location.href,
  });
}
