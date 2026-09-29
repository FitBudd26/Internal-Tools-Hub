/**
 * Vercel serverless route: asks Google Gemini for caption-specific,
 * platform-grouped hashtags. The API key lives only in a server env var —
 * nothing Gemini-related ships in the frontend bundle:
 *
 *   GEMINI_API_KEY   required — without it this route answers 503 and the
 *                    client quietly uses the built-in deterministic engine.
 *                    GOOGLE_API_KEY and the other names in KEY_ENV_NAMES are
 *                    accepted too, so an existing Vercel variable just works.
 *   GEMINI_MODEL     optional, defaults to gemini-3.5-flash-lite (free tier,
 *                    fast); gemini-3.8-flash is the higher-quality free option
 *
 * The client re-validates every tag the model returns (lowercase, banned
 * tags, per-platform limits, the caption's own tags), so this route only has
 * to return well-formed JSON. Any non-200 answer here makes the client fall
 * back to local generation, so users always get results.
 */

declare const process: { env: Record<string, string | undefined> };

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

/** Env var names accepted for the Gemini key; the first one set wins. */
const KEY_ENV_NAMES = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'GEMINI_KEY',
  'VITE_GEMINI_API_KEY',
];

function findKey(): { key: string | null; source: string | null } {
  for (const name of KEY_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) return { key: value, source: name };
  }
  return { key: null, source: null };
}
const UPSTREAM_TIMEOUT_MS = 12_000;

const PLATFORMS = [
  'Instagram',
  'TikTok',
  'Twitter/X',
  'LinkedIn',
  'YouTube',
  'Facebook',
  'Pinterest',
  'Threads',
] as const;
type Platform = (typeof PLATFORMS)[number];

/** Per-platform brief, mirroring the product spec and the local engine's limits. */
const GUIDANCE: Record<Platform, string> = {
  Instagram:
    '12-20 tags mixing broad, niche, community and intent-based tags; never only mega tags',
  TikTok: '5-8 short tags mixing niche, content-format and trend-style tags',
  'Twitter/X': '2-4 minimal, context-driven tags',
  LinkedIn: '3-6 clean, professional, industry-specific tags; no slang or viral bait',
  YouTube: '5-10 searchable tags: topic, video category and phrases people search',
  Facebook: '3-6 clean category and community tags',
  Pinterest: '8-15 evergreen, searchable discovery tags with niche variations',
  Threads: '2-5 conversational, minimal tags',
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    groups: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          platform: { type: 'STRING' },
          hashtags: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['platform', 'hashtags'],
      },
    },
  },
  required: ['groups'],
};

const PLATFORM_KEYS = new Map<string, Platform>(
  PLATFORMS.map((p) => [p.toLowerCase().replace(/[^a-z]/g, ''), p] as const),
);
PLATFORM_KEYS.set('x', 'Twitter/X');
PLATFORM_KEYS.set('twitter', 'Twitter/X');
PLATFORM_KEYS.set('xtwitter', 'Twitter/X');

interface GenerateRequest {
  method?: string;
  body?: unknown;
}

interface GenerateResponse {
  setHeader(name: string, value: string): unknown;
  status(code: number): { json(body: unknown): void; end(): void };
}

interface Input {
  caption: string;
  topic: string;
  postType: string;
  tones: string[];
  platforms: Platform[];
  /** Tags already shown to the user (Regenerate) — the model is told to avoid them. */
  avoid: string[];
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function matchPlatform(raw: unknown): Platform | null {
  if (typeof raw !== 'string') return null;
  return PLATFORM_KEYS.get(raw.toLowerCase().replace(/[^a-z]/g, '')) ?? null;
}

function strings(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseInput(body: unknown): Input | null {
  const b = typeof body === 'string' ? safeJson(body) : body;
  if (!b || typeof b !== 'object') return null;
  const o = b as Record<string, unknown>;
  const caption = typeof o.caption === 'string' ? o.caption.trim().slice(0, 2000) : '';
  const platforms = Array.isArray(o.platforms)
    ? [...new Set(o.platforms.map(matchPlatform).filter((p): p is Platform => p !== null))]
    : [];
  if (!caption || platforms.length === 0) return null;
  return {
    caption,
    topic: typeof o.topic === 'string' ? o.topic.trim().slice(0, 120) : '',
    postType: typeof o.postType === 'string' ? o.postType.trim().slice(0, 40) : '',
    tones: strings(o.tones, 9, 30),
    platforms,
    avoid: strings(o.avoid, 150, 40),
  };
}

function buildPrompt(input: Input): string {
  const lines = [
    'You write hashtags for one social media post. Reply with JSON only, matching this shape: {"groups":[{"platform":"<name>","hashtags":["tag","tag"]}]}.',
    '',
    `Caption: """${input.caption}"""`,
    `Topic / niche: ${input.topic || 'not given — infer it from the caption'}`,
    `Post type: ${input.postType || 'not given'}`,
    `Tone / goal: ${input.tones.length ? input.tones.join(', ') : 'not given'}`,
    '',
    'Platforms to cover (use these exact names, include every one) and what each needs:',
    ...input.platforms.map((p) => `- ${p}: ${GUIDANCE[p]}`),
    '',
    'Rules:',
    '- Every hashtag must fit this specific caption, topic and post type. Prefer niche and intent tags over generic filler; never add unrelated trending tags just for reach.',
    "- Follow the caption's actual subject; do not assume a niche it does not mention.",
    '- Write each hashtag as lowercase letters and digits only, 3-28 characters, without the # sign, spaces, punctuation or emoji.',
    '- No engagement-bait or spam tags (follow4follow, like4like, followme, followback, f4f, l4l and similar).',
    '- No fyp / foryou / viral style tags on LinkedIn, Twitter/X, Facebook, Pinterest or Threads.',
    '- Give each platform its own angle: a hashtag may appear on at most three platforms.',
    '- Do not repeat hashtags that already appear in the caption.',
  ];
  if (input.avoid.length) {
    lines.push(
      `- These were already suggested; return different ones: ${input.avoid.join(', ')}`,
    );
  }
  return lines.join('\n');
}

function extractText(data: unknown): string {
  const d = data as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return (d.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}

export default async function handler(
  req: GenerateRequest,
  res: GenerateResponse,
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const { key, source } = findKey();
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  // Deploy check: `curl https://<app>/api/generate` → which env var holds the key (names only, never values).
  if (req.method === 'GET') {
    res.status(200).json({
      configured: Boolean(key),
      model,
      keySource: source,
      acceptedKeyNames: KEY_ENV_NAMES,
    });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  if (!key) {
    res.status(503).json({ error: 'not_configured' });
    return;
  }

  const input = parseInput(req.body);
  if (!input) {
    res.status(400).json({ error: 'bad_request' });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
          generationConfig: {
            temperature: 0.9,
            // Generous: on thinking models the budget also covers reasoning tokens.
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );

    if (!upstream.ok) {
      console.error(
        `gemini ${model} responded ${upstream.status}:`,
        (await upstream.text()).slice(0, 300),
      );
      res.status(502).json({ error: 'upstream', status: upstream.status });
      return;
    }

    const parsed = safeJson(extractText(await upstream.json()));
    const rawGroups =
      parsed && typeof parsed === 'object'
        ? (parsed as { groups?: unknown }).groups
        : undefined;
    const seen = new Set<Platform>();
    const groups: { platform: Platform; hashtags: string[] }[] = [];
    for (const g of Array.isArray(rawGroups) ? rawGroups : []) {
      if (!g || typeof g !== 'object') continue;
      const platform = matchPlatform((g as { platform?: unknown }).platform);
      const hashtags = strings((g as { hashtags?: unknown }).hashtags, 30, 40);
      if (!platform || seen.has(platform) || hashtags.length === 0) continue;
      seen.add(platform);
      groups.push({ platform, hashtags });
    }

    if (groups.length === 0) {
      console.error(`gemini ${model} returned no usable groups`);
      res.status(502).json({ error: 'empty' });
      return;
    }
    res.status(200).json({ groups, model });
  } catch (err) {
    console.error('gemini request failed:', err instanceof Error ? err.message : err);
    res.status(502).json({ error: 'upstream' });
  } finally {
    clearTimeout(timer);
  }
}
