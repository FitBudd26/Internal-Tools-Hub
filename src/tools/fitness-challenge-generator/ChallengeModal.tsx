import { CTASection } from '../../shared/components/CTASection';
import { ToolMark } from '../../shared/components/ToolMark';
import { ToolModal } from '../../shared/components/ToolModal';
import { ChallengePreview } from './ChallengePreview';
import { PDFDownloadButton } from './PDFDownloadButton';
import { CTA_TEXT, CTA_URL } from './tracking';
import type { Challenge } from './types';

interface ChallengeModalProps {
  open: boolean;
  challenge: Challenge | null;
  onClose: () => void;
  onCreateAnother: () => void;
  onPdfDownloaded: (fileName: string) => void;
  onCtaClick: () => void;
}

/** Results in the same modal as the Hashtag Generator: preview, PDF, CTA. */
export function ChallengeModal({
  open,
  challenge,
  onClose,
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

      <PDFDownloadButton challenge={challenge} onDownloaded={onPdfDownloaded} />
      <p className="-mt-1 text-center text-[11px] text-gray-400">
        Client-ready, branding-neutral PDF with a day-by-day check-in tracker
      </p>

      <button
        type="button"
        onClick={onCreateAnother}
        className="mx-auto rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange"
      >
        ↻ Create another challenge
      </button>
    </ToolModal>
  );
}
