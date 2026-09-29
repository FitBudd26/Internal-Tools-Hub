/**
 * Vercel serverless route shared by every tool in the hub: forwards a tool's
 * lead or event to HubSpot's Forms Submission API. Credentials live only in
 * server env vars — never in the frontend bundle:
 *
 *   HUBSPOT_PORTAL_ID                 optional — defaults to FitBudd's portal
 *   HUBSPOT_FORM_ID                   optional — default form for every tool
 *   HUBSPOT_FORM_ID_<TOOL>            optional — per-tool form override, e.g.
 *                                     HUBSPOT_FORM_ID_FITNESS_CHALLENGE_GENERATOR
 *   HUBSPOT_PRIVATE_APP_TOKEN         optional — switches to the authenticated
 *                                     "secure submit" endpoint when present
 *
 * Request body: { tool, type, fields }. Each tool declares which fields each
 * event may carry (below). HubSpot rejects a whole submission when it names
 * a field the form does not define, so the route reads the form's public
 * definition (the same JSON the embed script loads), sends only fields that
 * exist, and logs the rest. Secondary events (PDF download, CTA click) are
 * skipped when nothing but the email would survive, so a lead is never
 * duplicated by a form that lacks those fields. Every submission carries the
 * tool name as HubSpot's `pageName` context, so tools sharing one form stay
 * distinguishable. HubSpot errors are logged and swallowed: this route never
 * fails the client. `GET /api/track` reports every tool's form status.
 */

declare const process: { env: Record<string, string | undefined> };

const DEFAULT_PORTAL_ID = '9058640';
const DEFAULT_FORM_ID = 'e7410680-1ea2-4f36-8f94-bde4cd94aa62';
const DEFAULT_TOOL = 'hashtag-generator';

interface EventSpec {
  /** Fields this event may carry (`page_url` is also used as submission context). */
  fields: string[];
  /** Primary = the lead itself; always sent. Others only when they add data. */
  primary: boolean;
}

interface ToolConfig {
  pageName: string;
  formIdEnv: string;
  events: Record<string, EventSpec>;
}

const TOOLS: Record<string, ToolConfig> = {
  'hashtag-generator': {
    pageName: 'Hashtag Generator',
    formIdEnv: 'HUBSPOT_FORM_ID_HASHTAG_GENERATOR',
    events: {
      // The only data this tool records: the form has exactly these two fields.
      generation: { primary: true, fields: ['email', 'firstname'] },
    },
  },
  'fitness-challenge-generator': {
    pageName: 'Fitness Challenge Generator',
    formIdEnv: 'HUBSPOT_FORM_ID_FITNESS_CHALLENGE_GENERATOR',
    events: {
      lead: {
        primary: true,
        fields: [
          'email',
          'challenge_types',
          'audience_types',
          'fitness_levels',
          'challenge_duration',
          'equipment_availability',
          'measurement_preferences',
          'send_more_tools',
          'generated_challenge_name',
          'tool_source',
          'campaign',
          'cta_destination',
          'page_url',
          'submitted_at',
        ],
      },
      pdf_download: {
        primary: false,
        fields: ['email', 'pdf_downloaded', 'pdf_downloaded_at', 'challenge_name', 'tool_source', 'page_url'],
      },
      cta_click: {
        primary: false,
        fields: ['email', 'cta_clicked', 'cta_text', 'cta_url', 'cta_clicked_at', 'tool_source', 'page_url'],
      },
    },
  },
};

function toolFields(cfg: ToolConfig): string[] {
  return [...new Set(Object.values(cfg.events).flatMap((e) => e.fields))];
}

function resolveForm(cfg: ToolConfig) {
  return {
    portalId: process.env.HUBSPOT_PORTAL_ID || DEFAULT_PORTAL_ID,
    formId: process.env[cfg.formIdEnv] || process.env.HUBSPOT_FORM_ID || DEFAULT_FORM_ID,
    token: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
  };
}

/* ------------------------- form definition cache ------------------------- */

/** Field names on a HubSpot form, and which of them the form requires. */
interface FormShape {
  names: Set<string>;
  required: string[];
}

const FORM_SHAPE_TTL_MS = 10 * 60_000;
const formShapeCache = new Map<string, { shape: FormShape | null; at: number }>();

/**
 * Fetch the form's field list from HubSpot's public embed endpoint, cached
 * per function instance. Returns null when the shape is unknown (endpoint
 * down or unparseable) — the caller then sends everything and lets HubSpot
 * decide.
 */
async function getFormShape(portalId: string, formId: string): Promise<FormShape | null> {
  const key = `${portalId}/${formId}`;
  const cached = formShapeCache.get(key);
  if (cached && Date.now() - cached.at < FORM_SHAPE_TTL_MS) return cached.shape;

  let shape: FormShape | null = null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const r = await fetch(
      `https://forms.hsforms.com/embed/v3/form/${portalId}/${formId}/json`,
      { signal: controller.signal },
    );
    if (r.ok) {
      const data = (await r.json()) as Record<string, unknown>;
      const root = (
        data.form && typeof data.form === 'object' ? data.form : data
      ) as Record<string, unknown>;
      const names = new Set<string>();
      const required: string[] = [];
      const visit = (fields: unknown) => {
        if (!Array.isArray(fields)) return;
        for (const f of fields) {
          if (!f || typeof f !== 'object') continue;
          const o = f as { name?: unknown; required?: unknown; dependentFieldFilters?: unknown };
          if (typeof o.name === 'string') {
            names.add(o.name);
            if (o.required === true) required.push(o.name);
          }
          // Conditional fields live under dependentFieldFilters[].dependentFormField.
          if (Array.isArray(o.dependentFieldFilters)) {
            visit(o.dependentFieldFilters.map((d) => (d as { dependentFormField?: unknown }).dependentFormField));
          }
        }
      };
      const groups = root.formFieldGroups ?? root.fieldGroups;
      if (Array.isArray(groups)) for (const g of groups) visit((g as { fields?: unknown }).fields);
      if (names.size > 0) shape = { names, required };
    }
  } catch {
    /* unknown shape → send everything */
  } finally {
    clearTimeout(timer);
  }
  formShapeCache.set(key, { shape, at: Date.now() });
  return shape;
}

const warned = new Set<string>();
/** Once per tool/form per instance: say what the form lacks — the usual reason tracking "doesn't work". */
function warnOnce(tool: string, formId: string, cfg: ToolConfig, shape: FormShape) {
  const key = `${tool}/${formId}`;
  if (warned.has(key)) return;
  warned.add(key);
  const all = toolFields(cfg);
  const missing = all.filter((n) => !shape.names.has(n));
  const neverSent = shape.required.filter((n) => !all.includes(n));
  if (missing.length) console.warn(`[${tool}] hubspot form ${formId} lacks fields (not sent): ${missing.join(', ')}`);
  if (neverSent.length) console.warn(`[${tool}] hubspot form ${formId} requires ${neverSent.join(', ')}, which this tool never sends — make them optional`);
}

/* -------------------------------- handler -------------------------------- */

interface TrackRequest {
  method?: string;
  body?: unknown;
}

interface TrackResponse {
  status(code: number): { json(body: unknown): void; end(): void };
}

export default async function handler(
  req: TrackRequest,
  res: TrackResponse,
): Promise<void> {
  // Deploy check: `curl https://<app>/api/track` → each tool's form and what it still lacks.
  if (req.method === 'GET') {
    const tools: Record<string, unknown> = {};
    for (const [slug, cfg] of Object.entries(TOOLS)) {
      const { portalId, formId, token } = resolveForm(cfg);
      const shape = await getFormShape(portalId, formId);
      const all = toolFields(cfg);
      tools[slug] = {
        portalId,
        formId,
        authenticated: Boolean(token),
        formFields: shape ? [...shape.names] : null,
        missingFields: shape ? all.filter((n) => !shape.names.has(n)) : null,
        requiredButNeverSent: shape ? shape.required.filter((n) => !all.includes(n)) : null,
      };
    }
    res.status(200).json({ tools });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  try {
    const body: unknown =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { tool: rawTool, type, fields } = (body ?? {}) as {
      tool?: unknown;
      type?: unknown;
      fields?: Record<string, unknown>;
    };
    const tool = typeof rawTool === 'string' && rawTool in TOOLS ? rawTool : DEFAULT_TOOL;
    const cfg = TOOLS[tool];
    const spec = typeof type === 'string' ? cfg.events[type] : undefined;

    if (spec && fields) {
      const { portalId, formId, token } = resolveForm(cfg);
      const hsFields = spec.fields
        .filter((name) => typeof fields[name] === 'string')
        .map((name) => ({
          objectTypeId: '0-1',
          name,
          value: (fields[name] as string).slice(0, 4000),
        }));

      // Only fields the form defines — HubSpot rejects the whole submission
      // otherwise (FIELD_NOT_IN_FORM_DEFINITION).
      const shape = await getFormShape(portalId, formId);
      if (shape) warnOnce(tool, formId, cfg, shape);
      const sendable = shape ? hsFields.filter((f) => shape.names.has(f.name)) : hsFields;
      const addsData = sendable.some((f) => f.name !== 'email');

      if (sendable.length > 0 && (spec.primary || addsData)) {
        const base = token
          ? 'https://api.hsforms.com/submissions/v3/integration/secure/submit'
          : 'https://api.hsforms.com/submissions/v3/integration/submit';
        const upstream = await fetch(`${base}/${portalId}/${formId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            fields: sendable,
            context: {
              pageUri: typeof fields.page_url === 'string' ? fields.page_url : '',
              pageName: cfg.pageName,
            },
          }),
        });
        if (!upstream.ok) {
          // Visible in the Vercel function logs; the client is never told.
          console.error(
            `[${tool}] hubspot form ${formId} responded ${upstream.status}:`,
            (await upstream.text()).slice(0, 400),
          );
        }
      }
    }
  } catch (err) {
    console.error('hubspot request failed:', err instanceof Error ? err.message : err);
  }

  res.status(204).end();
}
