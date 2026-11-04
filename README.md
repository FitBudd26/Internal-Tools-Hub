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
| Instagram Bio Generator | `/ig-bio-generator/` | Migrated from ig-bio-gen.vercel.app into the shared shell: business type, audience, specializations, tone, experience, location and USP → four bios in four angles (authority, results, community, value) within Instagram's 150 characters; Gemini with the original templated engine as fallback | name + email (the original custom fields too once the form has them) |
| Instagram Username Generator | `/ig-username-generator/` | Migrated from ig-username-gen.vercel.app: niche(s), trainer type(s), tone chips and an optional keyword → ten short, brandable handles (lowercase letters, one separator at most, 3-18 characters, no numbers), Copy / Copy All, availability caveat; Gemini with the original engine as fallback | name + email (the original custom fields too once the form has them) |
| Gym Name Generator | `/gym-name-generator/` | Migrated from gym-name-gen.vercel.app: gym type(s), target audience(s), tone chips and an optional keyword → ten brandable gym names (Title Case, 4-24 characters, at most 4 words, no numbers, no existing gym brands), Copy / Copy All, availability caveat; Gemini with the original engine as fallback | name + email (the selections and names too once the form has the fields) |
| AI Workout Generator | `/ai-workout-generator/` | Migrated from ai-workout-builder-ten.vercel.app: Guided Mode (client, age, goal, location, intensity, type, duration, target area, notes) or Chat Mode (plain-language description) → a complete single-session plan (warm-up, exercises with sets, reps, rest, cues and modifications, cool-down, progression, weekly split, trainer notes) shown in full, with a branded PDF; Gemini with a built-in workout engine as fallback | email + "Are you a fitness professional?" (the session settings too once the form has the fields) |
| Pricing & Package Builder | `/pricing-package-builder/` | Migrated from pricing-package-builder.vercel.app: coaching format, niche, experience, services, program duration, income goal, hours and client capacity → three priced packages (Starter, Core, Premium), four strategy notes and a revenue projection, with Copy. The prices and revenue figures come from the tool's formula; Gemini writes the packages and notes around them, with the original copy as fallback | name + email |
| One Rep Max Calculator | `/one-rep-max-calculator/` | Migrated from 1-rpm-calculator.vercel.app: exercise, weight (lbs or kg), reps and an optional training goal → the 1RM estimate (Epley), a six-formula comparison and the training load chart, all from formulas, plus guidance from Gemini: a read on the estimate, a warm-up ramp, a four-week plan and coaching tips, with built-in guidance as fallback | email |
| Fitness Recipe Generator for Coaches & Gyms | `/recipe-generator/` | Same design → three distinct, goal-aligned recipes that honour every dietary restriction and the coach's notes (Gemini with a 40-recipe library as fallback), approximate nutrition, coach notes, a logo-branded PDF, disclaimer and a free-trial CTA | name + email (selections too once its form has the fields) |
| Atkins Diet Recipe Generator | `/atkins-recipe-generator/` | Three screens: recipe preferences (Atkins 20 with its phase, Atkins 40, or a flexible daily net-carb target; meal type, proteins, cuisine, cooking time, restrictions, ingredients to avoid or use) → lead gate → Gemini writes three original low-carb recipes for that plan (no recipe library: the route validates with Zod, computes nutrition from the ingredient quantities with reference data, checks every recipe against the plan rules, restrictions, proteins and time, and asks again for any that fail), shown as three tabs with full details, Copy, a single-recipe or three-recipe PDF (US Letter or A4), regenerate and the trial CTA | name + email + selections (once its form has the fields) |
| Fitness Content Calendar Generator | `/content-calendar-generator/` | Three screens: business type, niches, audience, platforms, goals, duration (7 / 14 / 30 days), with posts per week, tone, formats, offer, promotions, start date, language and instructions under Advanced Preferences → lead gate → the tool plans the schedule (local calendar dates on the frequency's weekdays, pillar balance for the goals, platform and format per slot) and Gemini writes every post in chunks (topic, hook, caption, creative direction, CTA, hashtags, production notes, a version for the second platform), validated and repaired; a calendar grid or list, each post in full with edit, copy and per-post rewrite, PDF, CSV and .ics exports, regenerate and the trial CTA | name + email + selections (once its form has the fields) |
| Personal Trainer Intake Form Generator | `/intake-form-generator/` | Three screens: business profile (business type, specializations, clientele, coaching format, form length, free-text requirements) → lead gate → Gemini writes a client intake questionnaire for that profile (no canned form: the route validates with Zod, enforces 10-14 / 16-22 / 24-30 questions and makes one repair attempt), shown in the modal with edit, reorder, remove, add, regenerate, a client-ready PDF (US Letter or A4, optional coach name and logo) and the trial CTA | name + email + selections (once its form has the fields) |

**Stack:** React 19 · TypeScript · Tailwind CSS v4 · Vite (multi-page) ·
jsPDF (client-side PDF) · five Vercel serverless routes:
`api/track.ts` (HubSpot lead capture) and `api/generate.ts` (Gemini
generation for hashtags, challenges and recipes; each tool keeps a
deterministic engine as fallback so it works without a key), plus
`api/generate-intake.ts` (Gemini for the Intake Form Generator),
`api/generate-recipes.ts` (Gemini for the Atkins Diet Recipe Generator) and
`api/generate-calendar.ts` (Gemini for the Fitness Content Calendar
Generator), all validated with Zod and without a canned fallback by design.

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
`api/` becomes the five serverless routes automatically; `vercel.json` raises
`api/generate.ts` to a 30 s, `api/generate-intake.ts` and
`api/generate-recipes.ts` to a 45 s and `api/generate-calendar.ts` to a
120 s max duration. Env vars: `GEMINI_API_KEY` (AI generation; optional for
every tool except the Intake Form, Atkins Recipe and Content Calendar
generators, which have no fallback), plus the optional HubSpot overrides
below. Free (Hobby)
limits are more than enough, 5 of 12 functions, small static pages, but
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
`784af8e3-2341-4478-9ec4-8452914687db`, Instagram Username Generator
`8ec4d71b-21b7-4639-9849-e47ae5bea96d`, Gym Name Generator
`5c18559b-00e9-4c90-8d3e-9769a93e4e47`, AI Workout Generator
`c50c2e53-ff2e-4d8c-82cd-fd0be0521aa8`, Pricing & Package Builder
`2f40041d-360e-47df-a02b-a0d841f37212`, One Rep Max Calculator
`185118b9-abb4-4332-b08e-3af075979186`. The IDs are public (they appear in
the forms' embed snippets). Nothing HubSpot-related ships in the bundle.

```
HUBSPOT_PORTAL_ID                             optional, override the portal
HUBSPOT_FORM_ID                               optional, overrides every tool's default form
HUBSPOT_FORM_ID_HASHTAG_GENERATOR             optional, per-tool form
HUBSPOT_FORM_ID_FITNESS_CHALLENGE_GENERATOR   optional, per-tool form
HUBSPOT_FORM_ID_RECIPE_GENERATOR              optional, per-tool form
HUBSPOT_FORM_ID_IG_BIO_GENERATOR              optional, per-tool form
HUBSPOT_FORM_ID_IG_USERNAME_GENERATOR         optional, per-tool form
HUBSPOT_FORM_ID_GYM_NAME_GENERATOR            optional, per-tool form
HUBSPOT_FORM_ID_AI_WORKOUT_GENERATOR          optional, per-tool form
HUBSPOT_FORM_ID_PRICING_PACKAGE_BUILDER       optional, per-tool form
HUBSPOT_FORM_ID_ONE_REP_MAX_CALCULATOR        optional, per-tool form
HUBSPOT_FORM_ID_INTAKE_FORM_GENERATOR         optional, per-tool form
HUBSPOT_FORM_ID_ATKINS_RECIPE_GENERATOR       optional, per-tool form
HUBSPOT_FORM_ID_CONTENT_CALENDAR_GENERATOR    required for that tool: it has no default form yet
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
  `tone_preference`, `generation_count`, `generated_bios`, `tool_source`,
  `campaign`, `page_url`,
  `submitted_at`; then `cta_click`. Its form is
  `784af8e3-2341-4478-9ec4-8452914687db`.
- **Instagram Username Generator**, `generation` (on Generate): `email`,
  `firstname`, `fitness_niches`, `trainer_types`, `tone_styles`, `keyword`,
  `generated_usernames`, `source`, `tool_source`, `campaign`, `page_url`,
  `submitted_at`; then `cta_click`. Its form is
  `8ec4d71b-21b7-4639-9849-e47ae5bea96d`.
- **Gym Name Generator**, `generation` (on Generate): `email`, `firstname`,
  `gym_types`, `target_audiences`, `tone_styles`, `keyword`,
  `generated_gym_names`, `source`, `tool_source`, `campaign`, `page_url`,
  `submitted_at`; then `cta_click`. Its form is
  `5c18559b-00e9-4c90-8d3e-9769a93e4e47`.
- **AI Workout Generator**, `lead` (on Generate): `email`,
  `are_you_a_fitness_professional` (the form's own dropdown, value for
  value), `workout_mode`, `workout_goal`, `workout_location`,
  `workout_intensity`, `workout_type`, `workout_duration`, `target_area`,
  `tool_source`, `campaign`, `page_url`, `submitted_at`; then `pdf_download`
  and `cta_click`. Its form is `c50c2e53-ff2e-4d8c-82cd-fd0be0521aa8`. This
  tool has a consent tick box, so the submission also carries the form's
  consent to process (`consentText` in the tool's config). The client's name
  and the injury notes are never sent.
- **Pricing & Package Builder**, `lead` (on Generate): `email`, `firstname`,
  `coaching_format`, `fitness_niche`, `experience_level`, `services_offered`,
  `program_duration`, `monthly_income_goal`, `hours_per_week`, `max_clients`,
  `starter_price`, `core_price`, `premium_price`, `tool_source`, `campaign`,
  `page_url`, `submitted_at`; then `cta_click`. Its form is
  `2f40041d-360e-47df-a02b-a0d841f37212`, built in HubSpot's newer form
  editor: the public definition endpoint refuses such forms, so the tool's
  config lists the form's fields itself (`knownFields`: `email`,
  `firstname`) and `GET /api/track` reports `formDefinition: "assumed"`.
  If you add fields to that form in HubSpot, add them to `knownFields` too.
- **One Rep Max Calculator**, `lead` (on Calculate): `email`,
  `calculator_exercise`, `calculator_1rm_result`, `calculator_unit`,
  `lead_source` (`1rm_calculator`), `tool_source`, `page_url`,
  `submitted_at`; then `cta_click`. Its form is
  `185118b9-abb4-4332-b08e-3af075979186`, also from the newer editor, with
  `knownFields: email` because the standalone calculator sent the email
  alone. Add the calculator fields to the form and to `knownFields` to
  record them.
- **Recipe Generator**, `lead` (on Generate Recipes): `email`, `firstname`,
  `client_goal`, `preferred_protein`, `dietary_preference`, `meal_type`,
  `cooking_time`, `notes`, `generated_recipes`, `tool_source`, `campaign`
  (`lead_magnet`), `cta_destination` (`fitbudd_self_signup`), `page_url`,
  `submitted_at`; then `pdf_download` and `cta_click` with the email. Its
  form is `b2222d23-1400-4bec-a812-e818740c59f5`.
- **Personal Trainer Intake Form Generator**: see its section below. Its
  form is `55a81db2-9d9b-4a2a-800f-d278463ea3fb`.
- **Atkins Diet Recipe Generator**: see its section below. Its form is
  `9aed9f27-e0a3-4e73-b7ae-ac958b89f4f1`.
- **Fitness Content Calendar Generator**: see its section below; it has no
  default form yet, so set `HUBSPOT_FORM_ID_CONTENT_CALENDAR_GENERATOR` first.

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
GEMINI_MODEL_INTAKE  optional, model for the Intake Form Generator only (defaults to GEMINI_MODEL)
GEMINI_MODEL_ATKINS  optional, model for the Atkins Diet Recipe Generator only (defaults to GEMINI_MODEL)
GEMINI_MODEL_CALENDAR  optional, model for the Fitness Content Calendar Generator only (defaults to GEMINI_MODEL)
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
four angles with a live character count and Copy, Regenerate, the free-trial
CTA and a "Book a free demo" link (the original CTA). Username ideas are
deliberately not part of this tool; a separate tool covers them.

- Gemini-first (`aiBios.ts`): the prompt asks for four bios under 140
  characters (headroom under Instagram's 150) in the four angles and the
  requested tone. Every bio is re-counted by grapheme (an emoji is one
  character), dashes and hashtags are stripped, over-long or duplicate bios
  are dropped, and anything short is topped up from the engine.
- `generateBios.ts`: the original templated engine, ported unchanged in
  content but made deterministic and seedable (Regenerate rotates variants),
  with Auto tone inference. Fallback only.

## Instagram Username Generator

Migrated from the standalone IG-username-Gen repo (ig-username-gen.vercel.app).
Same inputs in the hub shell: Fitness Niche/Specialty and Trainer Type
(multi-select dropdowns, required), Tone/Style chips, an optional Keyword,
then Full Name and Email. Results open in the shared modal: ten handles in a
two-column list with Copy on each, Copy All, an availability caveat,
Regenerate, and the original CTA copy ("92% of personal trainers using
FitBudd gave us 5 stars") with the free-trial link. The old tool's
full-screen expand button was dropped; the hub modal covers that need.

- Gemini-first (`aiUsernames.ts`): the prompt asks for 16 candidates built
  from the first name or brand, niche, role, tone and keyword under the
  tool's rules; every handle is validated (lowercase letters, one period or
  underscore at most, 3-18 characters, no numbers), de-duplicated, kept away
  from the previous set, and the best ten are shown, topped up from the
  engine when needed.
- `generateUsernames.ts`: the original engine, ported with its term
  dictionaries and ranking, made deterministic and seedable so Regenerate
  rotates the mix. Fallback only.

## Gym Name Generator

Migrated from the standalone Gym-Name-Gen repo (gym-name-gen.vercel.app).
Same inputs in the hub shell: Gym Type/Focus (the original twelve plus
HYROX Training Gym and Calisthenics Training Gym) and Target Audience
(multi-select dropdowns, required), Tone/Style chips (optional here; the old
tool required a tone without marking it), an optional Keyword, then Full
Name and Email. Results open in the shared modal: ten names in a two-column
list with Copy on each (long names wrap, they are never cut off), Copy All,
an availability caveat, Regenerate, and the original CTA copy with the same
self-sign-up link and UTM tags as the old tool (`utm_source=ai_tool`,
`utm_campaign=gym_name_generator`).

- Gemini-first (`aiGymNames.ts`): the prompt asks for 16 candidates that fit
  the gym type, audience and tone, in varied formats (Forge Athletics, The
  Iron Yard, GritHouse, House of Grit, Rivera Strength), using the keyword
  in three or four. Every name is validated (Title Case, 4-24 characters, at
  most 4 words, letters only, one possessive apostrophe or a trailing "Co."
  allowed, no existing gym brands, no filler such as Ultimate or Xtreme,
  and never the HYROX mark itself, which is a registered race brand),
  tidied (casing, curly apostrophes), de-duplicated, kept away from the
  previous set, and no single word carries more than three names. The best
  ten are shown, topped up from the engine when needed.
- `generateGymNames.ts`: the original deterministic engine, ported with its
  word pools, scoring and repetition control (pool of 20, top 10 shown).
  Fallback and top-up only; on Regenerate it serves the names not yet shown.
- The old tool posted to HubSpot straight from the browser with `VITE_`
  variables. The hub posts through `api/track.ts` like every other tool, so
  those variables are no longer needed.

## AI Workout Generator

Migrated from the standalone AI-Workout-Builder repo (a Next.js app at
ai-workout-builder-ten.vercel.app) onto the hub's shell and shared routes.

- **Two input modes**, as before. Guided Mode: Client Name, Age, Goal,
  Location, Intensity, Type, Duration, Target Area (all required) and
  Injuries / Limitations / Notes, with a "Use sample" link. Chat Mode: a
  plain-language description with three examples.
- **Lead capture moved onto the form.** The old tool showed a preview and
  asked for Email and "Are you a fitness professional?" in a second pop-up
  before the PDF. In the hub both sit on the form with the consent tick box,
  the results modal shows the whole plan, and the PDF downloads directly.
  The old post-download sign-up pop-up is now the modal's CTA, with the
  same self-sign-up link and UTM tags.
- **Gemini-first** (`aiWorkout.ts` + the `workout` spec in
  `api/generate.ts`). The prompt is the old tool's coaching brief: safety
  and injury rules, format honesty (a circuit is prescribed as rounds),
  push and pull balance, time budget, rest matched to rep range, no
  movement reuse, fat-loss honesty, fully specified rows. It also states
  the main-work budget in minutes for the session length.
- **The answer is checked in the browser** (`cleanPlan`), against what the
  model really sends: header rows and half-filled rows are dropped;
  repeated exercises and warm-up drills reused as working exercises are
  removed; a client who cannot jump (stated, knee pain, low intensity or
  60+) gets no jumps or burpees, and knee or lower-back limitations remove
  stretches such as child's pose or forward folds, topped up from the
  engine; straight sets that overshoot the clock lose a fourth set, then
  the last exercises, then a third set; tempo is kept only as digits on
  counted lifts; a label shared by every row ("Circuit:") is removed;
  names are Title Case; dashes become hyphens; commentary about how the
  plan was produced is cut from the trainer notes; guided mode keeps the
  form's own client name, goal and duration; a placeholder name such as
  "Client" is blanked; and the tool always prints its own disclaimer.
- **Speed.** A plan is a long answer, so the `workout` spec asks Gemini for
  light reasoning (`thinkingConfig`, dropped automatically if a model
  rejects it) and typically answers in about 4 seconds. A request that has
  not answered in 11 seconds, or fails with a 5xx, is asked once more
  inside a 26-second limit. A 429 (the free tier's rate limit) is never
  retried: the browser uses the built-in engine instead, as it does for
  any failure.
- **Built-in engine** (`generateWorkout.ts`), new in the hub: the old tool
  showed an error when the model failed. The engine builds a session from
  an exercise library by the same rules: equipment by location, limitations
  read from the notes (knee, back, shoulder, wrist, no jumping), straight
  sets or a real circuit / HIIT / Tabata / EMOM / AMRAP / mobility flow,
  sets by intensity and age, a time budget that fits the duration, and a
  weekly split that names the complementary day. `parseChatPrompt` reads
  goal, duration, age, location and limitations out of a Chat Mode
  description for the same purpose. Regenerate sends the previous
  exercises so the next session differs.
- **PDF** (`generatePdf.ts`): logo header, title, summary card, format,
  warm-up, exercise cards kept whole on a page, cool-down, progression,
  weekly split, trainer notes, disclaimer and a linked call to action.
- The iframe fallback height is 760 px here (the form is taller than the
  other tools); iframe-resizer still sizes it exactly.
- No longer needed from the old project: `GEMINI_API_KEY` there, the
  Anthropic / OpenAI provider switches and the Resend email route.

## Pricing & Package Builder

Migrated from the standalone Pricing-package-builder repo (a single
`index.html` at pricing-package-builder.vercel.app).

- **Same inputs** in the hub shell: Coaching Format, Fitness Niche,
  Experience, Services Offered (multi-select), Program Duration, Monthly
  Income Goal, Hours per Week, Max Clients (stepper, 5-100), then Full Name
  and Email. The old two-tab layout is gone: results open in the shared
  modal with the summary strip, three package cards (Core marked Most
  Popular), four strategy notes, the revenue table, Copy, Regenerate, and
  the original CTA and "See how it works" links with their UTM tags.
- **The numbers are the tool's own** (`generatePricing.ts`): tier prices,
  the 30/50/20 client split and the revenue projection are calculated by
  the formula ported from the old tool. A test runs the old tool's own
  function against the port for every format, experience, duration, goal
  and client count and requires identical prices.
- **Gemini writes the offer** (`aiPricing.ts` + the `pricing` spec in
  `api/generate.ts`): package names, taglines, who each tier suits, what
  each tier includes, the delivery line and the four notes. It is given the
  prices and figures as fixed facts and told to quote nothing else. The
  answer is checked in the browser: generic or repeated names fall back; a
  tier never promises a service the coach did not select; each tier offers
  at least as much as the one below; and a note that quotes a dollar amount
  or a percentage the tool did not calculate is replaced by the built-in
  note. The old tool had no AI; its copy is now the fallback.
- **Group coaching** keeps the old tool's rule: per-member prices with a
  floor for each tier (45 / 75 / 110), shown as "/member/mo".
- Two changes to the built-in notes: an invented market benchmark and an
  unsourced retention statistic were removed, and the shortfall note no
  longer suggests upgrading more Core clients than exist.

## One Rep Max Calculator

Migrated from the standalone 1RPM-Calculator repo (a single `index.html` at
1-rpm-calculator.vercel.app).

- **Inputs**: Exercise (Bench Press preselected), Weight Lifted with a
  lbs / kg toggle, Reps Completed (1 to 12 and 15, now a dropdown), an
  optional Training Goal (new, it only shapes the guidance) and Email. The
  old tool showed blurred results and asked for the email to unlock them;
  here the email is on the form and the results open in the shared modal.
- **The numbers are formulas** (`calculate.ts`): Epley as the headline, the
  comparison across Epley, Brzycki, Lombardi, Mayhew, O'Conner and Wathan
  with highest, lowest and average, and the ten-zone training load chart. A
  test runs the old tool's own function against the port for 13,000 sets
  and requires identical results, and the old README's six verification
  cases are checked too. One rep lifted is shown as a true max, and sets
  above 12 reps carry the accuracy note.
- **Gemini adds the guidance** (`aiGuidance.ts` + the `onerm` spec in
  `api/generate.ts`): a two-sentence read on how far to trust the estimate,
  a warm-up ramp, a four-week plan for the lift and three coaching tips. It
  answers in percentages of the max and the tool turns them into weights
  (nearest 5 lbs or 2.5 kg). The answer is checked in the browser: reps
  must be possible at the percentage (ten reps at 90 percent replaces the
  whole plan), the warm-up must climb and stay below the working sets, and
  the text may quote only weights the formulas produced. The old tool had
  no AI; `generateGuidance.ts` is the fallback.
- Copy Results, Regenerate guidance and Recalculate; the original CTA and
  "Powered by FitBudd" links with their UTM tags; a disclaimer.

## Personal Trainer Intake Form Generator

B2B lead magnet in the shared shell at `/intake-form-generator/`. Three
screens in one 536 px card, all within the 580 px embed height:

1. **Trainer configuration**: `Your Coaching Business` (dropdown),
   `Coaching Specialization` and `Who Do You Coach?` (multi-select dropdowns,
   up to six each), `Coaching Format`, `Form Length` (quick 10-14, standard
   16-22, comprehensive 24-30) and a 60 px `Specific Questions or
   Requirements` textarea (500 characters). `Generate My Intake Form` only
   moves to the gate; Gemini is not called yet.
2. **Lead gate**: `Your Custom Intake Form Is Almost Ready`, `Full Name`,
   `Work Email` (format + disposable domains) and the privacy policy link
   (no marketing tick box, by decision). `Create My Intake Form` sends the lead to HubSpot, then asks
   Gemini, then opens the modal. Going back keeps every selection; closing
   the modal leaves an `Open My Intake Form` button, no second generation.
3. **Results modal** (`Your Custom Intake Form Is Ready`): editable title,
   `N Questions · M Sections · T min`, the model's review notice, every
   section and question (type badge, required mark, a sketch of the answer
   area) with move up / down, edit (wording, type, required, options, help
   text, rating labels), remove and `+ Add a question`; `PDF options` (coach
   or business name, an optional PNG / JPG logo that never leaves the
   browser, US Letter or A4); `Download PDF`; `Regenerate form` and `Change
   settings`; coach notes; the disclaimer; and the CTA `Turn Your Intake
   Form Into a Complete Coaching Experience` with three value points and
   `Start Your 30-Day Free Trial`
   (`utm_source=personal_trainer_intake_form_generator&utm_medium=tool_cta&utm_campaign=lead_conversion`).

- **Generation is Gemini-only** (`api/generate-intake.ts`, `aiIntake.ts`).
  There is no built-in question bank: when the route is not configured
  (503), rate limited (429, shown as `We're experiencing high demand. Please
  try generating your form again shortly.`) or returns an answer that fails
  validation twice (502), the gate shows the message and a `Try Again`
  button. The route validates the request with Zod (`schema.ts`), strips
  control and markup characters from the trainer's free text and quotes it
  as content guidance the model must not treat as instructions, builds the
  prompt from the business type, specializations (each with the areas it
  should draw from), clientele, format (each with its logistics questions),
  length and a variation seed (regenerate), and asks for JSON in a fixed
  response schema with `thinkingLevel: 'low'` (dropped if the model rejects
  it). The answer is parsed with Zod and cleaned: dashes to hyphens,
  duplicate questions dropped, choice questions without two options become
  short text, acknowledgments are always required, rating labels default to
  Low / High, ids reassigned (`q_001`…, `s_01`…). The total must fall in
  the chosen range; otherwise one controlled repair attempt tells the model
  what was wrong. After that a form still too long is trimmed of optional
  questions from the end (`trimmed: true` in the response); one still too
  short is a 502 `invalid`. Nothing is stored server-side.
- **Free-tier protection**: 12 requests per IP per 10 minutes and 4
  in-flight requests per function instance (429 `rate_limited`), a 429 from
  Gemini passed through as 429, at most two model calls per request, 40 s
  budget inside the 45 s function limit. `GEMINI_MODEL_INTAKE` picks a
  model for this tool alone (default `GEMINI_MODEL`, then
  `gemini-3.5-flash-lite`). `GET /api/generate-intake` reports `configured`,
  `model`, `keySource` and the limits.
- **Editing and the PDF share one object.** The modal edits the
  questionnaire through `questionUtils.ts`; `generatePdf.ts` builds the PDF
  from that same object with jsPDF (loaded on demand, compressed): orange
  top band, `CLIENT INTAKE QUESTIONNAIRE` eyebrow, title, optional
  `Prepared by`, description, question count and time, client name and
  date fields, numbered sections with an orange rule, numbered questions
  with the answer area each type needs (one writing line, a three-line
  area, Yes / No boxes, one- or two-column choices (radio circles for
  single-select, checkboxes for multi-select), a labelled 1-5
  scale, a date line with the regional hint, a tick box for
  acknowledgments), a running header and `Page X of Y` on every page, an
  `Anything else you would like your coach to know?` area and a one-line
  non-medical note. A question and its answer area never split across
  pages and a heading never sits alone at a page foot. The FitBudd logo is
  the small footer mark and the top-right mark unless the coach adds their
  own logo. Text outside Helvetica's encoding (emoji) is dropped. File name
  from the title, e.g. `online-coaching-client-intake-form.pdf`, fallback
  `fitbudd-personal-trainer-intake-form.pdf`.
- **Tests**: `node scripts/intake-pdf-check.mjs [out-dir] [questionnaire.json …]`
  builds 10-, 20- and 28-question fixtures plus an edge-case form in Letter
  and A4 and checks each PDF (valid file, page count, every question
  present, page numbers on every page, client name and date fields, no
  empty pages); `swift scripts/render-pdf-pages.swift file.pdf out-prefix`
  renders the pages for a visual pass.
  `BASE=http://localhost:5173 node scripts/intake-acceptance.mjs [out-dir]`
  runs the acceptance test against a configured route (`npm run dev` with
  `GEMINI_API_KEY` in `.env`, or a deployment): an online weight-loss coach
  for busy professionals, an in-person strength coach for advanced
  athletes, a beginner yoga instructor and a hybrid trainer for busy
  parents; it checks ranges, unique ids, no duplicates, options on choice
  questions, on-niche vocabulary (no one rep max questions on a yoga form)
  and the pairwise difference between the personas, and saves each
  questionnaire as JSON so the PDF check can build the real PDFs from them.
- **HubSpot**: form `55a81db2-9d9b-4a2a-800f-d278463ea3fb` (set
  `HUBSPOT_FORM_ID_INTAKE_FORM_GENERATOR` to point the tool elsewhere). The
  route reads the form's public definition and sends only the fields it
  defines. Today that is `email` and `firstname`, so the lead carries just
  those two and the secondary events below are skipped. Add any of the
  fields below to the form as single-line text contact properties
  (Marketing → Forms, classic editor) and the route starts sending them on
  the next submission; `GET /api/track` lists what the form still lacks
  under `missingFields`. Events: `lead` (on
  `Create My Intake Form`, before Gemini): `email`, `firstname`, `lastname`,
  `coaching_business_type`, `coaching_specializations`, `target_clientele`,
  `coaching_format`, `intake_form_length`, `intake_custom_requirements`,
  `lead_magnet_source` (`personal_trainer_intake_form_generator`), `lead_magnet_type`
  (`intake_form`), `tool_source`, `campaign` (`lead_magnet`),
  `cta_destination`, `utm_source`, `utm_medium`, `utm_campaign`,
  `utm_content`, `page_url`, `submitted_at`; then `generated`
  (`form_generated`, `form_generated_at`, `generated_form_title`,
  `question_count`), `regenerate` (`form_regenerated`,
  `form_regenerated_at`), `pdf_download` (`pdf_downloaded`,
  `pdf_downloaded_at`, `generated_form_title`) and `cta_click`
  (`cta_clicked`, `cta_text`, `cta_url`, `cta_clicked_at`), each with the
  email. The lead is sent once per email + settings; regenerating, editing
  and downloading never resubmit it. Only the business profile goes to
  Gemini, never the name or email. The tool generates blank
  questionnaires, so no client answers ever reach HubSpot or the server.
- **Attribution from the Webflow page.** The iframe cannot read the
  parent page's UTM parameters or HubSpot cookie. Either append them to the
  iframe `src` (`?utm_source=…`) or let the page send them: the tool posts
  `{ type: 'fitbudd-tool:ready' }` to its parent on load and accepts
  `{ type: 'fitbudd-tool:attribution', utm: { utm_source, utm_medium,
  utm_campaign, utm_content }, pageUrl, hutk }` from `fitbudd.com`,
  `www.fitbudd.com` and `*.webflow.io` origins only (`attribution.ts`); the
  route forwards `hutk` as HubSpot submission context. Parent snippet for
  the Webflow page:

  ```html
  <script>
    window.addEventListener('message', function (e) {
      if (!e.data || e.data.type !== 'fitbudd-tool:ready') return;
      var p = new URLSearchParams(location.search);
      var utm = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) {
        if (p.get(k)) utm[k] = p.get(k);
      });
      var hutk = (document.cookie.match(/(?:^|; )hubspotutk=([a-f0-9]{32})/) || [])[1];
      e.source.postMessage({ type: 'fitbudd-tool:attribution', utm: utm, pageUrl: location.href, hutk: hutk }, e.origin);
    });
  </script>
  ```

## Atkins Diet Recipe Generator

B2B lead magnet in the shared shell at `/atkins-recipe-generator/`. Three
screens in one 536 px card, all within the 580 px embed height:

1. **Recipe preferences**: `Atkins Plan` (Atkins 20, Atkins 40, Flexible
   Low-Carb; default Atkins 20), `Atkins Phase` (shown only for Atkins 20:
   Induction, Ongoing Weight Loss, Pre-Maintenance, Lifetime Maintenance;
   the other plans show their framework in that slot instead), `Meal Type`
   (Breakfast, Lunch, Dinner, Snack, Dessert, Meal Prep), `Preferred
   Protein` (multi-select, up to five; Eggs and Dairy separate, Fish and
   Seafood separate, `No Preference` exclusive), `Cuisine` (nine options),
   `Cooking Time` (under 15 / 30 / 45 minutes or no preference), and an
   `Additional Preferences` section: `Dietary Restrictions` (multi-select;
   `No Restrictions` exclusive), the daily net-carb range for the Flexible
   plan (20-30, 30-50, 50-75 or 75-100 g), `Ingredients to Avoid` and
   `Ingredients Available` (160 characters each). A protein that conflicts
   with a restriction (Chicken with Vegan, Dairy with Dairy-Free) is named in
   an amber notice and left out; the restriction wins. There is no serving
   size input: every recipe is written for one standard serving and says so.
   `Generate Recipes` only moves to the gate; Gemini is not called yet.
2. **Lead gate**: `Your Low-Carb Recipes Are Almost Ready`, `Full Name`,
   `Email Address` (format + disposable domains) and the privacy policy link
   (no marketing tick box, by the same decision as the intake tool). `Get My
   Recipes` sends the lead to HubSpot, then asks Gemini, then opens the
   modal; nothing is shown unless three recipes pass validation. Going back
   keeps every selection; closing the modal leaves an `Open My Recipes`
   button, no second generation.
3. **Results modal** (`Your Atkins-Friendly Recipes Are Ready`, subtitle plan
   · meal · cuisine): three recipe tabs (name, meal type, total time, net
   carbs, `Meets plan guidelines` or `Verify nutrition`), the selected
   recipe in full (description, times, plan fit line with the review status,
   ingredients for 1 serving, numbered instructions, the six nutrition
   figures with an honest status line, substitutions, the model's note),
   `PDF page size` (US Letter / A4), `Download PDF` (the selected recipe),
   `Copy Recipe`, `Download All 3 (PDF)`, `Generate More Recipes`,
   `Change preferences`, the dietary note and the non-affiliation notice,
   and the CTA `Turn Recipes Into a Complete Coaching Experience` with three
   value points and `Start Your 30-Day Free Trial`
   (`utm_source=atkins_recipe_generator&utm_medium=tool_cta&utm_campaign=lead_conversion`).

- **Atkins logic lives in `atkinsRules.ts`, apart from the prompt.** Each
  plan and phase is a profile: the daily net-carb framework (about 20 g for
  Induction; typically 25-50 g, 50-80 g and 60-100 g for phases 2 to 4;
  about 40 g for Atkins 40; the user's own range for Flexible, which is
  never called an Atkins plan), the foods to build on, the foods allowed in
  measured portions (nuts, seeds, berries and plain dairy from Phase 2;
  fruit, legumes, starchy vegetables and whole grains in small portions
  from Phase 3 and on Atkins 40), the foods to leave out, and regex rules
  that enforce them on ingredient names (grains and flours, starchy
  vegetables, legumes, nuts and seeds, berries, higher-carb fruit, milk and
  yogurt, sugars and sweetened sauces) with portion caps for the measured
  groups. The 20 g or 40 g is a DAILY budget: one main meal may use about
  half of it, a snack or dessert under a third, and a recipe over that
  guide is rejected rather than labelled compatible. The same module holds
  the restriction rules (Vegetarian, Vegan, Dairy-Free, Gluten-Free,
  Nut-Free, Egg-Free, with allow-lists so almond milk, coconut cream, flax
  eggs or tamari do not trip them), the avoid-list check, the selected
  protein check (a recipe must use a selected protein and must not sneak
  in another main protein), the cooking-time limit and the per-meal
  net-carb guide. `planPromptLines` turns the profile into prompt text.
- **Nutrition is computed, not invented** (`nutrition.ts`). Every
  ingredient the model returns carries a numeric quantity and a unit (g,
  ml, tbsp, tsp, cup, piece, slice, clove, pinch, to taste). A reference
  table of about 290 foods (about 1,080 names) with USDA FoodData Central style figures per
  100 g (kcal, protein, total carbs, fiber, fat) plus unit weights converts
  each line to grams and sums calories, protein, total carbs, fiber, net
  carbs (total minus fiber; erythritol, allulose, xylitol and maltitol carry
  their own net figure instead of being subtracted wholesale) and fat.
  Seasonings count as recognised but weightless; one-letter slips in longer
  names still match. When at least 90% of the ingredient weight is covered
  the figures are shown as `calculated` (approximate); otherwise the
  model's own estimate is used only if it is internally consistent and is
  labelled `AI estimate, not verified`; otherwise the recipe shows
  `Nutrition not calculated`. The status drives the review badge:
  `meets_plan_guidelines` only for calculated recipes, otherwise
  `requires_nutrition_verification`.
- **Generation is Gemini-only** (`api/generate-recipes.ts`, `aiRecipes.ts`).
  The route validates the request with Zod (`schema.ts`), strips control and
  markup characters from the free text, builds the prompt from the spec's
  recipe-developer instruction, the plan profile, a cuisine direction
  (Indian: tandoori, paneer, cauliflower; Mediterranean: grilled fish,
  olive oil, herbs; Mexican: fajita bowls, lettuce tacos, avocado; and so
  on) and a meal-type direction, and asks for JSON in a fixed response
  schema with structured ingredients, a nutrition estimate and
  substitutions (`thinkingLevel: 'low'`, dropped if the model rejects it).
  Each returned recipe is cleaned, its nutrition computed, and it is judged
  by `checkRecipe`; near-duplicates of an accepted recipe (same main
  ingredients) are rejected too. Recipes that pass are kept; a second and,
  if needed, third call asks only for the missing ones, naming the rejected
  recipes and why. Fewer than three after that is a 502 `invalid`, and the
  gate shows `We couldn't generate your recipes right now. Please try
  again.` with a `Try Again` button. Rate limits: 12 requests per IP per
  10 minutes and 4 in flight per instance (429), a 429 from Gemini passed
  through, at most three model calls per request, 40 s budget inside the
  45 s function limit. `GEMINI_MODEL_ATKINS` picks a model for this tool
  alone (default `GEMINI_MODEL`, then `gemini-3.5-flash-lite`, a free-tier
  Flash model; the route never switches models on its own).
  `GET /api/generate-recipes` reports `configured`, `model`, `keySource`
  and the limits. Nothing is stored server-side; the user's name and email
  never reach Gemini.
- **One recipe object feeds the tabs, the copy text and the PDF**
  (`recipeUtils.ts`, `generatePdf.ts`). The PDF (jsPDF, compressed) has an
  orange top band, the FitBudd logo, a `LOW-CARB RECIPE` eyebrow, the recipe
  title (or `Low-Carb Recipe Collection`), the plan / phase, meal type,
  cuisine and times, the description, a tinted plan-fit box, ingredients for
  one serving, numbered instructions, a six-cell nutrition table with the
  status line, substitutions, the model's note, an `Important dietary notes`
  block (the general note, the pregnancy / medical / medication precaution
  and the non-affiliation notice), a running header and `Page X of Y` on
  every page. Headings never sit alone at a page foot. File names:
  `atkins-<recipe-name>.pdf` for one recipe, `atkins-low-carb-recipes.pdf`
  for the collection.
- **Tests**: `node scripts/atkins-pdf-check.mjs [out-dir] [recipe-set.json …]`
  builds a three-recipe collection, a long-names-and-steps set with special
  characters and a set with every nutrition status, as the collection and as
  single-recipe PDFs in Letter and A4, and checks each (valid file, page
  count, every title, first ingredient and first step present, the section
  headings, the net-carb cell, the dietary notes, page numbers, file names);
  `swift scripts/render-pdf-pages.swift file.pdf out-prefix` renders pages
  for a visual pass. `BASE=http://localhost:5173 node
  scripts/atkins-acceptance.mjs [out-dir]` runs the spec's four scenarios
  against a configured route: Atkins 20 Phase 1 dinner with chicken,
  Mediterranean, under 30 minutes (no rice, pasta or starchy sides); Atkins
  20 Phase 2 breakfast with eggs and dairy, American, under 15 minutes;
  Atkins 40 lunch with fish and seafood, Asian, under 30 minutes; and an
  Induction dinner that is dairy-free and nut-free. It checks three distinct
  recipes, quantities, instructions, time, nutrition status, the meal
  guide, proteins, cuisine and excluded foods, compares the scenarios
  pairwise, and saves the sets as JSON for the PDF check.
- **HubSpot**: form `9aed9f27-e0a3-4e73-b7ae-ac958b89f4f1` (set
  `HUBSPOT_FORM_ID_ATKINS_RECIPE_GENERATOR` to point the tool elsewhere). The
  route reads the form's public definition and sends only the fields it
  defines. Today that is `email` and `firstname`, so the lead carries just
  those two and the secondary events below are skipped. Add any of the
  fields below to the form as single-line text contact properties
  (Marketing → Forms, classic editor) and the route starts sending them on
  the next submission; `GET /api/track` lists what the form still lacks
  under `missingFields`. None of the custom fields exist as contact
  properties yet, except `internal_src` (the portal's "page or CTA that
  sourced this lead") and the UTM properties, which the lead also carries.
  Events: `lead` (on `Get My Recipes`, before Gemini): `email`,
  `firstname`, `lastname`, `atkins_plan`, `atkins_phase` (the phase, the
  flexible range, or `Not applicable`), `meal_type`, `preferred_proteins`,
  `cuisine`, `cooking_time`, `dietary_restrictions`, `lead_magnet_source`
  and `tool_source` and `internal_src` (`atkins_recipe_generator`),
  `lead_magnet_type` (`atkins_recipes`), `campaign` (`lead_magnet`),
  `cta_destination`, `utm_source`, `utm_medium`, `utm_campaign`,
  `utm_content`, `page_url`, `submitted_at`; then `generated`
  (`recipes_generated`, `recipes_generated_at`, `generated_recipes`),
  `regenerate` (`recipes_regenerated`, `recipes_regenerated_at`,
  `generated_recipes`), `pdf_download` (`pdf_downloaded`,
  `pdf_downloaded_at`, `pdf_file_name`) and `cta_click` (`cta_clicked`,
  `cta_text`, `cta_url`, `cta_clicked_at`), each with the email. The lead
  is sent once per email + preferences; regenerating and downloading never
  resubmit it. Attribution from the Webflow page works exactly as for the
  intake tool (`src/shared/lib/attribution.ts`, same parent snippet).
- **Safety copy**: the modal and the PDF carry `Recipes are for general
  information. Nutrition values may be estimates. Consult a qualified
  professional before making major dietary changes.`, the extra precaution
  for pregnancy, medical conditions and medication affected by carbohydrate
  intake, and a notice that FitBudd is not affiliated with or endorsed by
  Atkins Nutritionals. The prompt forbids fat-loss, metabolic and medical
  claims, ketosis guarantees, copied recipes and Atkins branding; the tool
  asks for no medical history.

## Fitness Content Calendar Generator

B2B lead magnet in the shared shell at `/content-calendar-generator/`. Three
screens in one 536 px card, all within the 580 px embed height:

1. **Content strategy inputs**: `Your Fitness Business` (dropdown, eleven
   types), `Your Fitness Niche` (multi-select, up to five), `Your Target
   Audience` (up to four), `Target Platforms` (up to four of Instagram,
   TikTok, Facebook, LinkedIn, YouTube, Pinterest, Threads, Twitter/X), `Your
   Content Goals` (up to four) and `Calendar Duration` (7 / 14 / 30 days,
   default 30). `Advanced Preferences` holds `Posts Per Week` (3, 4, 5 or
   daily; default 5), `Brand Tone`, `Content Formats`, `Language` (English
   plus seven others), `Main Offer / Service`, `Key Promotions`, `Calendar
   Start Date` (defaults to today in the browser's local calendar; the hint
   under it shows how many posts the chosen window holds) and `Additional
   Instructions`. `Generate My Content Calendar` only moves to the gate;
   Gemini is not called yet.
2. **Lead gate**: `Your Content Calendar Is Almost Ready`, `Enter your
   details to create and download your personalized calendar.`, `Full
   Name`, `Email Address` (format + disposable domains) and the privacy
   policy link (no marketing tick box, by the same decision as the other
   tools). `Create My Calendar` sends the lead to HubSpot, then asks Gemini
   while the button reads `Creating your content strategy...` and then
   `Building your calendar...`, then opens the modal. Nothing is shown until
   the answer is validated. Going back keeps every selection; closing the
   modal leaves an `Open My Calendar` button, no second generation.
3. **Results modal** (`Your Content Calendar Is Ready`): the summary
   (`30-Day Content Calendar`, `17 Planned Posts · Instagram + Facebook`,
   date range, frequency, primary goal, the model's strategy summary, the
   pillar shares with planned counts), a notice if any planned post could
   not be written, a `Calendar` / `List` toggle (a week-by-week grid with
   pillar-coloured platform tags, or chronological cards with date,
   platforms, format, pillar, topic and hook), the selected post in full
   (hook, caption, visual direction, CTA, hashtags, production notes, the
   second platform's version, status Draft) with `Copy Caption`, `Copy
   Hashtags`, `Edit Post` (topic, hook, caption, CTA, visual direction,
   publishing date; the weekday follows the date) and `Regenerate Post`,
   then `PDF page size`, `Download PDF`, `Download CSV`, `Download .ics`,
   `Regenerate Calendar`, `Change settings`, a review note, and the CTA
   `Turn Your Content Into Paying Clients` with three value points and
   `Start Your 30-Day Free Trial`
   (`utm_source=fitness_content_calendar_generator&utm_medium=tool_cta&utm_campaign=lead_conversion`).

- **The schedule is planned before the model writes a word**
  (`dateScheduler.ts`, `contentStrategy.ts`). Dates are local calendar
  dates (never UTC timestamps): 3 posts per week fall on Monday, Wednesday
  and Friday, 4 on Monday, Tuesday, Thursday and Friday, 5 on weekdays,
  daily on every day, inside the window that starts on the chosen date, so
  7 days at 3 per week is 3 posts, 14 days at 5 per week is 10, and 30 days
  at 4 per week is 17 or 18 depending on where the partial week falls. The
  pillar balance starts at 40 / 25 / 20 / 15 (Educational, Engagement,
  Authority, Promotional) and shifts for the selected goals (leads raise
  authority and conversion, engagement raises interactive content, selling
  programs raises promotion, retention and community raise engagement), is
  turned into post counts by largest remainder, and spread evenly so the
  calendar never opens with a promotion. Each slot gets a platform
  (rotating through the selection, with the next platform as the version to
  adapt for), a format (the user's chosen formats where they fit the
  platform, else the platform's defaults) and a strategic angle (a common
  mistake and the fix, a this-or-that question, how sessions are structured
  for this audience, who the offer is for and not for, and so on), with the
  rotation seeded by the business profile so different users do not get the
  same first post shape.
- **Generation is Gemini-only, in chunks** (`api/generate-calendar.ts`,
  `aiCalendar.ts`). The route validates the request with Zod
  (`schema.ts`), strips control and markup characters from the free text
  and quotes it as data, and builds the prompt from the spec's strategist
  instruction, the user information, the pillar shares and goal hints, the
  business focus (a gym owner gets classes, community, trainers and
  membership benefits; a yoga instructor gets mobility, practice
  consistency and class experiences; a nutrition coach gets nutrition
  education and habit building, never medical diets), the audience, the
  rules for every platform in play (format, hook style, caption length,
  hashtag count) and the planned slots. Slots are written six at a time,
  the chunks run concurrently, and each returned post is cleaned and judged:
  lengths, Twitter/X under 280 characters, per-platform hashtag limits
  (none on Threads), banned phrases (`unlock your potential`, `no
  excuses`, …), invented client results, invented promotions when none were
  given, leftover placeholders, repeated topics, a missing or copied
  platform version. Only the slots that failed are asked for again, with
  the reasons, in up to two repair rounds; a calendar with fewer than 70% of
  its slots filled is refused (502 `invalid`, the gate shows `The generated
  calendar didn't pass our quality checks. Please try again.` with `Try
  Again`), and any slot still missing after the repairs is counted in
  `unfilled` and shown in the modal, never hidden. Rate limits: 10 requests
  per IP per 10 minutes and 3 in flight per instance (429), a 429 from Gemini
  passed through, a 110 s budget inside the 120 s function limit (Gemini's
  latency from Vercel varies between about 6 and 40 s per call, so a slow
  call is allowed to finish rather than aborted).
  `GEMINI_MODEL_CALENDAR` picks a model for this tool alone (default
  `GEMINI_MODEL`, then `gemini-3.5-flash-lite`; the route never switches
  models on its own). `mode: 'post'` rewrites one slot with the other
  topics in the avoid list. `GET /api/generate-calendar` reports
  `configured`, `model`, `keySource` and the limits. Nothing is stored
  server-side; the user's name and email never reach Gemini.
- **One calendar object feeds the grid, the list, the editor and every
  export** (`calendarUtils.ts`, `exports.ts`, `generatePdf.ts`). The PDF
  (jsPDF, compressed, `fitbudd-fitness-content-calendar.pdf`) has a cover
  with the title, business, niche, audience, platforms, goals, posting
  frequency, tone and language, the strategy summary, a pillar table with
  target shares and planned counts, a week-by-week calendar overview with
  pillar-coloured entries, then every post in full across as many pages as
  it needs (hook, caption with its paragraphs, visual direction, CTA,
  hashtags, production notes, the other platform's version), a closing
  review note, a running header and `Page X of Y`. The CSV
  (`fitbudd-fitness-content-calendar.csv`, UTF-8 with BOM, RFC 4180
  quoting, line breaks kept inside quoted cells, formula-looking cells
  prefixed with an apostrophe) has the columns Date, Day, Platform, Content
  Pillar, Format, Topic, Hook, Caption, Creative Direction, CTA, Hashtags,
  Production Notes, Status, one row per post-platform version. The .ics
  (`fitbudd-fitness-content-calendar.ics`) is one all-day event per post
  for Google Calendar, Outlook or Apple Calendar. Nothing is scheduled or
  published for the user, and the copy says so.
- **Tests**: `node scripts/calendar-export-check.mjs [out-dir] [calendar.json …]`
  builds a 3-, 10- and 30-post fixture (two platforms with versions, long
  captions, special characters, formula-looking cells) and any saved
  calendars as PDF (Letter and A4), CSV and .ics, and checks each (valid
  file, page numbers, the strategy and overview sections, every topic,
  caption opening and ending and platform version present, no empty pages;
  13 columns, one row per version, a parser round trip with captions intact,
  formula cells neutralised; one event per post). `BASE=http://localhost:5173
  node scripts/calendar-acceptance.mjs [out-dir] [start-date]` runs the
  spec's scenarios against a configured route: a personal trainer (strength,
  busy professionals, Instagram, leads, 14 days at 5 per week), a gym owner
  (general fitness, gym beginners, Instagram + Facebook, memberships, 30
  days at 4 per week) and a yoga instructor (yoga + mobility, beginners,
  Instagram, awareness, 7 days at 3 per week), and checks the calendar
  accuracy rules (post count for the duration and frequency, dates on the
  posting weekdays with the right weekday names, no duplicate ids or dates,
  every field present, platforms used and nothing else, hashtags only where
  allowed, no banned phrases or invented promotions, business and audience
  vocabulary, every pillar represented, varied hooks and CTAs, a strategy
  summary) and the pairwise difference between the scenarios.
- **HubSpot**: this tool needs its own form. Create one in HubSpot
  (Marketing → Forms; the classic editor exposes the public definition the
  route reads) with `email` and `firstname`, plus any of the fields below
  as single-line text contact properties, and set
  `HUBSPOT_FORM_ID_CONTENT_CALENDAR_GENERATOR` on Vercel (or paste the GUID
  into `defaultFormId` in `api/track.ts`). Until then `GET /api/track`
  shows a warning for the tool and its events are logged and skipped, never
  sent to another tool's form. `tracking.ts` is the one place that maps
  the tool's data to property names; none of the custom ones exist as
  contact properties yet, except `internal_src` (the portal's "page or CTA
  that sourced this lead") and the UTM properties, which the lead also
  carries. Events: `lead` (on `Create My Calendar`, before Gemini):
  `email`, `firstname`, `lastname`, `business_type`, `fitness_niche`,
  `target_audience`, `social_platforms`, `content_goals`,
  `calendar_duration`, `posting_frequency`, `brand_tone`, `main_offer`,
  `lead_magnet_source` and `tool_source` and `internal_src`
  (`fitness_content_calendar_generator`), `lead_magnet_type`
  (`content_calendar`), `campaign` (`lead_magnet`), `cta_destination`,
  `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `page_url`,
  `submitted_at`; then `generated` (`calendar_generated`,
  `calendar_generated_at`, `calendar_duration`, `planned_posts`),
  `regenerate` (`calendar_regenerated`, `calendar_regenerated_at`,
  `planned_posts`), `pdf_download` (`pdf_downloaded`,
  `pdf_downloaded_at`), `csv_download` (`csv_downloaded`,
  `csv_downloaded_at`) and `cta_click` (`cta_clicked`, `cta_text`,
  `cta_url`, `cta_clicked_at`), each with the email. The lead is sent once
  per email + settings; editing, rewriting a post, regenerating and
  downloading never resubmit it. Attribution from the Webflow page works
  exactly as for the intake tool (`src/shared/lib/attribution.ts`, same
  parent snippet).
- **Content safety**: the prompt forbids invented testimonials, results,
  client or trainer names, events and statistics, invented offers,
  discounts and deadlines, trend claims, promises of virality, followers or
  revenue, unsafe exercise advice, unrealistic body-change messaging and
  medical claims; a testimonial-format post is a template that asks the
  user for a real, permissioned story. The route rejects what slips
  through, and the modal and PDF remind the user that every post is a
  draft to review before publishing.

## Structure

```
index.html                         internal index (noindex) → src/hub
hashtag-generator/index.html       tool page (iframe-resizer child)
fitness-challenge-generator/index.html
recipe-generator/index.html
ig-bio-generator/index.html
ig-username-generator/index.html
gym-name-generator/index.html
ai-workout-generator/index.html
pricing-package-builder/index.html
one-rep-max-calculator/index.html
intake-form-generator/index.html
atkins-recipe-generator/index.html
content-calendar-generator/index.html
api/
  track.ts                         shared HubSpot route: per-tool form + fields
  generate.ts                      shared Gemini route: hashtags, challenge, recipes
  generate-intake.ts               Intake Form Generator: Gemini + Zod validation, one repair
                                   attempt, per-IP and in-flight limits (no canned fallback)
  generate-recipes.ts              Atkins Diet Recipe Generator: Gemini + Zod, computed nutrition,
                                   plan-rule checks, up to three calls (no canned fallback)
  generate-calendar.ts             Fitness Content Calendar Generator: planned schedule + Gemini in
                                   concurrent chunks of six, per-post validation, repair rounds (no fallback)
src/
  shared/
    index.css                      Tailwind theme (FitBudd colours) + iframe rules
    tools.ts                       tool registry + Webflow embed snippet
    logo.ts                        FitBudd logo as base64 PNG (for PDFs)
    disclaimers.ts                 recipe, challenge, workout, one rep max, intake and Atkins disclaimers
    components/                    SelectDropdown, MultiSelectDropdown, MultiSelectChips
                                   (≤5 options only), ToolModal, PdfDownloadButton,
                                   CTASection, HashMark, ToolMark, InstagramMark,
                                   DumbbellMark
    lib/tracking.ts                postEvent, email validation (format + disposable
                                   domains blocked), trial URL
    lib/copy.ts                    clipboard helper with iframe fallback
    lib/attribution.ts             UTM + hutk from the embedding page (postMessage, origin-checked)
  hub/                             index page
  tools/hashtag-generator/         HashtagGenerator, ResultsModal, PlatformHashtagBlock,
                                   generateHashtags, aiHashtags, tracking, types
  tools/fitness-challenge-generator/
                                   FitnessChallengeGenerator (form), ChallengeModal,
                                   ChallengePreview, aiChallenge, generateChallenge,
                                   generatePdf, tracking, types
  tools/ig-bio-generator/          IgBioGenerator (form), BioResultsModal, BioCard,
                                   aiBios, generateBios (fallback), tracking, types
  tools/ig-username-generator/     IgUsernameGenerator (form), UsernameResultsModal,
                                   aiUsernames, generateUsernames (fallback), tracking, types
  tools/gym-name-generator/        GymNameGenerator (form), GymNameResultsModal,
                                   aiGymNames, generateGymNames (fallback), tracking, types
  tools/ai-workout-generator/      WorkoutGenerator (form, two modes), WorkoutModal,
                                   WorkoutPlanView, aiWorkout, generateWorkout (fallback
                                   engine + chat parser), generatePdf, format, links,
                                   tracking, types
  tools/pricing-package-builder/   PricingPackageBuilder (form), PricingModal,
                                   NumberStepper, aiPricing, generatePricing (the pricing
                                   maths + fallback copy), format, links, tracking, types
  tools/one-rep-max-calculator/    OneRepMaxCalculator (form), OneRepMaxModal, calculate
                                   (formulas + load chart), aiGuidance, generateGuidance
                                   (fallback), format, links, tracking, types
  tools/recipe-generator/          RecipeGenerator (form), RecipeModal, RecipeCard,
                                   aiRecipes, generateRecipes (library), nutrition
                                   (estimator + protein rules), calorieTarget,
                                   generatePdf, tracking, types
  tools/intake-form-generator/     IntakeFormGenerator (three screens), TrainerConfiguration,
                                   EmailCaptureGate, IntakeResultsModal, QuestionnairePreview,
                                   QuestionCard, QuestionEditor, icons, aiIntake (route client),
                                   schema (Zod, shared with the route), questionUtils (edit
                                   helpers), generatePdf (Letter / A4), tracking, types
  tools/atkins-recipe-generator/   AtkinsRecipeGenerator (three screens), RecipeInputForm,
                                   LeadCaptureGate, RecipeResultsModal, RecipeDetails,
                                   NutritionSummary, aiRecipes (route client), schema (Zod,
                                   shared with the route), atkinsRules (plan / phase profiles,
                                   restriction and protein rules, checks), nutrition (reference
                                   data + calculator), recipeUtils, generatePdf, tracking, types
  tools/content-calendar-generator/
                                   ContentCalendarGenerator (three screens), CalendarInputForm,
                                   EmailCaptureGate, CalendarResultsModal, CalendarGrid, CalendarList,
                                   ContentPostCard, ContentPostEditor, aiCalendar (route client),
                                   schema (Zod, shared with the route), dateScheduler (local dates,
                                   posting weekdays, grid weeks), contentStrategy (pillar balance,
                                   angles, platform formats and rules, slot planning), calendarUtils,
                                   exports (CSV + .ics), generatePdf, tracking, types
scripts/
  intake-pdf-check.mjs             builds fixture PDFs (10 / 20 / 28 questions, edge cases) and checks them
  intake-acceptance.mjs            four-persona acceptance test against a configured route
  render-pdf-pages.swift           PDF pages → PNG on macOS, for a visual pass
  fixtures/intake-samples.mjs      the PDF fixtures (test data only, never shipped)
  atkins-pdf-check.mjs             builds collection + single-recipe PDFs from fixtures and checks them
  atkins-acceptance.mjs            the spec's four scenarios against a configured route
  fixtures/atkins-samples.mjs      the Atkins PDF fixtures (test data only, never shipped)
  calendar-export-check.mjs        builds PDF / CSV / .ics from fixtures and saved calendars and checks them
  calendar-acceptance.mjs          the spec's three scenarios + calendar accuracy checks against a route
  fixtures/calendar-samples.mjs    the calendar export fixtures (test data only, never shipped)
vite.config.ts                     multi-page build + dev middleware serving api/*.ts
vercel.json                        30 s maxDuration for api/generate.ts, 45 s for the intake and recipes routes, 120 s for the calendar route
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
