import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

declare const process: { env: Record<string, string | undefined> };

/**
 * Dev-only: serve `api/*.ts` at `/api/*` so `npm run dev` runs the same
 * serverless handlers Vercel does (e.g. Gemini generation with a local
 * .env). It only hooks the dev server; production builds and Vercel deploys
 * are untouched.
 */
function vercelApiDev(): Plugin {
  return {
    name: 'vercel-api-dev',
    apply: 'serve',
    configureServer(server) {
      // Vite only exposes VITE_* to the client; the handlers read their
      // server-side secrets from process.env, so load the .env files there.
      const env = loadEnv(server.config.mode, server.config.root, '');
      for (const [k, v] of Object.entries(env)) process.env[k] ??= v;

      server.middlewares.use(async (rawReq, res, next) => {
        // Node's http types are not installed here; the handlers only need
        // these few members of the incoming request.
        const req = rawReq as unknown as {
          url?: string;
          method?: string;
          setEncoding(encoding: string): void;
          [Symbol.asyncIterator](): AsyncIterator<string>;
        };
        const route = /^\/api\/([a-z-]+)\/?(?:\?.*)?$/.exec(req.url ?? '')?.[1];
        if (!route) return next();
        try {
          const mod = (await server.ssrLoadModule(`/api/${route}.ts`)) as {
            default: (
              q: { method?: string; body?: unknown },
              s: unknown,
            ) => Promise<void>;
          };
          req.setEncoding('utf8');
          let raw = '';
          for await (const chunk of req) raw += chunk;
          let body: unknown = raw;
          try {
            body = raw ? JSON.parse(raw) : undefined;
          } catch {
            /* handlers also accept the raw string */
          }
          // Minimal stand-in for Vercel's Node response helpers.
          const shim = {
            setHeader: (name: string, value: string) => res.setHeader(name, value),
            status(code: number) {
              res.statusCode = code;
              return {
                json(payload: unknown) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(payload));
                },
                end() {
                  res.end();
                },
              };
            },
          };
          await mod.default({ method: req.method, body }, shim);
        } catch (err) {
          console.error(`[api/${route}]`, err);
          res.statusCode = 500;
          res.end();
        }
      });
    },
  };
}

// base: './' so the built tool can be hosted from any path (subfolder, CDN, Webflow embed, etc.)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), vercelApiDev()],
  build: {
    // Multi-page app: one entry per tool (each is its own embeddable page)
    // plus the internal index at the root.
    rollupOptions: {
      input: {
        index: 'index.html',
        'hashtag-generator': 'hashtag-generator/index.html',
        'fitness-challenge-generator': 'fitness-challenge-generator/index.html',
        'recipe-generator': 'recipe-generator/index.html',
        'ig-bio-generator': 'ig-bio-generator/index.html',
        'ig-username-generator': 'ig-username-generator/index.html',
        'gym-name-generator': 'gym-name-generator/index.html',
        'ai-workout-generator': 'ai-workout-generator/index.html',
        'pricing-package-builder': 'pricing-package-builder/index.html',
      },
    },
  },
});
