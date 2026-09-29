/**
 * Vercel serverless route: forwards the lead (name + email) captured by the
 * tool to HubSpot's Forms Submission API. Credentials live only in server
 * env vars — never in the frontend bundle:
 *
 *   HUBSPOT_PORTAL_ID            optional — defaults to FitBudd's portal
 *   HUBSPOT_FORM_ID              optional — defaults to the Hashtag Generator form
 *   HUBSPOT_PRIVATE_APP_TOKEN    optional — switches to the authenticated
 *                                "secure submit" endpoint when present
 *
 * Portal and form IDs are public (they appear in the form's embed snippet),
 * so FitBudd's live values are the defaults and env vars only override them.
 * The HubSpot form must contain matching fields (see README). HubSpot errors
 * are logged and swallowed: this route never fails the client.
 * HubSpot rejects a whole submission when it names a field the form does
 * not define, so the route reads the form's public definition (the same JSON
 * the embed script loads), sends only fields that exist, and logs the rest.
 * `GET /api/track` reports the portal/form in use plus which of this tool's
 * fields the form is still missing.
 */

declare const process: { env: Record<string, string | undefined> };

const DEFAULT_PORTAL_ID = '9058640';
const DEFAULT_FORM_ID = 'e7410680-1ea2-4f36-8f94-bde4cd94aa62';

/**
 * Only these reach HubSpot as form fields — the form has exactly Email and
 * First Name, and nothing else is meant to be recorded. `page_url` in the
 * payload is used for the submission context, never as a field.
 */
const ALLOWED_FIELDS: Record<string, string[]> = {
  generation: ['email', 'firstname'],
};

const ALL_TOOL_FIELDS = [...new Set(Object.values(ALLOWED_FIELDS).flat())];

/** Field names on the target form, and which of them HubSpot requires. */
interface FormShape {
  names: Set<string>;
  required: string[];
}

const FORM_SHAPE_TTL_MS = 10 * 60_000;
let formShapeCache: { key: string; shape: FormShape | null; at: number } | undefined;

/**
 * Fetch the form's field list from HubSpot's public embed endpoint, cached
 * per function instance. Returns null when the shape is unknown (endpoint
 * down or unparseable) — the caller then sends everything and lets HubSpot
 * decide, which is the pre-existing behaviour.
 */
async function getFormShape(portalId: string, formId: string): Promise<FormShape | null> {
  const key = `${portalId}/${formId}`;
  if (
    formShapeCache &&
    formShapeCache.key === key &&
    Date.now() - formShapeCache.at < FORM_SHAPE_TTL_MS
  ) {
    return formShapeCache.shape;
  }

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
          const o = f as { name?: unknown; required?: unknown; dependentFields?: unknown };
          if (typeof o.name === 'string') {
            names.add(o.name);
            if (o.required === true) required.push(o.name);
          }
          if (Array.isArray(o.dependentFields)) {
            visit(o.dependentFields.map((d) => (d as { dependentFormField?: unknown }).dependentFormField));
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

  if (shape) {
    // Once per refresh, say what the form still needs — this is the usual
    // reason tracking "doesn't work" and it is fixed in HubSpot, not here.
    const missing = ALL_TOOL_FIELDS.filter((n) => !shape.names.has(n));
    const neverSent = shape.required.filter((n) => !ALL_TOOL_FIELDS.includes(n));
    if (missing.length) console.warn(`hubspot form ${formId} lacks fields (not sent): ${missing.join(', ')}`);
    if (neverSent.length) console.warn(`hubspot form ${formId} requires ${neverSent.join(', ')}, which this tool never sends — make them optional`);
  }
  formShapeCache = { key, shape, at: Date.now() };
  return shape;
}

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
  const portalId = process.env.HUBSPOT_PORTAL_ID || DEFAULT_PORTAL_ID;
  const formId = process.env.HUBSPOT_FORM_ID || DEFAULT_FORM_ID;
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

  // Deploy check: `curl https://<app>/api/track` → which form receives events
  // and which of this tool's fields it is still missing.
  if (req.method === 'GET') {
    const shape = await getFormShape(portalId, formId);
    res.status(200).json({
      portalId,
      formId,
      authenticated: Boolean(token),
      formFields: shape ? [...shape.names] : null,
      missingFields: shape ? ALL_TOOL_FIELDS.filter((n) => !shape.names.has(n)) : null,
      requiredButNeverSent: shape
        ? shape.required.filter((n) => !ALL_TOOL_FIELDS.includes(n))
        : null,
    });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  try {
    const body: unknown =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { type, fields } = (body ?? {}) as {
      type?: string;
      fields?: Record<string, unknown>;
    };
    const allowed = type ? ALLOWED_FIELDS[type] : undefined;

    if (portalId && formId && allowed && fields) {
      const hsFields = allowed
        .filter((name) => typeof fields[name] === 'string')
        .map((name) => ({
          objectTypeId: '0-1',
          name,
          value: (fields[name] as string).slice(0, 4000),
        }));

      // Only fields the form defines — HubSpot rejects the whole submission
      // otherwise (FIELD_NOT_IN_FORM_DEFINITION).
      const shape = await getFormShape(portalId, formId);
      const sendable = shape ? hsFields.filter((f) => shape.names.has(f.name)) : hsFields;

      if (sendable.length > 0) {
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
              pageUri:
                typeof fields.page_url === 'string' ? fields.page_url : '',
            },
          }),
        });
        if (!upstream.ok) {
          // Visible in the Vercel function logs; the client is never told.
          console.error(
            `hubspot form ${formId} responded ${upstream.status}:`,
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
