import { CTASection } from '../../shared/components/CTASection';
import { PdfDownloadButton } from '../../shared/components/PdfDownloadButton';
import { ToolMark } from '../../shared/components/ToolMark';
import { ToolModal } from '../../shared/components/ToolModal';
import { CHALLENGE_DISCLAIMER } from '../../shared/disclaimers';
import { ChallengePreview } from './ChallengePreview';
import { downloadChallengePdf } from './generatePdf';
import { CTA_TEXT, CTA_URL } from './tracking';
import type { Challenge } from './types';

interface ChallengeModalProps {
  open: boolean;
  challenge: Challenge | null;
  regenerating: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onCreateAnother: () => void;
  onPdfDownloaded: (fileName: string) => void;
  onCtaClick: () => void;
}

/** Results in the same modal as the other tools: preview, PDF, regenerate, CTA. */
export function ChallengeModal({
  open,
  challenge,
  regenerating,
  onClose,
  onRegenerate,
  onCreateAnother,
  onPdfDownloaded,
  onCtaClick,
}: ChallengeModalProps) {
  if (!challenge) return null;
  return (
    <ToolModal
      open={open}
      onClose={onClose}
      icon={<ToolMark size={18} className="shrink-0" />}
      title="Your Ready-to-Run Fitness Challenge"
      subtitle="Preview it below, download the PDF, and deploy it with clients."
      footer={
        <CTASection
          headline="Run this challenge inside your own branded fitness app."
          body="You created the challenge. Now deploy it to clients with daily tasks, check-ins, streaks and results in one place."
          ctaText={CTA_TEXT}
          ctaUrl={CTA_URL}
          onCtaClick={onCtaClick}
          microCopy="No credit card required · 30-day free trial"
          socialProof="Trusted by 10,000+ fitness coaches, personal trainers, gym owners, and studios growing with FitBudd every day."
        />
      }
    >
      <ChallengePreview challenge={challenge} />

      <PdfDownloadButton
        onDownload={() => downloadChallengePdf(challenge)}
        onDownloaded={onPdfDownloaded}
        ariaLabel={`Download the ${challenge.challengeName} as a PDF`}
      />
      <p className="-mt-1 text-center text-[11px] text-gray-400">
        Client-ready, branding-neutral PDF with a day-by-day check-in tracker
      </p>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          aria-busy={regenerating}
          className="rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-wait disabled:opacity-60 disabled:hover:no-underline"
        >
          {regenerating ? 'Regenerating…' : '↻ Regenerate'}
        </button>
        <button
          type="button"
          onClick={onCreateAnother}
          className="rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange"
        >
          Create another challenge
        </button>
      </div>

      <p className="border-t border-gray-100 pt-2 text-[11px] leading-snug text-gray-400">
        Disclaimer: {CHALLENGE_DISCLAIMER}
      </p>
    </ToolModal>
  );
}
