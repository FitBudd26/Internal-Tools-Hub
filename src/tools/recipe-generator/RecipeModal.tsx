import { CTASection } from '../../shared/components/CTASection';
import { PdfDownloadButton } from '../../shared/components/PdfDownloadButton';
import { ToolMark } from '../../shared/components/ToolMark';
import { ToolModal } from '../../shared/components/ToolModal';
import { RECIPE_DISCLAIMER } from '../../shared/disclaimers';
import { RecipeCard } from './RecipeCard';
import { downloadRecipePdf } from './generatePdf';
import { CTA_TEXT, CTA_URL } from './tracking';
import type { RecipeInput, RecipeSet } from './types';

interface RecipeModalProps {
  open: boolean;
  input: RecipeInput;
  set: RecipeSet | null;
  regenerating: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onPdfDownloaded: (fileName: string) => void;
  onCtaClick: () => void;
}

export function RecipeModal({
  open,
  input,
  set,
  regenerating,
  onClose,
  onRegenerate,
  onPdfDownloaded,
  onCtaClick,
}: RecipeModalProps) {
  if (!set) return null;
  return (
    <ToolModal
      open={open}
      onClose={onClose}
      icon={<ToolMark size={18} className="shrink-0" />}
      title="Your Recipes Are Ready"
      subtitle="Tailored to the client goal you set. Download the PDF to share."
      footer={
        <CTASection
          headline="Turn Recipes Into a Scalable Coaching Experience"
          body="Create meal ideas, deliver nutrition guidance, manage clients, and grow your coaching business inside your own branded fitness app."
          ctaText={CTA_TEXT}
          ctaUrl={CTA_URL}
          onCtaClick={onCtaClick}
          microCopy="No credit card required · Built for fitness professionals"
        />
      }
    >
      {(set.notes.length > 0 || set.dailyTarget) && (
        <p className="rounded-md bg-fb-tint px-2 py-1.5 text-[12px] leading-snug text-gray-600">
          {set.dailyTarget ? `Portions sized for about ${set.dailyTarget} kcal per day from the client profile. ` : ''}
          {set.notes.join(' ')}
        </p>
      )}
      {set.recipes.map((r, i) => (
        <RecipeCard key={r.name} recipe={r} index={i} />
      ))}

      <PdfDownloadButton
        onDownload={() => downloadRecipePdf(input, set)}
        onDownloaded={onPdfDownloaded}
        ariaLabel="Download these recipes as a branded PDF"
      />
      <button
        type="button"
        onClick={onRegenerate}
        disabled={regenerating}
        aria-busy={regenerating}
        className="mx-auto rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-wait disabled:opacity-60 disabled:hover:no-underline"
      >
        {regenerating ? 'Generating new recipes…' : '↻ Regenerate with different recipes'}
      </button>

      <p className="border-t border-gray-100 pt-2 text-[11px] leading-snug text-gray-400">
        {set.recipes.some((r) => r.nutritionSource === 'estimated') && (
          <>
            * Estimated from the ingredient list.
            <br />
          </>
        )}
        Disclaimer: {RECIPE_DISCLAIMER}
      </p>
    </ToolModal>
  );
}
