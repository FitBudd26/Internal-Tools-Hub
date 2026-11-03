import { useState } from 'react';
import { CTASection } from '../../shared/components/CTASection';
import { PdfDownloadButton } from '../../shared/components/PdfDownloadButton';
import { ToolMark } from '../../shared/components/ToolMark';
import { ToolModal } from '../../shared/components/ToolModal';
import { INTAKE_DISCLAIMER } from '../../shared/disclaimers';
import { FAILURE_MESSAGES, type IntakeFailure } from './aiIntake';
import { downloadIntakePdf } from './generatePdf';
import { DownloadIcon, PencilIcon } from './icons';
import { QuestionnairePreview } from './QuestionnairePreview';
import { countQuestions, estimateMinutes, updateTitle } from './questionUtils';
import { CTA_TEXT, CTA_URL } from './tracking';
import type { CoachLogo, PdfOptions, Questionnaire } from './types';

interface IntakeResultsModalProps {
  open: boolean;
  questionnaire: Questionnaire | null;
  onChange: (next: Questionnaire) => void;
  regenerating: boolean;
  regenerateError: IntakeFailure | null;
  onRegenerate: () => void;
  onChangeSettings: () => void;
  onClose: () => void;
  onPdfDownloaded: (fileName: string) => void;
  onCtaClick: () => void;
}

const DEFAULT_REVIEW_NOTICE = 'Review the health-related and consent questions, and adapt them to your local requirements, before sending this form to clients.';
const CTA_HIGHLIGHTS = ['Custom client onboarding and forms', 'Personalized workouts and progress tracking', 'Client messaging, payments, and coaching tools'];
const fieldCls =
  'w-full rounded-lg border border-gray-300 bg-white px-2.5 text-[13px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-fb-orange focus:ring-2 focus:ring-fb-orange/25';
const labelCls = 'mb-0.5 block text-[12px] font-bold text-gray-900';

/** The coach's logo stays in the browser: read for the PDF only, never uploaded anywhere. */
async function readLogo(file: File): Promise<CoachLogo> {
  if (!/^image\/(png|jpeg)$/.test(file.type)) throw new Error('Use a PNG or JPG image.');
  if (file.size > 1.5 * 1024 * 1024) throw new Error('Keep the logo under 1.5 MB.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read that file.'));
    r.readAsDataURL(file);
  });
  const ratio = await new Promise<number>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalHeight / Math.max(img.naturalWidth, 1));
    img.onerror = () => reject(new Error('That image could not be decoded.'));
    img.src = dataUrl;
  });
  return { dataUrl, ratio };
}

/** Screen 3: the generated form in the shared modal, with editing, PDF, regenerate and the FitBudd CTA. */
export function IntakeResultsModal({
  open,
  questionnaire,
  onChange,
  regenerating,
  regenerateError,
  onRegenerate,
  onChangeSettings,
  onClose,
  onPdfDownloaded,
  onCtaClick,
}: IntakeResultsModalProps) {
  const [pdf, setPdf] = useState<PdfOptions>({ pageSize: 'letter', coachName: '', coachLogo: null });
  const [logoError, setLogoError] = useState('');
  const [titleDraft, setTitleDraft] = useState<string | null>(null);

  if (!questionnaire) return null;
  const q = questionnaire;
  const count = countQuestions(q);
  const pageLabel = pdf.pageSize === 'letter' ? 'US Letter' : 'A4';

  const commitTitle = () => {
    if (titleDraft !== null) onChange(updateTitle(q, titleDraft));
    setTitleDraft(null);
  };

  return (
    <ToolModal
      open={open}
      onClose={onClose}
      icon={<ToolMark size={18} className="shrink-0" />}
      title="Your Custom Intake Form Is Ready"
      subtitle="Review it, edit any question, then download the client-ready PDF."
      footer={
        <CTASection
          headline="Turn Your Intake Form Into a Complete Coaching Experience"
          body="Collect client information, build personalized programs, track progress, and manage your coaching business inside your own branded fitness app."
          highlights={CTA_HIGHLIGHTS}
          ctaText={CTA_TEXT}
          ctaUrl={CTA_URL}
          onCtaClick={onCtaClick}
          microCopy="No credit card required · Built for fitness professionals"
        />
      }
    >
      {/* Summary */}
      <div className="rounded-xl border border-fb-tint-border bg-fb-tint p-3">
        {titleDraft === null ? (
          <div className="flex items-start gap-1.5">
            <h3 className="min-w-0 flex-1 text-base font-bold leading-tight text-gray-900">{q.formTitle}</h3>
            <button
              type="button"
              onClick={() => setTitleDraft(q.formTitle)}
              aria-label="Edit form title"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-white hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-orange"
            >
              <PencilIcon />
            </button>
          </div>
        ) : (
          <input
            autoFocus
            aria-label="Form title"
            value={titleDraft}
            maxLength={120}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') setTitleDraft(null);
            }}
            className={`${fieldCls} h-9 text-[15px] font-bold`}
          />
        )}
        {q.formDescription && <p className="mt-1 text-[12px] leading-snug text-gray-600">{q.formDescription}</p>}
        <p className="mt-1.5 text-[12px] font-semibold text-gray-700">
          {count} Question{count === 1 ? '' : 's'} · {q.sections.length} Section{q.sections.length === 1 ? '' : 's'} · {estimateMinutes(count)} min
        </p>
      </div>

      <p className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-2 text-[12px] leading-snug text-orange-900">{q.reviewNotice || DEFAULT_REVIEW_NOTICE}</p>

      <QuestionnairePreview questionnaire={q} onChange={onChange} />

      {/* PDF options + download */}
      <details className="rounded-lg border border-gray-200 bg-white p-2.5 text-[13px]">
        <summary className="cursor-pointer font-bold text-gray-900">
          PDF options{' '}
          <span className="font-normal text-gray-400">
            · {pageLabel}
            {pdf.coachName ? ` · ${pdf.coachName}` : ''}
            {pdf.coachLogo ? ' · your logo' : ''}
          </span>
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <label className="block">
            <span className={labelCls}>
              Coach or business name <span className="font-normal text-gray-500">(optional, printed in the header)</span>
            </span>
            <input value={pdf.coachName} maxLength={80} onChange={(e) => setPdf((p) => ({ ...p, coachName: e.target.value }))} placeholder="e.g. Summit Strength Coaching" className={`${fieldCls} h-9`} />
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <span className={labelCls}>Page size</span>
              <div role="radiogroup" aria-label="Page size" className="flex overflow-hidden rounded-lg border border-gray-300">
                {(['letter', 'a4'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={pdf.pageSize === size}
                    onClick={() => setPdf((p) => ({ ...p, pageSize: size }))}
                    className={`h-9 px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fb-teal ${
                      pdf.pageSize === size ? 'bg-fb-teal text-white' : 'bg-white text-gray-700 hover:bg-fb-tint'
                    }`}
                  >
                    {size === 'letter' ? 'US Letter' : 'A4'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={labelCls}>
                Your logo <span className="font-normal text-gray-500">(optional)</span>
              </span>
              <div className="flex items-center gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-700 transition-colors hover:bg-fb-tint">
                  {pdf.coachLogo ? 'Replace logo' : 'Upload PNG or JPG'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      try {
                        const logo = await readLogo(file);
                        setPdf((p) => ({ ...p, coachLogo: logo }));
                        setLogoError('');
                      } catch (err) {
                        setLogoError(err instanceof Error ? err.message : 'Could not use that file.');
                      }
                    }}
                  />
                </label>
                {pdf.coachLogo && (
                  <>
                    <img src={pdf.coachLogo.dataUrl} alt="Your logo" className="h-8 w-auto max-w-[80px] rounded border border-gray-200 bg-white p-0.5" />
                    <button type="button" onClick={() => setPdf((p) => ({ ...p, coachLogo: null }))} className="text-[12px] text-gray-500 hover:underline">
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          {logoError && (
            <p className="text-[11px] text-red-600" role="alert">
              {logoError}
            </p>
          )}
          <p className="text-[11px] text-gray-400">Your logo stays in this browser and is only placed on the PDF.</p>
        </div>
      </details>

      <PdfDownloadButton
        onDownload={() => downloadIntakePdf(q, pdf)}
        onDownloaded={onPdfDownloaded}
        icon={<DownloadIcon />}
        ariaLabel={`Download ${q.formTitle} as a PDF`}
      />
      <p className="-mt-1 text-center text-[11px] text-gray-400">
        Client-ready printable PDF · {pageLabel} · {count} questions, exactly as shown above
      </p>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          aria-busy={regenerating}
          className="rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-wait disabled:opacity-60 disabled:hover:no-underline"
        >
          {regenerating ? 'Regenerating…' : '↻ Regenerate form'}
        </button>
        <button
          type="button"
          onClick={onChangeSettings}
          className="rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange"
        >
          Change settings
        </button>
      </div>
      {regenerateError && !regenerating && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-center text-[12px] leading-snug text-red-700">
          {FAILURE_MESSAGES[regenerateError]}
        </p>
      )}

      {q.coachNotes.length > 0 && (
        <details className="rounded-lg border border-fb-tint-border bg-white p-2.5 text-[13px] leading-snug text-gray-700">
          <summary className="cursor-pointer font-bold text-gray-900">Coach notes (for you, not printed on the form)</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {q.coachNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </details>
      )}

      <p className="border-t border-gray-100 pt-2 text-[11px] leading-snug text-gray-400">Disclaimer: {INTAKE_DISCLAIMER}</p>
    </ToolModal>
  );
}
