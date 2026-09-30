import { CTASection } from '../../shared/components/CTASection';
import { DumbbellMark } from '../../shared/components/DumbbellMark';
import { PdfDownloadButton } from '../../shared/components/PdfDownloadButton';
import { ToolModal } from '../../shared/components/ToolModal';
import { WORKOUT_DISCLAIMER } from '../../shared/disclaimers';
import { WorkoutPlanView } from './WorkoutPlanView';
import { downloadWorkoutPdf } from './generatePdf';
import { CTA_TEXT, CTA_URL } from './links';
import type { WorkoutPlan } from './types';

interface WorkoutModalProps {
  open: boolean;
  plan: WorkoutPlan | null;
  regenerating: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onBuildAnother: () => void;
  onPdfDownloaded: (fileName: string) => void;
  onCtaClick: () => void;
}

const linkCls =
  'rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange';

/** Results in the same modal as the other tools: the full plan, the PDF, regenerate and the CTA. */
export function WorkoutModal({ open, plan, regenerating, onClose, onRegenerate, onBuildAnother, onPdfDownloaded, onCtaClick }: WorkoutModalProps) {
  if (!plan) return null;
  return (
    <ToolModal
      open={open}
      onClose={onClose}
      icon={<DumbbellMark size={18} className="shrink-0" />}
      title="Your Workout Plan Is Ready"
      subtitle={[plan.clientName, plan.goal, plan.duration].filter(Boolean).join(' · ')}
      footer={
        <CTASection
          headline="There's a better way to train clients."
          body="Launch your own branded fitness app with 4000+ interactive exercises, a custom workout builder and client progress tracking."
          ctaText={CTA_TEXT}
          ctaUrl={CTA_URL}
          onCtaClick={onCtaClick}
          microCopy="No credit card required · Built for coaches, trainers and gyms"
        />
      }
    >
      <WorkoutPlanView plan={plan} />

      <PdfDownloadButton
        onDownload={() => downloadWorkoutPdf(plan)}
        onDownloaded={onPdfDownloaded}
        label="Download full plan (PDF)"
        ariaLabel="Download the workout plan as a PDF"
      />
      <p className="-mt-1 text-center text-[11px] text-gray-400">Client-ready PDF with every exercise, cue and modification</p>

      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={onRegenerate} disabled={regenerating} aria-busy={regenerating} className={`${linkCls} disabled:cursor-wait disabled:opacity-60 disabled:hover:no-underline`}>
          {regenerating ? 'Regenerating…' : '↻ Regenerate'}
        </button>
        <button type="button" onClick={onBuildAnother} className={linkCls}>
          Build another workout
        </button>
      </div>

      <p className="border-t border-gray-100 pt-2 text-[11px] leading-snug text-gray-400">Disclaimer: {WORKOUT_DISCLAIMER}</p>
    </ToolModal>
  );
}
