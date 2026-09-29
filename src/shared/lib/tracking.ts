/**
 * Shared lead/event posting for every tool in the hub.
 *
 * Events go to our own serverless route (/api/track), which holds the
 * HubSpot credentials and knows which form each tool feeds. Every call is
 * fire-and-forget: tracking can never block a tool's results or its CTA.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Throwaway inbox providers; leads from these are junk for a lead magnet. */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', '10minutemail.com', '10minutemail.net',
  'tempmail.com', 'temp-mail.org', 'tempmailo.com', 'yopmail.com', 'yopmail.fr', 'trashmail.com', 'trashmail.me',
  'getnada.com', 'nada.email', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com', 'fakeinbox.com', 'mohmal.com',
  'emailondeck.com', 'mintemail.com', 'tempr.email', 'discard.email', 'spamgourmet.com', 'mailnesia.com', 'burnermail.io',
  'guerrillamailblock.com', 'grr.la', 'mailcatch.com', 'tmpmail.org', 'tmpmail.net', 'moakt.com', 'inboxkitten.com',
  'example.com', 'example.org', 'example.net', 'test.com', 'email.com', 'mail.com.invalid',
]);

export function isDisposableEmail(value: string): boolean {
  const domain = value.trim().toLowerCase().split('@')[1] ?? '';
  return DISPOSABLE_DOMAINS.has(domain) || /(^|\.)(tempmail|10minutemail|guerrillamail|mailinator|yopmail|trashmail)\./.test(domain);
}

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return EMAIL_RE.test(v) && !isDisposableEmail(v);
}

/** FitBudd self-signup URL carrying the tool's UTM tags. */
export function trialUrl(toolSource: string, campaign = 'lead_conversion'): string {
  return (
    'https://dashboard.fitbudd.com/signup' +
    `?utm_source=${toolSource}&utm_medium=tool_cta&utm_campaign=${campaign}`
  );
}

/** The embedding page when running in an iframe (as far as the referrer policy allows), else our own URL. */
export function currentPageUrl(): string {
  return document.referrer || window.location.href;
}

export function postEvent(tool: string, type: string, fields: Record<string, string>): void {
  // Dev runs skip tracking so local testing doesn't pollute the CRM, unless
  // VITE_TRACK_IN_DEV=true is set to verify the HubSpot wiring end to end.
  if (import.meta.env.DEV && import.meta.env.VITE_TRACK_IN_DEV !== 'true') return;
  try {
    void fetch('/api/track', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, type, fields }),
    }).catch(() => {});
  } catch {
    /* never block the UI on tracking */
  }
}
