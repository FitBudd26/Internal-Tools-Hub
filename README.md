# FitBudd Internal Tools Hub

One repo, one Vercel project, many embeddable lead-magnet tools. Every tool is
its own page (`/<tool>/`), its own Webflow iframe embed and its own HubSpot
lead source, while sharing the FitBudd design system, the tracking route and
the build. The root page (`/`) is an internal, noindexed index that lists each
tool with its embed snippet.

| Tool | Path | What it does | HubSpot data |
| --- | --- | --- | --- |
| Hashtag Generator | `/hashtag-generator/` | Platform-tailored hashtag sets from a caption (Gemini, with a deterministic fallback), shown in a modal with copy buttons and a CTA | name + email |
| Fitness Challenge Generator for Coaches & Gyms | `/fitness-challenge-generator/` | Same single-screen design as the Hashtag Generator (dropdowns + name/email) → ready-to-run client challenge framework in the results modal (Gemini with a deterministic fallback), with a branded PDF download and a 30-day-trial CTA | name + email (selections too once its form has the fields) |
| Instagram Bio Generator | `/ig-bio-generator/` | Migrated from ig-bio-gen.vercel.app into the shared shell: business type, audience, specializations, tone, experience, location and USP → four bios in four angles (authority, results, community, value) within Instagram's 150 characters, plus eight username ideas; Gemini with the original templated engine as fallback | name + email (the original custom fields too once the form has them) |
| Fitness Recipe Generator for Coaches & Gyms | `/recipe-generator/` | Same design → three distinct, goal-aligned recipes that honour every dietary restriction and the coach's notes (Gemini with a 40-recipe library as fallback), approximate nutrition, coach notes, a logo-branded PDF, disclaimer and a free-trial CTA | name + email (selections too once its form has the fields) |

**Stack:** React 19 · TypeScript · Tailwind CSS v4 · Vite (multi-page) ·
jsPDF (client-side PDF) · two Vercel serverless routes shared by every tool:
`api/track.ts` (HubSpot lead capture) and `api/generate.ts` (Gemini
generation for hashtags, challenges and recipes; each tool keeps a
deterministic engine as fallback so it works without a key).

Every tool uses the same shell: 536 px max width, `max-w-[536px] mx-auto
p-4` wrapper, white card with soft shadow, 40 px inputs, 46 px primary
button, 13-14 px body text, 14 px bold orange centred header, 580 px iframe
fallback height with iframe-resizer auto-height, FitBudd orange / teal /
light-teal tint. Any list with more than five options is a dropdown.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173/ : index, /hashtag-generator/, /fitness-challenge-generator/, /recipe-generator/
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
`ca6c259d-e274-49fd-8cf0-b5515be51a34`, Recipe Generator
`b2222d23-1400-4bec-a812-e818740c59f5`, Instagram Bio Generator
`784af8e3-2341-4478-9ec4-8452914687db`. The IDs are public (they appear in
the forms' embed snippets). Nothing HubSpot-related ships in the bundle.

```
HUBSPOT_PORTAL_ID                             optional, override the portal
HUBSPOT_FORM_ID                               optional, overrides every tool's default form
HUBSPOT_FORM_ID_HASHTAG_GENERATOR             optional, per-tool form
HUBSPOT_FORM_ID_FITNESS_CHALLENGE_GENERATOR   optional, per-tool form
HUBSPOT_FORM_ID_RECIPE_GENERATOR              optional, per-tool form
HUBSPOT_FORM_ID_IG_BIO_GENERATOR              optional, per-tool form
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
- **Instagram Bio Generator**, `generation` (on Generate): `email`,
  `firstname`, `business_type`, `years_experience`, `location`,
  `specializations`, `target_audience`, `unique_selling_point`,
  `tone_preference`, `generation_count`, `generated_bios`,
  `generated_usernames`, `tool_source`, `campaign`, `page_url`,
  `submitted_at`; then `cta_click`. Its form is
  `784af8e3-2341-4478-9ec4-8452914687db`.
- **Recipe Generator**, `lead` (on Generate Recipes): `email`, `firstname`,
  `client_goal`, `preferred_protein`, `dietary_preference`, `meal_type`,
  `cooking_time`, `notes`, `generated_recipes`, `tool_source`, `campaign`
  (`lead_magnet`), `cta_destination` (`fitbudd_self_signup`), `page_url`,
  `submitted_at`; then `pdf_download` and `cta_click` with the email. Its
  form is `b2222d23-1400-4bec-a812-e818740c59f5`.

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

### AI generation (Gemini, shared by all three tools)

When a Gemini key is set, every tool's Generate button calls `/api/generate`
(`api/generate.ts`) with `tool: 'hashtags' | 'challenge' | 'recipes'`; the
route holds one prompt and one JSON schema per tool and the key never leaves
the server. For hashtags it asks for caption-specific, per-platform tags. A free Google AI Studio key
(https://aistudio.google.com/apikey) is enough. `aiHashtags.ts` re-applies
the built-in engine's rules to every tag (lowercase letters and digits only,
spam tags dropped, no #fyp-style tags on LinkedIn / X / Facebook / Pinterest
/ Threads, the caption's own tags skipped, the spec's count ranges, a tag on
at most 3 platforms) and tops up any short platform from the built-in engine.
Anything that goes wrong, no key, quota exhausted, 15 s timeout, bad JSON,
silently falls back to the built-in engine. Regenerate sends the tags already
shown so the next set is different.

```
GEMINI_API_KEY   required for AI generation; without it each tool's built-in engine is used.
                 geminiapi, GOOGLE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_GEMINI_API_KEY,
                 GEMINI_KEY, VITE_GEMINI_API_KEY and any name that looks like a Gemini/Google
                 API key (case-insensitive) are accepted too, so an existing Vercel variable
                 works without renaming
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
- Generation is Gemini-first (`aiChallenge.ts`): the model's framework is
  checked for completeness, matching weekly-theme count and the
  no-programming rule, then falls back to the deterministic engine in whole
  or in part. Regenerate asks for a different framework. A disclaimer sits
  under the results and at the end of the PDF.
- Nothing is emailed by the tool itself; a HubSpot workflow on the form can
  send a follow-up to the captured email if wanted.

## Fitness Recipe Generator for Coaches & Gyms

Same shell and design: Client Goal (dropdown) and Meal Type (multi-select)
on one row, Preferred Protein (multi-select, Eggs and Dairy separate,
Seafood beside Fish) and Dietary Preference (multi-select, optional) on the
next, Cooking Time as four chips, a collapsed optional "Client profile and
PDF branding" section (sex, age, height, weight, activity, business name;
nothing stored), an optional Notes textarea, name and email, then Generate
Recipes. No serving-size field. A complete profile turns into a daily
calorie target (Mifflin-St Jeor x activity, adjusted for the goal) and
per-meal targets that size the portions; the business name prints as
"Prepared by" on the PDF. Results open in the shared
modal: three recipe cards (name, meal type, time, approximate calories and
macros, goal alignment, description, ingredients and steps, coach note),
Download PDF, "Regenerate with different recipes", a disclaimer, and the CTA
("Turn Recipes Into a Scalable Coaching Experience", `Start Free Trial`,
`utm_source=recipe_generator`).

- Gemini-first (`aiRecipes.ts`): the prompt treats every dietary requirement
  and every dislike, allergy or intolerance in the notes as a hard
  constraint, asks for distinct recipes covering the requested meal types
  within the time limit, and sends previously shown names on Regenerate.
  Each returned recipe is checked (`dietViolation`: vegetarian / vegan /
  dairy-free / gluten-free keywords plus carb and protein limits for
  low-carb, keto and high-protein; the notes' disliked terms; the time
  limit; hype wording) and anything that fails is replaced from the
  built-in library.
- Who does what: Gemini invents every recipe, combination and its first
  nutrition estimate from the rules in the prompt. Our code then verifies
  each recipe and, whenever the ingredient list is recognised, recalculates
  the numbers from a reference table so they are checkable against the
  ingredients. Gemini's own figures are used only when an ingredient is
  outside the table, and those recipes are marked † (screen) / "model
  estimate" (PDF).
- Protein rules (`nutrition.ts`): proteins are drawn from across the set,
  one or two sources per recipe, never more; legumes never land in sweet or
  dessert-style dishes; no protein source the coach did not select (a splash
  of milk is not a protein, 30 g of cheddar is); for Fat Loss, High Protein
  and Muscle Building every main meal carries at least 25 g protein and a
  fat-loss meal never has more grams of fat than protein. Recipes that break
  any of this are dropped and replaced from the library.
- Honest quantities and macros (`nutrition.ts`): meat and fish are raw
  weights, grains and legumes cooked weights (both stated in the PDF), with a
  separate chicken-thigh entry; solids are grams plus exact ounces (cup
  figures for solids drift 20-40% and are never shown), liquids are
  millilitres plus recomputed cups, tablespoons or fl oz; salt above a
  quarter teaspoon per serving is rejected; for fat-loss or sub-500 kcal
  meals a tablespoon of oil becomes 2 tsp before the numbers are computed;
  spelled-out numbers in steps and notes become numerals. The reference table
  (about 90 foods) recomputes each recipe per serving; if the list is not
  recognised the model's figures stand with calories corrected to
  4 x protein + 4 x carbs + 9 x fat. The library's macros are computed the
  same way.
- Client profile: a complete profile gives a Mifflin-St Jeor daily target
  adjusted for activity and goal, never below 1,200 kcal (women) or 1,500
  kcal (men); when the formula lands under the floor the tool sizes at the
  floor and says so on screen and in the PDF. The disclaimer covers the
  target. Only the resulting calorie targets reach the AI; the profile is
  never stored or sent to HubSpot.
- White-label PDF: an optional coach logo (PNG/JPG, read in the browser,
  downscaled to 600 px and flattened onto white so the PDF stays small)
  replaces the FitBudd logo in the header; FitBudd stays in the footer
  credit. Placeholder business names ("abc", "test") are left off.
- When Gemini still returns a recipe that breaks a rule (a bean-only lunch
  under the protein floor, for instance) the client drops it and fills the
  slot from the library, so the coach never sees it; the model's compliance
  is good but not perfect on gemini-3.5-flash-lite.
- `generateRecipes.ts`: a 40-recipe library (quantities as numerals, metric
  first with the US measure in parentheses) filtered by protein, diet, meal
  type and time and ranked by goal fit and closeness to the per-meal calorie
  target. Dietary needs and dislikes are never relaxed; protein preference,
  time and meal type relax in that order and the coach is told when they do.
  Regenerate pushes already-shown recipes to the back. Notes without a real
  word ("mbjk") are ignored. Verified against the same validator in tests.
- `generatePdf.ts`: FitBudd logo (base64 PNG in `src/shared/logo.ts`,
  rendered from the site's SVG) in the header and footer of every page,
  "Prepared by" line, overview (never the coach's notes), recipe cards kept
  on one page each, ingredients, method, goal alignment, nutrition, coach
  notes, footnote and disclaimer, generated date in the footer; file name
  `fitbudd-recipe-generator.pdf`.
- Not built, pending a decision: a servings input with ingredient scaling.
  The tool spec removed serving size on purpose; the later review asked for
  it back.

## Instagram Bio Generator

Migrated from the standalone IG-Bio-Gen repo (ig-bio-gen.vercel.app). Same
inputs as before, now in the hub shell: Business Type and Target Audience
(dropdowns, required), Specializations (multi-select) and Tone (dropdown
with Auto), Years of Experience and Location, a USP textarea, then Name /
Business Name and Email. Results open in the shared modal: four bios in
four angles with a live character count and Copy, eight username ideas as
tap-to-copy chips with an availability caveat, Regenerate, the free-trial
CTA and a "Book a free demo" link (the original CTA).

- Gemini-first (`aiBios.ts`): the prompt asks for four bios under 140
  characters (headroom under Instagram's 150) in the four angles and the
  requested tone, plus eight handle ideas that follow Instagram's rules.
  Every bio is re-counted by grapheme (an emoji is one character), dashes
  and hashtags are stripped, over-long or duplicate bios are dropped, handles
  are sanitised, and anything short is topped up from the engine.
- `generateBios.ts`: the original templated engine, ported unchanged in
  content but made deterministic and seedable (Regenerate rotates variants),
  with Auto tone inference; plus `generateUsernames`, which builds handles
  from the name, niche, business type and location.

## Structure

```
index.html                         internal index (noindex) → src/hub
hashtag-generator/index.html       tool page (iframe-resizer child)
fitness-challenge-generator/index.html
recipe-generator/index.html
ig-bio-generator/index.html
api/
  track.ts                         shared HubSpot route: per-tool form + fields
  generate.ts                      shared Gemini route: hashtags, challenge, recipes
src/
  shared/
    index.css                      Tailwind theme (FitBudd colours) + iframe rules
    tools.ts                       tool registry + Webflow embed snippet
    logo.ts                        FitBudd logo as base64 PNG (for PDFs)
    disclaimers.ts                 recipe + challenge disclaimers
    components/                    SelectDropdown, MultiSelectDropdown, MultiSelectChips
                                   (≤5 options only), ToolModal, PdfDownloadButton,
                                   CTASection, HashMark, ToolMark
    lib/tracking.ts                postEvent, email validation (format + disposable
                                   domains blocked), trial URL
    lib/copy.ts                    clipboard helper with iframe fallback
  hub/                             index page
  tools/hashtag-generator/         HashtagGenerator, ResultsModal, PlatformHashtagBlock,
                                   generateHashtags, aiHashtags, tracking, types
  tools/fitness-challenge-generator/
                                   FitnessChallengeGenerator (form), ChallengeModal,
                                   ChallengePreview, aiChallenge, generateChallenge,
                                   generatePdf, tracking, types
  tools/ig-bio-generator/          IgBioGenerator (form), BioResultsModal, BioCard,
                                   aiBios, generateBios (+ usernames), tracking, types
  tools/recipe-generator/          RecipeGenerator (form), RecipeModal, RecipeCard,
                                   aiRecipes, generateRecipes (library), nutrition
                                   (estimator + protein rules), calorieTarget,
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
