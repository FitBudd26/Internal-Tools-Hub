import { useState } from 'react';
import { CTASection } from '../../shared/components/CTASection';
import { PdfDownloadButton } from '../../shared/components/PdfDownloadButton';
import { ToolMark } from '../../shared/components/ToolMark';
import { ToolModal } from '../../shared/components/ToolModal';
import { ATKINS_DISCLAIMER, ATKINS_NON_AFFILIATION } from '../../shared/disclaimers';
import { copyText } from '../../shared/lib/copy';
import { FAILURE_MESSAGES, type RecipeFailure } from './aiRecipes';
import { downloadCollectionPdf, downloadRecipePdf } from './generatePdf';
import { RecipeDetails } from './RecipeDetails';
import { COLLECTION_PDF_FILE, recipePdfFileName, recipeToText } from './recipeUtils';
import { CTA_TEXT, CTA_URL } from './tracking';
import { REVIEW_STATUS_LABELS, type PdfOptions, type RecipeSet } from './types';

interface RecipeResultsModalProps {
  open: boolean;
  set: RecipeSet | null;
  selectedId: string;
  onSelect: (id: string) => void;
  regenerating: boolean;
  regenerateError: RecipeFailure | null;
  onRegenerate: () => void;
  onChangeSettings: () => void;
  onClose: () => void;
  onPdfDownloaded: (fileName: string) => void;
  onCtaClick: () => void;
}

const CTA_HIGHLIGHTS = ['Deliver personalized nutrition guidance', 'Manage coaching clients and progress', 'Launch your own branded fitness app'];

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true" focusable="false">
      <path d="M8 2.5v8m0 0L5 7.5m3 3l3-3M3 11.5v2h10v-2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const secondaryBtn =
  'flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-semibold text-gray-800 transition-colors hover:border-fb-teal hover:text-fb-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal disabled:cursor-wait disabled:opacity-60';

/** Screen 3: three recipe tabs, the selected recipe in full, copy / PDF / regenerate, the disclaimers and the FitBudd CTA. */
export function RecipeResultsModal({ open, set, selectedId, onSelect, regenerating, regenerateError, onRegenerate, onChangeSettings, onClose, onPdfDownloaded, onCtaClick }: RecipeResultsModalProps) {
  const [pdf, setPdf] = useState<PdfOptions>({ pageSize: 'letter' });
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const [collectionState, setCollectionState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  if (!set) return null;
  const selected = set.recipes.find((r) => r.id === selectedId) ?? set.recipes[0];
  const pageLabel = pdf.pageSize === 'letter' ? 'US Letter' : 'A4';

  const handleCopy = async () => {
    const ok = await copyText(recipeToText(selected));
    setCopied(ok ? 'done' : 'failed');
    window.setTimeout(() => setCopied('idle'), 2000);
  };

  const handleCollection = async () => {
    if (collectionState === 'busy') return;
    setCollectionState('busy');
    try {
      const name = await downloadCollectionPdf(set, pdf);
      onPdfDownloaded(name);
      setCollectionState('done');
      window.setTimeout(() => setCollectionState('idle'), 2000);
    } catch {
      setCollectionState('error');
    }
  };

  return (
    <ToolModal
      open={open}
      onClose={onClose}
      icon={<ToolMark size={18} className="shrink-0" />}
      title="Your Atkins-Friendly Recipes Are Ready"
      subtitle={`${set.planLabel} · ${set.mealType} · ${set.cuisine}`}
      footer={
        <CTASection
          headline="Turn Recipes Into a Complete Coaching Experience"
          body="Create personalized meal ideas, manage clients, deliver training programs, and grow your fitness business with your own branded app."
          highlights={CTA_HIGHLIGHTS}
          ctaText={CTA_TEXT}
          ctaUrl={CTA_URL}
          onCtaClick={onCtaClick}
          microCopy="No credit card required · Built for fitness professionals"
        />
      }
    >
      {set.notes.length > 0 && <p className="rounded-md bg-fb-tint px-2.5 py-1.5 text-[12px] leading-snug text-gray-700">{set.notes.join(' ')}</p>}

      {/* Three compact selectable cards */}
      <div role="tablist" aria-label="Generated recipes" className="flex flex-col gap-1.5">
        {set.recipes.map((r, i) => {
          const active = r.id === selected.id;
          const meets = r.atkinsCompatibility.reviewStatus === 'meets_plan_guidelines';
          return (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(r.id)}
              className={`rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-orange ${
                active ? 'border-fb-orange bg-orange-50/60' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-bold leading-snug text-gray-900">
                  {i + 1}. {r.name}
                </span>
                <span className="shrink-0 rounded-full bg-fb-tint px-2 py-0.5 text-[11px] font-semibold text-fb-teal">{r.totalTime} min</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-gray-500">
                <span>{r.mealType}</span>
                <span aria-hidden="true">·</span>
                <span>{r.nutrition.netCarbs === null ? 'net carbs not calculated' : `${r.nutrition.status === 'estimated' ? '≈' : ''}${r.nutrition.netCarbs} g net carbs`}</span>
                <span aria-hidden="true">·</span>
                <span className={meets ? 'font-semibold text-fb-teal' : 'font-semibold text-orange-800'}>{REVIEW_STATUS_LABELS[r.atkinsCompatibility.reviewStatus]}</span>
              </div>
            </button>
          );
        })}
      </div>

      <RecipeDetails recipe={selected} />

      {/* PDF options + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-gray-600">
        <span className="font-semibold text-gray-900">PDF page size</span>
        <div role="radiogroup" aria-label="Page size" className="flex overflow-hidden rounded-lg border border-gray-300">
          {(['letter', 'a4'] as const).map((size) => (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={pdf.pageSize === size}
              onClick={() => setPdf({ pageSize: size })}
              className={`h-8 px-3 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fb-teal ${
                pdf.pageSize === size ? 'bg-fb-teal text-white' : 'bg-white text-gray-700 hover:bg-fb-tint'
              }`}
            >
              {size === 'letter' ? 'US Letter' : 'A4'}
            </button>
          ))}
        </div>
      </div>

      <PdfDownloadButton
        onDownload={() => downloadRecipePdf(selected, set, pdf)}
        onDownloaded={onPdfDownloaded}
        icon={<DownloadIcon />}
        label="Download PDF"
        ariaLabel={`Download ${selected.name} as a PDF`}
      />
      <p className="-mt-1 text-center text-[11px] text-gray-400">
        {recipePdfFileName(selected)} · {pageLabel} · exactly what is shown above
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={handleCopy} className={secondaryBtn} aria-label={`Copy ${selected.name} as text`}>
          {copied === 'done' ? '✓ Copied' : copied === 'failed' ? 'Copy failed' : 'Copy Recipe'}
        </button>
        <button type="button" onClick={handleCollection} disabled={collectionState === 'busy'} aria-busy={collectionState === 'busy'} className={secondaryBtn} aria-label={`Download all three recipes as ${COLLECTION_PDF_FILE}`}>
          {collectionState === 'busy' ? 'Preparing…' : collectionState === 'done' ? '✓ All 3 downloaded' : collectionState === 'error' ? 'Failed, try again' : 'Download All 3 (PDF)'}
        </button>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          aria-busy={regenerating}
          className="rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-wait disabled:opacity-60 disabled:hover:no-underline"
        >
          {regenerating ? 'Generating more recipes…' : '↻ Generate More Recipes'}
        </button>
        <button
          type="button"
          onClick={onChangeSettings}
          className="rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange"
        >
          Change preferences
        </button>
      </div>
      {regenerateError && !regenerating && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-center text-[12px] leading-snug text-red-700">
          {FAILURE_MESSAGES[regenerateError]}
        </p>
      )}

      <p className="border-t border-gray-100 pt-2 text-[11px] leading-snug text-gray-400">
        {ATKINS_DISCLAIMER}
        <br />
        {ATKINS_NON_AFFILIATION}
      </p>
    </ToolModal>
  );
}
