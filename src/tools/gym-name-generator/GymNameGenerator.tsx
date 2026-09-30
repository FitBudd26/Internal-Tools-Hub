import { useState, type FormEvent } from 'react';
import { DumbbellMark } from '../../shared/components/DumbbellMark';
import { MultiSelectChips } from '../../shared/components/MultiSelectChips';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { isValidEmail } from '../../shared/lib/tracking';
import { GymNameResultsModal } from './GymNameResultsModal';
import { generateGymNamesWithAi } from './aiGymNames';
import { trackCtaClick, trackGeneration } from './tracking';
import { AUDIENCES, GYM_TYPES, TONE_STYLES, type GymNameFormState, type GymNameResult } from './types';

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls = 'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';

type Field = 'gymTypes' | 'audiences' | 'fullName' | 'email';
type Pending = 'idle' | 'generate' | 'regenerate';

const EMPTY: GymNameFormState = { fullName: '', email: '', gymTypes: [], audiences: [], tones: [], keyword: '' };

function RequiredMark() {
  return (
    <span className="text-fb-orange" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export function GymNameGenerator() {
  const [form, setForm] = useState<GymNameFormState>(EMPTY);
  const [touched, setTouched] = useState<Record<Field, boolean>>({ gymTypes: false, audiences: false, fullName: false, email: false });
  const [result, setResult] = useState<GymNameResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<Pending>('idle');
  const [variant, setVariant] = useState(0);

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));
  const set = <K extends keyof GymNameFormState>(key: K, value: GymNameFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const nameValid = form.fullName.trim().length >= 2;
  const emailValid = isValidEmail(form.email);
  const isValid = form.gymTypes.length > 0 && form.audiences.length > 0 && nameValid && emailValid;
  const generating = pending === 'generate';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid || pending !== 'idle') return;
    setPending('generate');
    try {
      // Gemini via /api/generate when configured; the ported engine otherwise.
      const { result: generated } = await generateGymNamesWithAi(form, 0);
      setResult(generated);
      setVariant(0);
      setModalOpen(true);
      // HubSpot lead; fire-and-forget, never blocks results.
      trackGeneration(form, generated.names);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle' || !result) return;
    const next = variant + 1;
    setPending('regenerate');
    try {
      const { result: generated } = await generateGymNamesWithAi(form, next, result.names);
      setVariant(next);
      setResult(generated);
    } finally {
      setPending('idle');
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <div className="flex min-h-[440px] flex-col">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2.5" noValidate>
          <div>
            <h1 className="flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-bold text-fb-orange">
              <DumbbellMark size={20} className="shrink-0" />
              <span className="truncate">Gym Name Generator</span>
            </h1>
            <p className="mt-1 text-center text-[13px] text-gray-600">
              Ten brandable names for your gym or studio, in seconds.
            </p>
          </div>

          <div className="@container relative z-30">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <div>
                <MultiSelectDropdown label="Gym Type/Focus" required placeholder="Select your gym type" options={GYM_TYPES} selected={form.gymTypes} onChange={(v) => { touch('gymTypes'); set('gymTypes', v); }} />
                {touched.gymTypes && form.gymTypes.length === 0 && (
                  <p className="mt-1 text-xs text-red-500" role="alert">Select at least one gym type.</p>
                )}
              </div>
              <div>
                <MultiSelectDropdown label="Target Audience" required placeholder="Select target audience" options={AUDIENCES} selected={form.audiences} onChange={(v) => { touch('audiences'); set('audiences', v); }} />
                {touched.audiences && form.audiences.length === 0 && (
                  <p className="mt-1 text-xs text-red-500" role="alert">Select at least one audience.</p>
                )}
              </div>
            </div>
          </div>

          <MultiSelectChips label="Tone/Style" options={TONE_STYLES} selected={form.tones} onChange={(v) => set('tones', v)} />

          <label className="block">
            <span className={labelCls}>
              Keyword <span className="font-normal text-gray-400">(optional)</span>
            </span>
            <input type="text" placeholder="Add a word you want in your gym name" value={form.keyword} onChange={(e) => set('keyword', e.target.value)} className={`${inputCls} h-10 ${validCls}`} />
          </label>

          <div className="@container">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <div>
                <label className="block">
                  <span className={labelCls}>
                    Full Name
                    <RequiredMark />
                  </span>
                  <input type="text" required autoComplete="name" placeholder="e.g. Alex Rivera" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} onBlur={() => touch('fullName')} aria-invalid={touched.fullName && !nameValid} className={`${inputCls} h-10 ${touched.fullName && !nameValid ? invalidCls : validCls}`} />
                </label>
                {touched.fullName && !nameValid && (
                  <p className="mt-1 text-xs text-red-500" role="alert">Full name is required.</p>
                )}
              </div>
              <div>
                <label className="block">
                  <span className={labelCls}>
                    Email
                    <RequiredMark />
                  </span>
                  <input type="email" required inputMode="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} onBlur={() => touch('email')} aria-invalid={touched.email && !emailValid} className={`${inputCls} h-10 ${touched.email && !emailValid ? invalidCls : validCls}`} />
                </label>
                {touched.email && !emailValid && (
                  <p className="mt-1 text-xs text-red-500" role="alert">Enter a valid email address.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <button
              type="submit"
              disabled={!isValid || pending !== 'idle'}
              aria-busy={generating}
              className={`h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors enabled:hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange ${
                generating ? 'cursor-wait opacity-80' : 'disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400'
              }`}
            >
              {generating ? 'Generating…' : 'Generate Gym Names'}
            </button>
            <p className="mt-1 text-center text-xs text-gray-400">Short, easy to say, and clear of existing gym brands</p>
          </div>
        </form>
      </div>

      <GymNameResultsModal
        open={modalOpen}
        result={result}
        regenerating={pending === 'regenerate'}
        onClose={() => setModalOpen(false)}
        onRegenerate={handleRegenerate}
        onCtaClick={() => trackCtaClick(form.email)}
      />
    </div>
  );
}
