# Hashtag Generator

Compact, embeddable hashtag tool for FitBudd. Paste a caption, pick target
platforms, and get platform-tailored hashtag sets with one-tap copy. Max
width 536px, designed to be embedded in a Webflow blog page, landing page,
or iframe. Sibling project to the Gym Name Generator and shares its design
system (FitBudd orange/teal, 14px orange header, single-card layout).

**Stack:** React 19 · TypeScript · Tailwind CSS v4 · Vite. No backend and
no lead fields — the caption gates generation, everything runs client-side.
CTA clicks are attributed via UTMs (`utm_campaign=hashtag_generator`).

## Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # type-check + production build → dist/
npm run preview   # serve the production build locally
```

## Embedding

Same pattern as the other FitBudd tools (iframe-resizer **v4** on both
sides — the matching child script is already in `index.html`):

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

If several FitBudd tools share one page, include the parent script once and
call `iFrameResize` per iframe id.

## Generation

`src/lib/generateHashtags.ts` — deterministic client-side blending, per
selected platform:

- caption keyword extraction: frequency-ranked words plus two-word phrases
  (bigrams only from words adjacent in the raw text within one sentence,
  with stopword/weak-word filtering), and the caption's own hashtags are
  never re-suggested
- topic field: curated expansions for ~20 common niches, generic
  (`<topic>life`, `<topic>tips`, …) for anything else
- post type and tone/goal add themed tags
- platform norms: tag counts (Instagram 15, TikTok 6, X 3, LinkedIn 5,
  YouTube 4, Facebook 3, Pinterest 8, Threads 2), reserved staples
  (#fyp on TikTok), and filters (no viral/casual tags on LinkedIn or X)
- spam-bait tags (#follow4follow, #like4like, …) are banned
- deterministic per input; Regenerate reshuffles each platform's pool

Validation: caption + at least one platform required, compact inline
errors (no browser alerts), button disabled until valid.

## Structure

```
src/
  App.tsx                      536px wrapper
  components/
    HashtagGenerator.tsx       form + results screens, inline validation
    HashMark.tsx               orange rounded-square # mark
    SelectDropdown.tsx         single-select dropdown (closes on pick)
    MultiSelectChips.tsx       accessible multi-select chip group
    HashtagBlock.tsx           per-platform tag set + copy-all + chip copy
    CTASection.tsx             FitBudd social-proof CTA
  lib/
    generateHashtags.ts        deterministic generation engine
    tracking.ts                CTA text/URL + UTM constants
  types.ts                     options + shared types
```
