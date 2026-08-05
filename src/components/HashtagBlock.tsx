import { useEffect, useRef, useState } from 'react';
import type { PlatformHashtags } from '../types';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / iframes without clipboard permission.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true" focusable="false">
      <rect
        x="5.5"
        y="5.5"
        width="8"
        height="8"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.5 3.5v-.25A1.25 1.25 0 0 0 9.25 2h-5.5A1.25 1.25 0 0 0 2.5 3.25v5.5A1.25 1.25 0 0 0 3.75 10H4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TagChip({ tag }: { tag: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async () => {
    if (!(await copyText(`#${tag}`))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : `Copy #${tag}`}
      title={copied ? 'Copied' : `Copy #${tag}`}
      className={`rounded-full border px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-teal ${
        copied
          ? 'border-fb-teal bg-fb-teal text-white'
          : 'border-fb-tint-border bg-fb-tint text-gray-700 hover:border-fb-teal hover:text-fb-teal'
      }`}
    >
      {copied ? '✓ Copied' : `#${tag}`}
    </button>
  );
}

/** One platform's hashtag set with a copy-all action. */
export function HashtagBlock({ group }: { group: PlatformHashtags }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopyAll = async () => {
    const all = group.tags.map((t) => `#${t}`).join(' ');
    if (!(await copyText(all))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="rounded-lg border border-fb-tint-border bg-white p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-gray-900">
          {group.platform}
          <span className="ml-1.5 font-normal text-gray-400">
            {group.tags.length} tags
          </span>
        </span>
        <button
          type="button"
          onClick={handleCopyAll}
          aria-label={
            copied ? 'Copied' : `Copy all ${group.platform} hashtags`
          }
          className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-teal ${
            copied
              ? 'text-fb-teal'
              : 'text-fb-teal hover:bg-fb-teal/10'
          }`}
        >
          {copied ? '✓ Copied' : (
            <>
              <CopyIcon />
              Copy all
            </>
          )}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {group.tags.map((tag) => (
          <TagChip key={tag} tag={tag} />
        ))}
      </div>
      <span aria-live="polite" className="sr-only">
        {copied ? `${group.platform} hashtags copied to clipboard` : ''}
      </span>
    </div>
  );
}
