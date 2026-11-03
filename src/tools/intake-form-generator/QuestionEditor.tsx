import { useState } from 'react';
import { questionProblem } from './questionUtils';
import { CHOICE_TYPES, QUESTION_TYPES, QUESTION_TYPE_LABELS, type IntakeQuestion, type QuestionType } from './types';

interface QuestionEditorProps {
  /** null = a new question. */
  initial: IntakeQuestion | null;
  onSave: (question: Omit<IntakeQuestion, 'id'>) => void;
  onCancel: () => void;
}

const fieldCls =
  'w-full rounded-lg border border-gray-300 bg-white px-2.5 text-[13px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-fb-orange focus:ring-2 focus:ring-fb-orange/25';
const labelCls = 'mb-0.5 block text-[12px] font-bold text-gray-900';

/** Inline editor for one question; writes back into the same questionnaire object the PDF uses. */
export function QuestionEditor({ initial, onSave, onCancel }: QuestionEditorProps) {
  const [text, setText] = useState(initial?.question ?? '');
  const [type, setType] = useState<QuestionType>(initial?.type ?? 'short_text');
  const [required, setRequired] = useState(initial?.required ?? true);
  const [optionsText, setOptionsText] = useState((initial?.options ?? []).join('\n'));
  const [helpText, setHelpText] = useState(initial?.helpText ?? '');
  const [lo, setLo] = useState(initial?.scaleLabels?.[0] ?? '');
  const [hi, setHi] = useState(initial?.scaleLabels?.[1] ?? '');
  const [showProblem, setShowProblem] = useState(false);

  const options = optionsText.split('\n').map((o) => o.trim()).filter(Boolean);
  const problem = questionProblem({ question: text, type, options });

  const save = () => {
    if (problem) {
      setShowProblem(true);
      return;
    }
    onSave({
      question: text.trim(),
      type,
      required: type === 'acknowledgment' ? true : required,
      options: CHOICE_TYPES.has(type) ? options : [],
      helpText: helpText.trim().slice(0, 240),
      ...(type === 'rating' ? { scaleLabels: [lo.trim() || 'Low', hi.trim() || 'High'] as [string, string] } : {}),
    });
  };

  return (
    <div className="rounded-lg border border-fb-tint-border bg-fb-tint p-2.5">
      <label className="block">
        <span className={labelCls}>{initial ? 'Edit question' : 'New question'}</span>
        <textarea
          autoFocus
          value={text}
          maxLength={240}
          onChange={(e) => setText(e.target.value)}
          placeholder="What would you like to ask your client?"
          className={`${fieldCls} h-[60px] resize-none py-1.5 leading-snug`}
        />
      </label>
      <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2">
        <label className="block">
          <span className={labelCls}>Answer type</span>
          <select value={type} onChange={(e) => setType(e.target.value as QuestionType)} className={`${fieldCls} h-9`}>
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex h-9 cursor-pointer items-center gap-1.5 text-[12px] text-gray-700">
          <input
            type="checkbox"
            checked={type === 'acknowledgment' ? true : required}
            disabled={type === 'acknowledgment'}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-4 w-4 accent-fb-orange"
          />
          Required
        </label>
      </div>
      {CHOICE_TYPES.has(type) && (
        <label className="mt-2 block">
          <span className={labelCls}>
            Options <span className="font-normal text-gray-500">(one per line, 2 to 12)</span>
          </span>
          <textarea
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder={'Option one\nOption two\nOption three'}
            className={`${fieldCls} h-[72px] resize-none py-1.5 leading-snug`}
          />
        </label>
      )}
      {type === 'rating' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className={labelCls}>Label for 1</span>
            <input value={lo} maxLength={40} onChange={(e) => setLo(e.target.value)} placeholder="Not confident" className={`${fieldCls} h-9`} />
          </label>
          <label className="block">
            <span className={labelCls}>Label for 5</span>
            <input value={hi} maxLength={40} onChange={(e) => setHi(e.target.value)} placeholder="Very confident" className={`${fieldCls} h-9`} />
          </label>
        </div>
      )}
      <label className="mt-2 block">
        <span className={labelCls}>
          Help text <span className="font-normal text-gray-500">(optional)</span>
        </span>
        <input value={helpText} maxLength={240} onChange={(e) => setHelpText(e.target.value)} placeholder="A short hint that helps the client answer" className={`${fieldCls} h-9`} />
      </label>
      {showProblem && problem && (
        <p className="mt-1.5 text-[11px] text-red-600" role="alert">
          {problem}
        </p>
      )}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="h-9 rounded-lg bg-fb-orange px-4 text-[13px] font-semibold text-white transition-colors hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange"
        >
          {initial ? 'Save changes' : 'Add question'}
        </button>
        <button type="button" onClick={onCancel} className="text-[13px] text-gray-500 hover:text-gray-800 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
