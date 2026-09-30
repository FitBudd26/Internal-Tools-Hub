/** Registry of every tool in the hub, drives the internal index page. */
export interface ToolMeta {
  /** URL path segment and the `tool` value sent to /api/track. */
  slug: string;
  name: string;
  description: string;
  /** Fixed iframe height before iframe-resizer takes over. */
  fallbackHeight: number;
}

export const TOOLS: ToolMeta[] = [
  {
    slug: 'hashtag-generator',
    name: 'Hashtag Generator',
    description:
      'Platform-tailored hashtag sets from a caption (Gemini with a local fallback). Captures name + email.',
    fallbackHeight: 580,
  },
  {
    slug: 'fitness-challenge-generator',
    name: 'Fitness Challenge Generator for Coaches & Gyms',
    description:
      'Ready-to-run client challenge frameworks with a branded PDF. Email-gated results, B2B lead magnet.',
    fallbackHeight: 580,
  },
  {
    slug: 'ig-bio-generator',
    name: 'Instagram Bio Generator',
    description:
      'Four ready-to-paste Instagram bios in four angles for fitness professionals (Gemini with a templated fallback). Captures name + email. Migrated from ig-bio-gen.vercel.app.',
    fallbackHeight: 580,
  },
  {
    slug: 'ig-username-generator',
    name: 'Instagram Username Generator',
    description:
      'Ten short, brandable Instagram handles from a name, niche, trainer type, tone and keyword (Gemini with the original engine as fallback). Captures name + email. Migrated from ig-username-gen.vercel.app.',
    fallbackHeight: 580,
  },
  {
    slug: 'gym-name-generator',
    name: 'Gym Name Generator',
    description:
      'Ten brandable gym names from gym type, audience, tone and an optional keyword (Gemini with the original engine as fallback). Captures name + email. Migrated from gym-name-gen.vercel.app.',
    fallbackHeight: 580,
  },
  {
    slug: 'ai-workout-generator',
    name: 'AI Workout Generator',
    description:
      'Client-ready single-session workout plans from a guided form or a plain-language description (Gemini with a built-in engine as fallback), shown in full with a branded PDF. Captures email + profession. Migrated from ai-workout-builder-ten.vercel.app.',
    // Taller than the other tools: client fields, the coach's details and consent on one screen.
    fallbackHeight: 760,
  },
  {
    slug: 'recipe-generator',
    name: 'Fitness Recipe Generator for Coaches & Gyms',
    description:
      'Goal-aligned recipe ideas for clients (Gemini with a built-in recipe library) with a branded PDF. Captures name + email.',
    fallbackHeight: 580,
  },
];

/** Webflow embed snippet (iframe-resizer v4, same pattern as the other FitBudd tools). */
export function embedSnippet(origin: string, tool: ToolMeta): string {
  const id = `fitbudd-${tool.slug}`;
  return [
    '<div style="max-width:536px;margin:0 auto;">',
    '  <iframe',
    `    id="${id}"`,
    `    src="${origin}/${tool.slug}/"`,
    `    title="${tool.name}"`,
    '    scrolling="no"',
    `    style="width:1px;min-width:100%;max-width:536px;height:${tool.fallbackHeight}px;border:0;display:block;margin:0 auto;"`,
    '    loading="lazy"',
    '    allow="clipboard-write"',
    '  ></iframe>',
    '</div>',
    '<script src="https://cdn.jsdelivr.net/npm/iframe-resizer@4.3.9/js/iframeResizer.min.js"></script>',
    '<script>',
    `  iFrameResize({ checkOrigin: false, log: false }, '#${id}');`,
    '</script>',
  ].join('\n');
}
