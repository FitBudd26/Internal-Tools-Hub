import { useState, type FormEvent } from 'react';
import { DumbbellMark } from '../../shared/components/DumbbellMark';
import { SelectDropdown } from '../../shared/components/SelectDropdown';
import { isValidEmail } from '../../shared/lib/tracking';
import { OneRepMaxModal } from './OneRepMaxModal';
import { generateGuidanceWithAi } from './aiGuidance';
import { calculate } from './calculate';
import { trackCtaClick, trackLead } from './tracking';
import { EXERCISES, GOALS, REP_OPTIONS, UNITS, WEIGHT_MAX, WEIGHT_MIN, toOneRmInput, type Guidance, type OneRmFormState, type OneRmResult } from './types';

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls = 'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';
const rowCls = 'grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2';

type Field = 'weight' | 'email';
type Pending = 'idle' | 'calculate' | 'regenerate';

// Bench press is selected to start with, as in the standalone calculator.
const EMPTY: OneRmFormState = { exercise: 'Bench Press', weight: '', reps: null, unit: 'lbs', goal: null, email: '' };

function RequiredMark() {
  return (
    <span className="text-fb-orange" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export function OneRepMaxCalculator() {
  const [form, setForm] = useState<OneRmFormState>(EMPTY);
  const [touched, setTouched] = useState<Record<Field, boolean>>({ weight: false, email: false });
  const [result, setResult] = useState<OneRmResult | null>(null);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<Pending>('idle');
  const [variant, setVariant] = useState(0);

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));
  const set = <K extends keyof OneRmFormState>(key: K, value: OneRmFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const input = toOneRmInput(form);
  const weightNumber = Number(form.weight);
  const weightValid = /^\d{1,4}(\.\d)?$/.test(form.weight.trim()) && weightNumber >= WEIGHT_MIN && weightNumber <= WEIGHT_MAX;
  const emailValid = isValidEmail(form.email);
  const isValid = Boolean(input) && emailValid;
  const calculating = pending === 'calculate';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input || !isValid || pending !== 'idle') return;
    setPending('calculate');
    try {
      // The max and the charts are formulas; Gemini adds the guidance (the built-in guidance otherwise).
      const calculated = calculate(input);
      const { guidance: generated } = await generateGuidanceWithAi(calculated, 0);
      setResult(calculated);
      setGuidance(generated);
      setVariant(0);
      setModalOpen(true);
      // HubSpot lead; fire-and-forget, never blocks the results.
      trackLead(form.email, calculated);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle' || !result) return;
    const next = variant + 1;
    setPending('regenerate');
    try {
      const { guidance: generated } = await generateGuidanceWithAi(result, next);
      setVariant(next);
      setGuidance(generated);
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
              <span className="truncate">One Rep Max Calculator</span>
            </h1>
            <p className="mt-1 text-center text-[13px] text-gray-600">
              For coaches. Calculate client 1RMs and generate training load charts instantly.
            </p>
          </div>

          <div className="@container relative z-30">
            <div className={rowCls}>
              <SelectDropdown label="Exercise" required placeholder="Select exercise" options={EXERCISES} selected={form.exercise} onChange={(v) => set('exercise', v)} />
              <div>
                <label htmlFor="onerm-weight" className={labelCls}>
                  Weight Lifted
                  <RequiredMark />
                </label>
                <div className={`flex h-10 items-stretch overflow-hidden rounded-lg border bg-white focus-within:ring-2 ${touched.weight && !weightValid ? 'border-red-400 focus-within:ring-red-300/40' : 'border-gray-300 focus-within:border-fb-orange focus-within:ring-fb-orange/25'}`}>
                  <input
                    id="onerm-weight"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="225"
                    value={form.weight}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, '');
                      if (/^\d{0,4}(\.\d?)?$/.test(v)) set('weight', v);
                    }}
                    onBlur={() => touch('weight')}
                    aria-invalid={touched.weight && !weightValid}
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                  <div role="radiogroup" aria-label="Weight unit" className="flex shrink-0 items-center gap-0.5 border-l border-gray-200 bg-gray-50 px-1">
                    {UNITS.map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        role="radio"
                        aria-checked={form.unit === unit}
                        onClick={() => set('unit', unit)}
                        className={`h-7 rounded-md px-2 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-teal ${form.unit === unit ? 'bg-fb-teal text-white' : 'text-gray-500 hover:text-gray-800'}`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
                {touched.weight && !weightValid && (
                  <p className="mt-1 text-xs text-red-500" role="alert">Enter the weight lifted.</p>
                )}
              </div>
            </div>
          </div>

          <div className="@container relative z-20">
            <div className={rowCls}>
              <SelectDropdown label="Reps Completed" required placeholder="Select reps" options={REP_OPTIONS} selected={form.reps} onChange={(v) => set('reps', v)} />
              <SelectDropdown label="Training Goal" labelHint="(optional)" placeholder="Select goal" options={GOALS} selected={form.goal} onChange={(v) => set('goal', v)} />
            </div>
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

          <div className="mt-auto">
            <button
              type="submit"
              disabled={!isValid || pending !== 'idle'}
              aria-busy={calculating}
              className={`h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors enabled:hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange ${
                calculating ? 'cursor-wait opacity-80' : 'disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400'
              }`}
            >
              {calculating ? 'Calculating…' : 'Calculate My 1RM'}
            </button>
            <p className="mt-1 text-center text-xs text-gray-400">Six formulas, a training load chart and a four-week plan</p>
          </div>
        </form>
      </div>

      <OneRepMaxModal
        open={modalOpen}
        result={result}
        guidance={guidance}
        regenerating={pending === 'regenerate'}
        onClose={() => setModalOpen(false)}
        onRegenerate={handleRegenerate}
        onCtaClick={(text, url) => trackCtaClick(form.email, text, url)}
      />
    </div>
  );
}
