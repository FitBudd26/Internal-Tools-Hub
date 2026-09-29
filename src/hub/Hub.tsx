import { useEffect, useRef, useState } from 'react';
import { copyText } from '../shared/lib/copy';
import { TOOLS, embedSnippet, type ToolMeta } from '../shared/tools';

function ToolCard({ tool, origin }: { tool: ToolMeta; origin: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const snippet = embedSnippet(origin, tool);

  const copy = async () => {
    if (!(await copyText(snippet))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900">{tool.name}</h2>
          <p className="mt-0.5 text-[13px] text-gray-600">{tool.description}</p>
        </div>
        <a
          href={`${origin}/${tool.slug}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-fb-teal px-3 py-1.5 text-xs font-semibold text-fb-teal transition-colors hover:bg-fb-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal"
        >
          Open tool ↗
        </a>
      </div>
      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-bold text-gray-900">Webflow embed code</span>
        <textarea
          readOnly
          rows={7}
          value={snippet}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 font-mono text-[11px] leading-snug text-gray-700 outline-none focus:border-fb-orange focus:ring-2 focus:ring-fb-orange/25"
        />
      </label>
      <button
        type="button"
        onClick={copy}
        className="mt-2 h-9 rounded-lg bg-fb-orange px-4 text-xs font-semibold text-white transition-colors hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange"
      >
        {copied ? '✓ Copied' : 'Copy embed code'}
      </button>
    </div>
  );
}

export function Hub() {
  const origin = window.location.origin;
  return (
    <div className="mx-auto w-full max-w-[760px] p-4">
      <h1 className="text-lg font-bold text-fb-orange">FitBudd Internal Tools</h1>
      <p className="mt-1 text-sm text-gray-600">
        Embeddable lead-magnet tools. Each tool is its own page, its own Webflow
        embed and its own HubSpot lead source. This index is internal and not
        indexed by search engines.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} origin={origin} />
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Health checks:{' '}
        <a className="text-fb-teal underline" href="/api/track">
          /api/track
        </a>{' '}
        (HubSpot forms) ·{' '}
        <a className="text-fb-teal underline" href="/api/generate">
          /api/generate
        </a>{' '}
        (Gemini)
      </p>
    </div>
  );
}
