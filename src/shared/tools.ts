/** Registry of every tool in the hub — drives the internal index page. */
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
    fallbackHeight: 720,
  },
  {
    slug: 'fitness-challenge-generator',
    name: 'Fitness Challenge Generator for Coaches & Gyms',
    description:
      'Ready-to-run client challenge frameworks with a branded PDF. Email-gated results, B2B lead magnet.',
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
