import { useEffect, useId, useRef, useState } from 'react';
import type { PlatformHashtags } from './types';
import { copyText } from '../../shared/lib/copy';
import { CTASection } from '../../shared/components/CTASection';
import { CTA_TEXT, CTA_URL } from './tracking';
import { HashMark } from '../../shared/components/HashMark';
import { PlatformHashtagBlock } from './PlatformHashtagBlock';

interface ResultsModalProps {
  open: boolean;
  results: PlatformHashtags[];
  onClose: () => void;
  onRegenerate: () => void;
  /** True while a fresh set is being fetched; disables Regenerate. */
  regenerating?: boolean;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true" focusable="false">
      <path
        d="M4 4l8 8M12 4l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ResultsModal({
  open,
  results,
  onClose,
  onRegenerate,
  regenerating = false,
}: ResultsModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-[480px] animate-[dd-in_140ms_ease-out] flex-col overflow-hidden rounded-2xl bg-white shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 p-3.5 pb-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="flex items-center gap-1.5 text-sm font-bold text-fb-orange"
            >
              <HashMark size={18} className="shrink-0" />
              <span className="truncate">Your Hashtags Are Ready</span>
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-600">
              Copy the set that fits your platform best.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close results"
            className="shrink-0 rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-orange"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3.5 pt-3">
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
        </div>

        <div className="border-t border-gray-100 p-3.5 pt-3">
          <CTASection
            headline="Turn Content Into Clients"
            body="Posting consistently is easier when your business runs on one system. Build your own branded fitness app, manage clients, sell programs, and grow with FitBudd."
            ctaText={CTA_TEXT}
            ctaUrl={CTA_URL}
            microCopy="No credit card required · Built for fitness professionals"
          />
        </div>
        <span aria-live="polite" className="sr-only">
          {copiedAll ? 'All hashtags copied to clipboard' : ''}
        </span>
      </div>
    </div>
  );
}
