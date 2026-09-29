import { useState, type FormEvent } from 'react';
import { InstagramMark } from '../../shared/components/InstagramMark';
import { MultiSelectChips } from '../../shared/components/MultiSelectChips';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { isValidEmail } from '../../shared/lib/tracking';
import { UsernameResultsModal } from './UsernameResultsModal';
import { generateUsernamesWithAi } from './aiUsernames';
import { trackCtaClick, trackGeneration } from './tracking';
import { FITNESS_NICHES, TONE_STYLES, TRAINER_TYPES, type UsernameFormState, type UsernameResult } from './types';

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls = 'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';

type Field = 'niches' | 'trainerTypes' | 'fullName' | 'email';
type Pending = 'idle' | 'generate' | 'regenerate';

const EMPTY: UsernameFormState = { fullName: '', email: '', niches: [], trainerTypes: [], tones: [], keyword: '' };

function RequiredMark() {
  return (
    <span className="text-fb-orange" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export function IgUsernameGenerator() {
  const [form, setForm] = useState<UsernameFormState>(EMPTY);
  const [touched, setTouched] = useState<Record<Field, boolean>>({ niches: false, trainerTypes: false, fullName: false, email: false });
  const [result, setResult] = useState<UsernameResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<Pending>('idle');
  const [variant, setVariant] = useState(0);

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));
  const set = <K extends keyof UsernameFormState>(key: K, value: UsernameFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const nameValid = form.fullName.trim().length > 0;
  const emailValid = isValidEmail(form.email);
  const isValid = form.niches.length > 0 && form.trainerTypes.length > 0 && nameValid && emailValid;
  const generating = pending === 'generate';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid || pending !== 'idle') return;
    setPending('generate');
    try {
      // Gemini via /api/generate when configured; the ported engine otherwise.
      const { result: generated } = await generateUsernamesWithAi(form, 0);
      setResult(generated);
      setVariant(0);
      setModalOpen(true);
      // HubSpot lead; fire-and-forget, never blocks results.
      trackGeneration(form, generated.usernames);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle' || !result) return;
    const next = variant + 1;
    setPending('regenerate');
    try {
      const { result: generated } = await generateUsernamesWithAi(form, next, result.usernames);
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
              <InstagramMark size={20} className="shrink-0" />
              <span className="truncate">Instagram Username Generator</span>
            </h1>
            <p className="mt-1 text-center text-[13px] text-gray-600">
              Ten short, brandable handles for fitness professionals, in seconds.
            </p>
          </div>

          <div className="@container relative z-30">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <div>
                <MultiSelectDropdown label="Fitness Niche/Specialty" required placeholder="Select your niche" options={FITNESS_NICHES} selected={form.niches} onChange={(v) => { touch('niches'); set('niches', v); }} />
                {touched.niches && form.niches.length === 0 && (
                  <p className="mt-1 text-xs text-red-500" role="alert">Select at least one niche.</p>
                )}
              </div>
              <div>
                <MultiSelectDropdown label="Trainer Type" required placeholder="Select trainer type" options={TRAINER_TYPES} selected={form.trainerTypes} onChange={(v) => { touch('trainerTypes'); set('trainerTypes', v); }} />
                {touched.trainerTypes && form.trainerTypes.length === 0 && (
                  <p className="mt-1 text-xs text-red-500" role="alert">Select at least one trainer type.</p>
                )}
              </div>
            </div>
          </div>

          <MultiSelectChips label="Tone/Style" options={TONE_STYLES} selected={form.tones} onChange={(v) => set('tones', v)} />

          <label className="block">
            <span className={labelCls}>
              Keyword <span className="font-normal text-gray-400">(optional)</span>
            </span>
            <input type="text" placeholder="Add a word you want in your username" value={form.keyword} onChange={(e) => set('keyword', e.target.value)} className={`${inputCls} h-10 ${validCls}`} />
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
              {generating ? 'Generating…' : 'Generate Usernames'}
            </button>
            <p className="mt-1 text-center text-xs text-gray-400">Lowercase, under 18 characters, no numbers, easy to say</p>
          </div>
        </form>
      </div>

      <UsernameResultsModal
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
