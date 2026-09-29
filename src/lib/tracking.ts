import type { HashtagFormState, PlatformHashtags } from '../types';

/**
 * CTA constants and optional HubSpot event tracking.
 *
 * Events are POSTed to our own serverless route (/api/track) which holds
 * the HubSpot credentials server-side — nothing sensitive ships in this
 * bundle. Every call is fire-and-forget: tracking can never block results
 * or the CTA.
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

/** Record a successful generation (no personal data — there is no email field). */
export function trackGeneration(
  form: HashtagFormState,
  results: PlatformHashtags[],
): void {
  post('generation', {
    caption: form.caption.trim().slice(0, 2000),
    topic: form.topic.trim(),
    post_type: form.postType ?? '',
    target_platforms: form.platforms.join(', '),
    tone_goal: form.tones.join(', '),
    generated_hashtags: results
      .map((g) => `${g.platform}: ${g.tags.map((t) => `#${t}`).join(' ')}`)
      .join('\n'),
    tool_source: TOOL_SOURCE,
    campaign: CAMPAIGN,
    page_url: window.location.href,
    submitted_at: new Date().toISOString(),
  });
}

/** Record a Start Free Trial click; the link opens regardless. */
export function trackCtaClick(): void {
  post('cta_click', {
    cta_clicked: 'true',
    cta_text: CTA_TEXT,
    cta_url: CTA_URL,
    cta_clicked_at: new Date().toISOString(),
    tool_source: TOOL_SOURCE,
    page_url: window.location.href,
  });
}
