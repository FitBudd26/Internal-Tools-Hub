import { useEffect, useRef, useState } from 'react';
import type { PlatformHashtags } from './types';
import { copyText } from '../../shared/lib/copy';
import { CTASection } from '../../shared/components/CTASection';
import { HashMark } from '../../shared/components/HashMark';
import { ToolModal } from '../../shared/components/ToolModal';
import { PlatformHashtagBlock } from './PlatformHashtagBlock';
import { CTA_TEXT, CTA_URL } from './tracking';

interface ResultsModalProps {
  open: boolean;
  results: PlatformHashtags[];
  onClose: () => void;
  onRegenerate: () => void;
  /** True while a fresh set is being fetched; disables Regenerate. */
  regenerating?: boolean;
}

export function ResultsModal({
  open,
  results,
  onClose,
  onRegenerate,
  regenerating = false,
}: ResultsModalProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopyAll = async () => {
    const all = results
      .map((g) => `${g.platform}:\n${g.tags.map((t) => `#${t}`).join(' ')}`)
      .join('\n\n');
    if (!(await copyText(all))) return;
    setCopiedAll(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopiedAll(false), 1600);
  };

  return (
    <ToolModal
      open={open}
      onClose={onClose}
      icon={<HashMark size={18} className="shrink-0" />}
      title="Your Hashtags Are Ready"
      subtitle="Copy the set that fits your platform best."
      footer={
        <CTASection
          headline="Turn Content Into Clients"
          body="Posting consistently is easier when your business runs on one system. Build your own branded fitness app, manage clients, sell programs, and grow with FitBudd."
          ctaText={CTA_TEXT}
          ctaUrl={CTA_URL}
          microCopy="No credit card required · Built for fitness professionals"
        />
      }
    >
      {results.map((group) => (
        <PlatformHashtagBlock key={group.platform} group={group} />
      ))}

      <button
        type="button"
        onClick={handleCopyAll}
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
        {regenerating ? 'Regenerating…' : '↻ Regenerate'}
      </button>

      <span aria-live="polite" className="sr-only">
        {copiedAll ? 'All hashtags copied to clipboard' : ''}
      </span>
    </ToolModal>
  );
}
