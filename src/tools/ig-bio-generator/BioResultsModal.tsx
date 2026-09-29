import { CTASection } from '../../shared/components/CTASection';
import { HashMark } from '../../shared/components/HashMark';
import { ToolModal } from '../../shared/components/ToolModal';
import { BioCard } from './BioCard';
import { CTA_TEXT, CTA_URL, DEMO_URL } from './tracking';
import type { BioResult } from './types';

interface BioResultsModalProps {
  open: boolean;
  result: BioResult | null;
  regenerating: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onCtaClick: (text: string, url: string) => void;
}

export function BioResultsModal({ open, result, regenerating, onClose, onRegenerate, onCtaClick }: BioResultsModalProps) {
  if (!result) return null;
  return (
    <ToolModal
      open={open}
      onClose={onClose}
      icon={<HashMark size={18} className="shrink-0" />}
      title="Your Bios Are Ready"
      subtitle={`Four angles in a ${result.tone.toLowerCase()} tone, all within Instagram's 150 characters.`}
      footer={
        <div>
          <CTASection
            headline="Turn Followers Into Clients"
            body="Your bio brings them in. Your own branded FitBudd app keeps them: programs, payments, check-ins and progress in one place."
            ctaText={CTA_TEXT}
            ctaUrl={CTA_URL}
            onCtaClick={() => onCtaClick(CTA_TEXT, CTA_URL)}
            microCopy="No credit card required · Built for fitness professionals"
          />
          <p className="mt-2 text-center text-[11px] text-gray-500">
            Prefer a walkthrough?{' '}
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" onClick={() => onCtaClick('Book a free demo', DEMO_URL)} className="font-semibold text-fb-teal underline">
              Book a free demo
            </a>
          </p>
        </div>
      }
    >
      {result.bios.map((bio, i) => (
        <BioCard key={bio.text} bio={bio} index={i} />
      ))}

      <button
        type="button"
        onClick={onRegenerate}
        disabled={regenerating}
        aria-busy={regenerating}
        className="mx-auto rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-wait disabled:opacity-60 disabled:hover:no-underline"
      >
        {regenerating ? 'Regenerating…' : '↻ Regenerate bios'}
      </button>
    </ToolModal>
  );
}
