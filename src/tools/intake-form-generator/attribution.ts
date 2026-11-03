/**
 * Attribution for HubSpot. The tool runs in a cross-origin iframe, so it
 * cannot read the Webflow page's URL, UTM parameters or HubSpot cookie
 * itself. Two legitimate sources are used:
 *
 *  1. Its own URL: the embed can append `?utm_source=...` to the iframe src.
 *  2. A `postMessage` from the parent page, origin-checked against FitBudd's
 *     domains, shaped { type: 'fitbudd-tool:attribution', utm, pageUrl, hutk }.
 *     On load the tool posts { type: 'fitbudd-tool:ready' } upward so the
 *     parent knows when to send it (the README has the parent snippet).
 *
 * Nothing here reaches into the parent document.
 */

import { currentPageUrl } from '../../shared/lib/tracking';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
type UtmKey = (typeof UTM_KEYS)[number];

const ALLOWED_PARENT_ORIGINS = [/^https:\/\/(www\.)?fitbudd\.com$/, /^https:\/\/[a-z0-9-]+\.webflow\.io$/];
const HUTK_RE = /^[a-f0-9]{32}$/;
const clean = (v: unknown, max = 200): string => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '');

interface ParentAttribution {
  utm: Partial<Record<UtmKey, string>>;
  pageUrl: string;
  hutk: string;
}

const fromParent: ParentAttribution = { utm: {}, pageUrl: '', hutk: '' };
let listening = false;

export function initAttribution(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('message', (e: MessageEvent) => {
    if (!ALLOWED_PARENT_ORIGINS.some((re) => re.test(e.origin))) return;
    const d = e.data as { type?: unknown; utm?: unknown; pageUrl?: unknown; hutk?: unknown } | null;
    if (!d || d.type !== 'fitbudd-tool:attribution') return;
    if (d.utm && typeof d.utm === 'object') {
      for (const k of UTM_KEYS) {
        const v = clean((d.utm as Record<string, unknown>)[k]);
        if (v) fromParent.utm[k] = v;
      }
    }
    const pageUrl = clean(d.pageUrl, 500);
    if (/^https?:\/\//.test(pageUrl)) fromParent.pageUrl = pageUrl;
    const hutk = clean(d.hutk, 40);
    if (HUTK_RE.test(hutk)) fromParent.hutk = hutk;
  });
  if (window.parent !== window) {
    try {
      window.parent.postMessage({ type: 'fitbudd-tool:ready', tool: 'intake-form-generator' }, '*');
    } catch {
      /* no parent to tell */
    }
  }
}

/** UTM values from the parent message first, then the tool's own URL. */
export function attributionFields(): Record<string, string> {
  const own = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = fromParent.utm[k] || clean(own.get(k));
    if (v) out[k] = v;
  }
  out.page_url = fromParent.pageUrl || currentPageUrl();
  if (fromParent.hutk) out.hutk = fromParent.hutk;
  return out;
}
