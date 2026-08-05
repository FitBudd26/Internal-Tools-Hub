/**
 * Vercel serverless route: forwards tool events to HubSpot's Forms
 * Submission API. Credentials live only in server env vars — never in the
 * frontend bundle:
 *
 *   HUBSPOT_PORTAL_ID            required to track
 *   HUBSPOT_FORM_ID              required to track
 *   HUBSPOT_PRIVATE_APP_TOKEN    optional — switches to the authenticated
 *                                "secure submit" endpoint when present
 *
 * The HubSpot form must contain matching fields (see README). Missing env
 * vars or HubSpot errors are swallowed: this route never fails the client.
 */

declare const process: { env: Record<string, string | undefined> };

const ALLOWED_FIELDS: Record<string, string[]> = {
  generation: [
    'caption',
    'topic',
    'post_type',
    'target_platforms',
    'tone_goal',
    'generated_hashtags',
    'tool_source',
    'campaign',
    'page_url',
    'submitted_at',
  ],
  cta_click: [
    'cta_clicked',
    'cta_text',
    'cta_url',
    'cta_clicked_at',
    'tool_source',
    'page_url',
  ],
};

interface TrackRequest {
  method?: string;
  body?: unknown;
}

interface TrackResponse {
  status(code: number): { end(): void };
}

export default async function handler(
  req: TrackRequest,
  res: TrackResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formId = process.env.HUBSPOT_FORM_ID;
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

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

      if (hsFields.length > 0) {
        const base = token
          ? 'https://api.hsforms.com/submissions/v3/integration/secure/submit'
          : 'https://api.hsforms.com/submissions/v3/integration/submit';
        await fetch(`${base}/${portalId}/${formId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            fields: hsFields,
            context: {
              pageUri:
                typeof fields.page_url === 'string' ? fields.page_url : '',
            },
          }),
        });
      }
    }
  } catch {
    /* tracking must never fail the client */
  }

  res.status(204).end();
}
