import { useEffect, useRef, useState } from 'react';
import { CTASection } from '../../shared/components/CTASection';
import { InstagramMark } from '../../shared/components/InstagramMark';
import { ToolModal } from '../../shared/components/ToolModal';
import { copyText } from '../../shared/lib/copy';
import { CTA_TEXT, CTA_URL } from './tracking';
import type { UsernameResult } from './types';

function HandleRow({ handle }: { handle: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const handleCopy = async () => {
    if (!(await copyText(handle))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-fb-tint-border bg-fb-tint px-2.5 py-2">
      <span className="flex min-w-0 items-center gap-1.5">
        <InstagramMark size={16} className="shrink-0" />
        <span className="truncate font-mono text-[13px] font-medium text-gray-800">@{handle}</span>
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : `Copy username ${handle}`}
        className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-teal ${
          copied ? 'border-fb-teal bg-fb-teal text-white' : 'border-fb-teal bg-white text-fb-teal hover:bg-fb-teal hover:text-white'
        }`}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

interface UsernameResultsModalProps {
  open: boolean;
  result: UsernameResult | null;
  regenerating: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onCtaClick: () => void;
}

export function UsernameResultsModal({ open, result, regenerating, onClose, onRegenerate, onCtaClick }: UsernameResultsModalProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!result) return null;

  const copyAll = async () => {
    if (!(await copyText(result.usernames.map((u) => `@${u}`).join('\n')))) return;
    setCopiedAll(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopiedAll(false), 1600);
  };

  return (
    <ToolModal
      open={open}
      onClose={onClose}
      icon={<InstagramMark size={18} className="shrink-0" />}
      title="Your Usernames Are Ready"
      subtitle="Short, brandable handles built from your name, niche and style."
      footer={
        <CTASection
          headline="Build your own fitness app and grow your business."
          body="92% of personal trainers using FitBudd gave us 5 stars. Claim your handle, then run your coaching in an app that carries your name."
          ctaText={CTA_TEXT}
          ctaUrl={CTA_URL}
          onCtaClick={onCtaClick}
          microCopy="No credit card required · Built for fitness professionals"
        />
      }
    >
      <div className="@container">
        <div className="grid grid-cols-1 gap-1.5 @sm:grid-cols-2">
          {result.usernames.map((u) => (
            <HandleRow key={u} handle={u} />
          ))}
        </div>
      </div>
      <p className="text-[11px] leading-snug text-gray-500">
        Availability is not checked. Search each handle on Instagram before you commit, and keep a second choice ready.
      </p>

      <button
        type="button"
        onClick={copyAll}
        className="h-10 w-full rounded-lg border border-fb-teal text-sm font-semibold text-fb-teal transition-colors hover:bg-fb-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal"
      >
        {copiedAll ? '✓ Copied All' : 'Copy All'}
      </button>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={regenerating}
        aria-busy={regenerating}
        className="mx-auto rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-wait disabled:opacity-60 disabled:hover:no-underline"
      >
        {regenerating ? 'Regenerating…' : '↻ Regenerate usernames'}
      </button>
      <span aria-live="polite" className="sr-only">{copiedAll ? 'All usernames copied to clipboard' : ''}</span>
    </ToolModal>
  );
}
