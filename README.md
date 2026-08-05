# Hashtag Generator

Compact, embeddable hashtag tool for FitBudd. Paste a caption, pick target
platforms, and get platform-tailored hashtag sets — shown in a pop-up modal
with per-platform tips, copy buttons, a global Copy All, and a FitBudd CTA.
Max width 536px, designed for Webflow blog pages, landing pages, or iframes.
Sibling project to the Gym Name Generator and shares its design system.

**Stack:** React 19 · TypeScript · Tailwind CSS v4 · Vite, plus one Vercel
serverless route (`api/track.ts`) for optional HubSpot tracking. There is
deliberately no email/name field — generation is gated by caption + platform
only.

## Commands

```bash
npm install
npm run dev       # local dev server (tracking is skipped in dev — /api only exists on Vercel)
npm run build     # type-check (src + api) + production build → dist/
npm run preview   # serve the production build locally
```

## Embedding

Same pattern as the other FitBudd tools (iframe-resizer **v4** on both
sides — the matching child script is already in `index.html`; the results
modal sizes itself to the iframe, so no parent changes needed):

```html
<div style="max-width:536px;margin:0 auto;">
  <iframe
    id="fitbudd-hashtag"
    src="https://YOUR-VERCEL-URL/"
    title="Hashtag Generator"
    scrolling="no"
    style="width:1px;min-width:100%;max-width:536px;height:580px;border:0;display:block;margin:0 auto;"
    loading="lazy"
    allow="clipboard-write"
  ></iframe>
</div>

<script src="https://cdn.jsdelivr.net/npm/iframe-resizer@4.3.9/js/iframeResizer.min.js"></script>
<script>
  iFrameResize({ checkOrigin: false, log: false }, '#fitbudd-hashtag');
</script>
```

## Generation

`src/lib/generateHashtags.ts` — deterministic client-side blending per
selected platform:

- caption keyword extraction (frequency-ranked words + honest bigrams that
  never bridge sentences), topic expansions (~20 curated niches, generic
  `<topic>life`/`<topic>tips` otherwise), post-type and tone/goal tags
- platform norms: counts within spec ranges (Instagram 15, TikTok 6, X 3,
  LinkedIn 5, YouTube 6, Facebook 4, Pinterest 10, Threads 3), reserved
  staples (#fyp on TikTok), viral/casual tags banned on LinkedIn and X,
  spam-bait tags banned everywhere, and each block carries a short tip
- a tag can appear in at most 3 platform sets per generation, and the
  caption's own hashtags are never re-suggested
- deterministic per input; Regenerate reshuffles each platform's pool

Validation: caption + at least one platform, compact inline errors, no
browser alerts, button disabled until valid.

## HubSpot tracking (optional)

Generation events and CTA clicks are POSTed to `/api/track`, which forwards
them to HubSpot's Forms Submission API. All credentials stay in **server**
env vars — nothing HubSpot-related ships in the frontend bundle:

```
HUBSPOT_PORTAL_ID           required to track
HUBSPOT_FORM_ID             required to track
HUBSPOT_PRIVATE_APP_TOKEN   optional — uses the authenticated secure-submit endpoint when set
VITE_TOOL_SOURCE            optional, defaults to hashtag_generator
```

Create a HubSpot form whose fields match the event payloads (all single- or
multi-line text): `caption`, `topic`, `post_type`, `target_platforms`,
`tone_goal`, `generated_hashtags`, `tool_source`, `campaign`, `page_url`,
`submitted_at`, plus `cta_clicked`, `cta_text`, `cta_url`, `cta_clicked_at`.
Missing env vars or HubSpot errors are swallowed — the tool never blocks on
tracking. The CTA links to
`https://dashboard.fitbudd.com/signup?utm_source=hashtag_generator&utm_medium=tool_cta&utm_campaign=lead_conversion`.

## Structure

```
api/
  track.ts                   Vercel serverless route → HubSpot Forms API
src/
  App.tsx                    536px wrapper
  components/
    HashtagGenerator.tsx     form, validation, modal state
    ResultsModal.tsx         centered results modal (Escape/backdrop/✕ close)
    PlatformHashtagBlock.tsx per-platform tags + tip + copy
    HashMark.tsx             orange rounded-square # mark
    SelectDropdown.tsx       single-select dropdown (closes on pick)
    MultiSelectChips.tsx     accessible multi-select chip group
    CTASection.tsx           Turn Content Into Clients CTA
  lib/
    generateHashtags.ts      deterministic generation engine
    tracking.ts              CTA constants + event posting to /api/track
    copy.ts                  clipboard helper with iframe fallback
  types.ts                   options + shared types
```
