import { ChevronDownIcon, ChevronUpIcon, PencilIcon, TrashIcon } from './icons';
import { QUESTION_TYPE_LABELS, type IntakeQuestion } from './types';

interface QuestionCardProps {
  question: IntakeQuestion;
  number: number;
  canUp: boolean;
  canDown: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

const FauxBox = () => <span className="inline-block h-3 w-3 shrink-0 rounded-[3px] border border-gray-400 align-[-1px]" aria-hidden="true" />;

/** A sketch of the answer area, so the preview reads like the PDF will. */
function AnswerPreview({ q }: { q: IntakeQuestion }) {
  const muted = 'text-[12px] text-gray-600';
  switch (q.type) {
    case 'short_text':
    case 'number':
    case 'date':
      return <div className={`mt-1.5 h-5 ${q.type === 'short_text' ? 'w-full' : 'w-32'} border-b border-dashed border-gray-300`} aria-hidden="true" />;
    case 'long_text':
      return <div className="mt-1.5 h-10 rounded border border-dashed border-gray-300 bg-gray-50" aria-hidden="true" />;
    case 'yes_no':
      return (
        <p className={`mt-1.5 flex gap-4 ${muted}`}>
          <span className="flex items-center gap-1.5">
            <FauxBox /> Yes
          </span>
          <span className="flex items-center gap-1.5">
            <FauxBox /> No
          </span>
        </p>
      );
    case 'single_select':
    case 'multi_select':
      return (
        <ul className={`mt-1.5 grid gap-x-3 gap-y-0.5 ${q.options.length >= 4 && q.options.every((o) => o.length <= 24) ? 'grid-cols-2' : 'grid-cols-1'} ${muted}`}>
          {q.options.map((o) => (
            <li key={o} className="flex items-start gap-1.5">
              <FauxBox />
              <span className="leading-snug">{o}</span>
            </li>
          ))}
        </ul>
      );
    case 'rating': {
      const [lo, hi] = q.scaleLabels ?? ['Low', 'High'];
      return (
        <div className={`mt-1.5 ${muted}`}>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-gray-400 text-[10px] text-gray-500">
                {n}
              </span>
            ))}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500">
            1 = {lo} · 5 = {hi}
          </p>
        </div>
      );
    }
    case 'acknowledgment':
      return (
        <p className={`mt-1.5 flex items-center gap-1.5 ${muted}`}>
          <FauxBox /> Tick to confirm
        </p>
      );
  }
}

const actionCls =
  'flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-orange disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400';

export function QuestionCard({ question: q, number, canUp, canDown, onEdit, onRemove, onMove }: QuestionCardProps) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-2">
      <div className="flex items-start gap-1.5">
        <span className="w-5 shrink-0 pt-px text-[12px] font-bold text-gray-500">{number}.</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug text-gray-900">
            {q.question}
            {q.required && (
              <span className="text-fb-orange" aria-label="required">
                {' '}
                *
              </span>
            )}
          </p>
          {q.helpText && <p className="mt-0.5 text-[11px] italic leading-snug text-gray-500">{q.helpText}</p>}
          <AnswerPreview q={q} />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-fb-tint px-1.5 py-0.5 text-[10px] font-semibold text-fb-teal">{QUESTION_TYPE_LABELS[q.type]}</span>
            {!q.required && <span className="text-[10px] text-gray-400">Optional</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-0.5" role="group" aria-label={`Question ${number} actions`}>
          <button type="button" className={actionCls} onClick={() => onMove(-1)} disabled={!canUp} aria-label="Move question up">
            <ChevronUpIcon />
          </button>
          <button type="button" className={actionCls} onClick={() => onMove(1)} disabled={!canDown} aria-label="Move question down">
            <ChevronDownIcon />
          </button>
          <button type="button" className={actionCls} onClick={onEdit} aria-label="Edit question">
            <PencilIcon />
          </button>
          <button type="button" className={`${actionCls} hover:text-red-600`} onClick={onRemove} aria-label="Remove question">
            <TrashIcon />
          </button>
        </div>
      </div>
    </li>
  );
}
