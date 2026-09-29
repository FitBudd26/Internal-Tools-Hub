# FitBudd Internal Tools Hub

One repo, one Vercel project, many embeddable lead-magnet tools. Every tool is
its own page (`/<tool>/`), its own Webflow iframe embed and its own HubSpot
lead source, while sharing the FitBudd design system, the tracking route and
the build. The root page (`/`) is an internal, noindexed index that lists each
tool with its embed snippet.

| Tool | Path | What it does | HubSpot data |
| --- | --- | --- | --- |
| Hashtag Generator | `/hashtag-generator/` | Platform-tailored hashtag sets from a caption (Gemini, with a deterministic fallback), shown in a modal with copy buttons and a CTA | name + email |
| Fitness Challenge Generator for Coaches & Gyms | `/fitness-challenge-generator/` | Same single-screen design as the Hashtag Generator (dropdowns + name/email) → ready-to-run client challenge framework in the results modal, with a branded PDF download and a 30-day-trial CTA | name + email (selections too once its form has the fields) |

**Stack:** React 19 · TypeScript · Tailwind CSS v4 · Vite (multi-page) ·
jsPDF (client-side PDF) · two Vercel serverless routes: `api/track.ts`
(HubSpot lead capture, shared by all tools) and `api/generate.ts` (Gemini
hashtag generation).

## Commands

```bash
npm install
npm run dev       # http://localhost:5173/, index, /hashtag-generator/, /fitness-challenge-generator/
                  # /api/* is served too (copy .env.example → .env). Tracking is skipped in dev
                  # unless VITE_TRACK_IN_DEV=true, every event is a real HubSpot submission.
npm run build     # type-check (src + api) + production build → dist/
npm run preview   # serve the production build locally
```

## Deploying (Vercel)

Import the repo as one Vercel project, framework Vite, root directory `/`.
`api/` becomes the two serverless routes automatically; `vercel.json` raises
`api/generate.ts` to a 30 s max duration. Env vars: `GEMINI_API_KEY` (AI
hashtags; optional), plus the optional HubSpot overrides below. Free (Hobby)
limits are more than enough, 2 of 12 functions, small static pages, but
Hobby is for non-commercial use, so plan on Pro once the tools are live on
fitbudd.com.

After deploying, open `/api/track` (every tool's HubSpot form status) and
`/api/generate` (`configured: true` once the Gemini key is set).

## Embedding on Webflow

Open `/` on the deployment and copy the snippet for the tool. It is the same
pattern as the other FitBudd tools (iframe-resizer **v4** on both sides,
the child script is in each tool's `index.html`, so the page sizes itself and
no fixed height is needed):

```html
<div style="max-width:536px;margin:0 auto;">
  <iframe
    id="fitbudd-hashtag-generator"
    src="https://YOUR-DEPLOYMENT/hashtag-generator/"
    title="Hashtag Generator"
    scrolling="no"
    style="width:1px;min-width:100%;max-width:536px;height:720px;border:0;display:block;margin:0 auto;"
    loading="lazy"
    allow="clipboard-write"
  ></iframe>
</div>
<script src="https://cdn.jsdelivr.net/npm/iframe-resizer@4.3.9/js/iframeResizer.min.js"></script>
<script>
  iFrameResize({ checkOrigin: false, log: false }, '#fitbudd-hashtag-generator');
</script>
```

One tool per Webflow page keeps each lead magnet separately attributable.

## HubSpot lead capture (`api/track.ts`)

Every tool posts `{ tool, type, fields }` to `/api/track`, which forwards the
allowed fields to HubSpot's Forms Submission API. Defaults: FitBudd's portal
`9058640` (region na1) and one form per tool, Hashtag Generator
`e7410680-1ea2-4f36-8f94-bde4cd94aa62`, Challenge Generator
`ca6c259d-e274-49fd-8cf0-b5515be51a34`. The IDs are public (they appear in
the forms' embed snippets). Nothing HubSpot-related ships in the bundle.

```
HUBSPOT_PORTAL_ID                             optional, override the portal
HUBSPOT_FORM_ID                               optional, overrides every tool's default form
HUBSPOT_FORM_ID_HASHTAG_GENERATOR             optional, per-tool form
HUBSPOT_FORM_ID_FITNESS_CHALLENGE_GENERATOR   optional, per-tool form
HUBSPOT_PRIVATE_APP_TOKEN                     optional, authenticated secure-submit endpoint
VITE_TRACK_IN_DEV                             dev only, 'true' sends events from `npm run dev`
```

What each tool sends:

- **Hashtag Generator**, `generation`: `email`, `firstname`. Nothing else
  (caption, hashtags, CTA clicks) is recorded, by decision.
- **Fitness Challenge Generator**, `lead` (on Create My Challenge): `email`,
  `firstname`, `challenge_types`, `audience_types`, `fitness_levels`, `challenge_duration`,
  `equipment_availability`, `measurement_preferences`, `send_more_tools`,
  `generated_challenge_name`, `tool_source`, `campaign`, `cta_destination`,
  `page_url`, `submitted_at`. Then `pdf_download` (`pdf_downloaded`,
  `pdf_downloaded_at`, `challenge_name`) and `cta_click` (`cta_clicked`,
  `cta_text`, `cta_url`, `cta_clicked_at`), each with the email.

HubSpot rejects a whole submission if it names a field the form does not
define, so the route reads the form's public definition, sends only the
fields that exist, and logs the rest once per deployment. Secondary events
(PDF download, CTA click) are skipped when nothing but the email would
survive, so a form without those fields never receives duplicate leads. Every
submission carries the tool name as HubSpot's `pageName` context, so tools
sharing one form remain distinguishable in the submissions list.

Both forms currently have `email` + `firstname`, so both tools record name +
email today, each into its own form. To also capture the challenge
selections, add the fields above to the challenge form as single-line text
contact properties; the route starts sending them automatically. `GET
/api/track` shows, per tool, `formFields`, `missingFields` and
`requiredButNeverSent`. Leads appear
as contacts and under Marketing → Forms → the form → Submissions. HubSpot
rejections are logged in the Vercel function logs.

## Hashtag Generator

Caption, then topic and post type side by side, then platforms (multi-select
dropdown) and tone/goal (multi-select dropdown, optional), then name and
email. Validation: caption, at least one platform, name and a valid email,
compact inline errors, no browser alerts, button disabled until valid. Results open
in a centered modal with per-platform tips, per-tag and per-platform copy,
Copy All, Regenerate and the FitBudd CTA
(`https://dashboard.fitbudd.com/signup?utm_source=hashtag_generator&utm_medium=tool_cta&utm_campaign=lead_conversion`).

### AI generation (Gemini)

When `GEMINI_API_KEY` is set, Generate calls `/api/generate`
(`api/generate.ts`), which asks Google Gemini for caption-specific,
per-platform hashtags in a fixed JSON schema. A free Google AI Studio key
(https://aistudio.google.com/apikey) is enough. `aiHashtags.ts` re-applies
the built-in engine's rules to every tag (lowercase letters and digits only,
spam tags dropped, no #fyp-style tags on LinkedIn / X / Facebook / Pinterest
/ Threads, the caption's own tags skipped, the spec's count ranges, a tag on
at most 3 platforms) and tops up any short platform from the built-in engine.
Anything that goes wrong, no key, quota exhausted, 15 s timeout, bad JSON,
silently falls back to the built-in engine. Regenerate sends the tags already
shown so the next set is different.

```
GEMINI_API_KEY   required for AI generation; without it the built-in engine is used.
                 GOOGLE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_GEMINI_API_KEY,
                 GEMINI_KEY and VITE_GEMINI_API_KEY are accepted too (first one set wins),
                 so an existing Vercel variable works without renaming
GEMINI_MODEL     optional, defaults to gemini-3.5-flash-lite (fast, generous free quota);
                 gemini-3.8-flash is the higher-quality free alternative
```

`GET /api/generate` reports `keySource`, the env var name it found (never
the value), so a key that is set but not detected is easy to spot: it is
either under another name or scoped to the wrong Vercel environment
(Production vs Preview); env var changes also need a redeploy.

### Built-in engine (fallback)

`generateHashtags.ts`, deterministic blending per platform: caption keywords
and bigrams, ~20 curated topic expansions, post-type and tone tags, platform
norms (Instagram 15, TikTok 6, X 3, LinkedIn 5, YouTube 6, Facebook 4,
Pinterest 10, Threads 3; #fyp reserved on TikTok; viral/casual tags banned on
LinkedIn and X; spam-bait banned everywhere), a tag in at most 3 sets, the
caption's own hashtags never re-suggested.

## Fitness Challenge Generator for Coaches & Gyms

B2B lead magnet in the same design as the Hashtag Generator: one compact
form, challenge type(s) in a multi-select dropdown, audience, fitness
level, duration and equipment as dropdowns (two per row), measurement units
as four chips, name and email inline, an optional "Send me more tools for
coaches" checkbox, and Create My Challenge stays disabled until everything
required is valid (the name/email fields are the lead gate). Results open in the shared modal: name, subtitle, who it's
for, objective, how it works, four daily rules, weekly themes, scoring,
progress tracking, coaching notes and reusable client instructions, a
`Download PDF` button and the 30-day-trial CTA
(`utm_source=fitness_challenge_generator`).

- `generateChallenge.ts` is deterministic and never prescribes exercises,
  sets, reps or workouts: a challenge is rules, behaviours, targets,
  accountability mechanics and scoring that layer on top of the coach's
  existing program. Personalisation: Community Engagement / Online Community
  → leaderboards and visible check-ins; Corporate → simple participation and
  team completion rates; Social Media Audience → public prompts and lead-gen
  use; Mixed Levels → every rule scalable, effort cues relative; No Equipment
  / Bodyweight Only → no load tracking; both metric and US units selected →
  both shown (kg / lb, cm / in).
- `generatePdf.ts` builds the PDF in the browser with jsPDF (loaded on
  demand): cover, overview, designed-for, duration, objective, how it works,
  daily rules, weekly plan, client instructions, progress tracking, a
  day-by-day check-in grid, coach notes, optional scoring. FitBudd orange as
  the only accent, no sales copy, file name `<challenge-name>.pdf`.
- Nothing is emailed by the tool itself; a HubSpot workflow on the form can
  send a follow-up to the captured email if wanted.

## Structure

```
index.html                         internal index (noindex) → src/hub
hashtag-generator/index.html       tool page (iframe-resizer child)
fitness-challenge-generator/index.html
api/
  track.ts                         shared HubSpot route: per-tool form + fields
  generate.ts                      Gemini route for the Hashtag Generator
src/
  shared/
    index.css                      Tailwind theme (FitBudd colours) + iframe rules
    tools.ts                       tool registry + Webflow embed snippet
    components/                    SelectDropdown, MultiSelectDropdown, MultiSelectChips
                                   (≤5 options only), ToolModal, CTASection, HashMark, ToolMark
    lib/tracking.ts                postEvent, email validation, trial URL
    lib/copy.ts                    clipboard helper with iframe fallback
  hub/                             index page
  tools/hashtag-generator/         HashtagGenerator, ResultsModal, PlatformHashtagBlock,
                                   generateHashtags, aiHashtags, tracking, types
  tools/fitness-challenge-generator/
                                   FitnessChallengeGenerator (form), ChallengeModal,
                                   ChallengePreview, PDFDownloadButton, generateChallenge,
                                   generatePdf, tracking, types
vite.config.ts                     multi-page build + dev middleware serving api/*.ts
vercel.json                        30 s maxDuration for api/generate.ts
.env.example                       every env var, documented
```

## Adding a tool

1. Create `<slug>/index.html` (copy one of the tool pages) and
   `src/tools/<slug>/` with `main.tsx`, `App.tsx` and the tool.
2. Add the entry to `build.rollupOptions.input` in `vite.config.ts`.
3. Register it in `src/shared/tools.ts` (index page + embed snippet) and in
   `TOOLS` in `api/track.ts` (which HubSpot fields each event may carry).
4. Reuse `src/shared` for the fields, CTA, modal, tracking and the 536 px card
   layout. Design rule: any list with more than five options is a dropdown
   (`SelectDropdown` / `MultiSelectDropdown`); chips only for short lists.
   Two fields per row where they fit (`@container` + `@sm:grid-cols-2`).
