# Hashtag Generator

Compact, embeddable hashtag tool for FitBudd. Paste a caption, pick target
platforms, and get platform-tailored hashtag sets — shown in a pop-up modal
with per-platform tips, copy buttons, a global Copy All, and a FitBudd CTA.
Hashtags come from Google Gemini when a key is configured, with a
deterministic built-in engine as the always-on fallback. Max width 536px,
designed for Webflow blog pages, landing pages, or iframes.
Sibling project to the Gym Name Generator and shares its design system.

**Stack:** React 19 · TypeScript · Tailwind CSS v4 · Vite, plus two Vercel
serverless routes: `api/generate.ts` (Gemini hashtag generation, optional)
and `api/track.ts` (HubSpot tracking, optional). There is deliberately no
email/name field — generation is gated by caption + platform only.

## Commands

```bash
npm install
npm run dev       # local dev server; /api/* is served too (copy .env.example → .env for Gemini). Tracking is skipped in dev.
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

## AI generation (Gemini)

When `GEMINI_API_KEY` is set, Generate Hashtags calls `/api/generate`
(`api/generate.ts`), a Vercel serverless route that asks Google Gemini for
caption-specific, per-platform hashtags. A free Google AI Studio key
(https://aistudio.google.com/apikey) is enough. Regenerate sends the tags
already shown so the next set is different.

- the key never leaves the server; the browser only talks to `/api/generate`
- the model must answer in a fixed JSON schema; `src/lib/aiHashtags.ts` then
  re-applies the built-in engine's rules to every tag (lowercase letters and
  digits only, spam tags dropped, no #fyp-style tags on LinkedIn / X /
  Facebook / Pinterest / Threads, the caption's own tags skipped, the spec's
  count ranges, a tag on at most 3 platforms) and tops up any short platform
  from the built-in engine
- anything that goes wrong — no key, quota exhausted, timeout (15 s), bad
  JSON — silently falls back to the built-in engine, so results always appear
- `GET /api/generate` answers `{ configured, model }` for a quick check after
  deploying; upstream errors are written to the Vercel function logs

```
GEMINI_API_KEY   required for AI generation; without it the built-in engine is used
GEMINI_MODEL     optional, defaults to gemini-3.5-flash-lite (fast, generous free quota);
                 gemini-3.8-flash is the higher-quality free alternative
```

Free-tier quotas are per Google project and per day; once exhausted the
tool keeps working on the built-in engine until they reset. `vercel.json`
raises the route's `maxDuration` to 30 s so a slow model answer is not cut
off by the platform default. Locally, `npm run dev` serves `/api/*` through
a small Vite middleware (`vite.config.ts`), so a `.env` with the key is all
you need to test the AI path.

## Built-in engine (fallback)

`src/lib/generateHashtags.ts` — deterministic client-side blending per
selected platform, used when AI is unavailable and to top up short AI sets:

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
them to HubSpot's Forms Submission API for FitBudd's Hashtag Generator form
(portal `9058640`, form `e7410680-1ea2-4f36-8f94-bde4cd94aa62`, region na1).
Those two IDs are public — they appear in the form's embed snippet — so they
are the defaults and tracking works with no configuration. Credentials stay
in **server** env vars; nothing HubSpot-related ships in the frontend bundle:

```
HUBSPOT_PORTAL_ID           optional — override the default portal
HUBSPOT_FORM_ID             optional — override the default form
HUBSPOT_PRIVATE_APP_TOKEN   optional — uses the authenticated secure-submit endpoint when set
VITE_TOOL_SOURCE            optional, defaults to hashtag_generator
VITE_TRACK_IN_DEV           dev only — 'true' sends events from `npm run dev` too
```

HubSpot rejects a whole submission if it names a field the form does not
define, so the route reads the form's public definition, sends only the
fields that exist, and logs what is missing. `GET /api/track` answers
`{ portalId, formId, authenticated, formFields, missingFields,
requiredButNeverSent }` — the quickest way to see whether the form is ready.

**Form setup (one-time, in HubSpot):** as of 2026-09-29 the form only has
`email` (required) and `firstname`, so nothing is recorded yet. To capture
the tool's data:

1. Settings → Properties → Contact properties → Create: one single-line text
   property per field below, using the exact internal name (`generated_hashtags`
   and `caption` are better as multi-line text).
2. Marketing → Forms → open the form → add those properties as fields.
3. Make **Email not required** (or remove it): this tool never collects an
   email, and a required field that is never sent rejects every submission.
   Submissions without an email are kept under the form's Submissions tab
   but do not create contacts.

Submissions appear under Marketing → Forms → the form → Submissions. Local
dev skips tracking unless `VITE_TRACK_IN_DEV=true`, because every event is
a real submission. HubSpot rejections are logged in the Vercel function logs.

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
  generate.ts                Vercel serverless route → Gemini (key stays server-side)
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
    aiHashtags.ts            /api/generate client: validates model output, local fallback
    generateHashtags.ts      deterministic generation engine + shared tag rules
    tracking.ts              CTA constants + event posting to /api/track
    copy.ts                  clipboard helper with iframe fallback
  types.ts                   options + shared types
vite.config.ts               build config + dev middleware serving api/*.ts locally
vercel.json                  30 s maxDuration for api/generate.ts
.env.example                 every env var, documented
```
