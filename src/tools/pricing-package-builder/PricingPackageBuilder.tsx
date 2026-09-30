import { useState, type FormEvent } from 'react';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { SelectDropdown } from '../../shared/components/SelectDropdown';
import { ToolMark } from '../../shared/components/ToolMark';
import { isValidEmail } from '../../shared/lib/tracking';
import { NumberStepper } from './NumberStepper';
import { PricingModal } from './PricingModal';
import { generateStrategyWithAi } from './aiPricing';
import { trackCtaClick, trackLead } from './tracking';
import {
  COACHING_FORMATS,
  EXPERIENCE_LEVELS,
  HOURS_OPTIONS,
  INCOME_GOALS,
  MAX_CLIENTS_DEFAULT,
  MAX_CLIENTS_MAX,
  MAX_CLIENTS_MIN,
  NICHES,
  PROGRAM_DURATIONS,
  SERVICES,
  toPricingInput,
  type PricingFormState,
  type PricingInput,
  type PricingStrategy,
} from './types';

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls = 'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';
const rowCls = 'grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2';

type Field = 'name' | 'email';
type Pending = 'idle' | 'generate' | 'regenerate';

const EMPTY: PricingFormState = {
  coachingFormat: null,
  niche: null,
  experience: null,
  services: [],
  programDuration: null,
  incomeGoal: null,
  hoursPerWeek: null,
  maxClients: MAX_CLIENTS_DEFAULT,
  name: '',
  email: '',
};

function RequiredMark() {
  return (
    <span className="text-fb-orange" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export function PricingPackageBuilder() {
  const [form, setForm] = useState<PricingFormState>(EMPTY);
  const [touched, setTouched] = useState<Record<Field, boolean>>({ name: false, email: false });
  const [strategy, setStrategy] = useState<PricingStrategy | null>(null);
  const [request, setRequest] = useState<PricingInput | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<Pending>('idle');
  const [variant, setVariant] = useState(0);

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));
  const set = <K extends keyof PricingFormState>(key: K, value: PricingFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const input = toPricingInput(form);
  const nameValid = form.name.trim().length > 0;
  const emailValid = isValidEmail(form.email);
  const isValid = Boolean(input) && nameValid && emailValid;
  const generating = pending === 'generate';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input || !isValid || pending !== 'idle') return;
    setPending('generate');
    try {
      // Prices come from the tool's formula; Gemini writes the packages and the notes (the built-in copy otherwise).
      const { strategy: generated } = await generateStrategyWithAi(input, 0);
      setStrategy(generated);
      setRequest(input);
      setVariant(0);
      setModalOpen(true);
      // HubSpot lead; fire-and-forget, never blocks the results.
      trackLead(form.name, form.email, input, generated.pricing);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle' || !strategy || !request) return;
    const next = variant + 1;
    setPending('regenerate');
    try {
      const { strategy: generated } = await generateStrategyWithAi(request, next, strategy.packages.map((p) => p.name));
      setVariant(next);
      setStrategy(generated);
    } finally {
      setPending('idle');
    }
  };

  // New inputs: clear the coaching details, keep the coach's name and email.
  const handleStartOver = () => {
    setModalOpen(false);
    setForm((f) => ({ ...EMPTY, name: f.name, email: f.email }));
  };

  const subtitle = request ? [request.niche, request.experience, `${request.incomeGoal}/mo goal`].join(' · ') : '';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <div className="flex min-h-[440px] flex-col">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2.5" noValidate>
          <div>
            <h1 className="flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-bold text-fb-orange">
              <ToolMark size={20} className="shrink-0" />
              <span className="truncate">Pricing &amp; Package Builder</span>
            </h1>
            <p className="mt-1 text-center text-[13px] text-gray-600">Three coaching packages priced to reach your income goal.</p>
          </div>

          <div className="@container relative z-40">
            <div className={rowCls}>
              <SelectDropdown label="Coaching Format" required placeholder="Select format" options={COACHING_FORMATS} selected={form.coachingFormat} onChange={(v) => set('coachingFormat', v)} />
              <SelectDropdown label="Fitness Niche" required placeholder="Select niche" options={NICHES} selected={form.niche} onChange={(v) => set('niche', v)} />
            </div>
          </div>
          <div className="@container relative z-30">
            <div className={rowCls}>
              <SelectDropdown label="Experience" required placeholder="Select experience" options={EXPERIENCE_LEVELS} selected={form.experience} onChange={(v) => set('experience', v)} />
              <MultiSelectDropdown label="Services Offered" required placeholder="Select services" options={SERVICES} selected={form.services} onChange={(v) => set('services', v)} />
            </div>
          </div>
          <div className="@container relative z-20">
            <div className={rowCls}>
              <SelectDropdown label="Program Duration" required placeholder="Select duration" options={PROGRAM_DURATIONS} selected={form.programDuration} onChange={(v) => set('programDuration', v)} />
              <SelectDropdown label="Monthly Income Goal" required placeholder="Select goal" options={INCOME_GOALS} selected={form.incomeGoal} onChange={(v) => set('incomeGoal', v)} />
            </div>
          </div>
          <div className="@container relative z-10">
            <div className={rowCls}>
              <SelectDropdown label="Hours per Week" required placeholder="Select hours" options={HOURS_OPTIONS} selected={form.hoursPerWeek} onChange={(v) => set('hoursPerWeek', v)} />
              <div>
                <label htmlFor="pricing-max-clients" className={labelCls}>
                  Max Clients
                  <RequiredMark />
                  <span className="font-normal text-gray-400"> (split across 3 tiers)</span>
                </label>
                <NumberStepper id="pricing-max-clients" value={form.maxClients} min={MAX_CLIENTS_MIN} max={MAX_CLIENTS_MAX} onChange={(v) => set('maxClients', v)} />
              </div>
            </div>
          </div>

          <div className="@container">
            <div className={rowCls}>
              <div>
                <label className="block">
                  <span className={labelCls}>
                    Full Name
                    <RequiredMark />
                  </span>
                  <input type="text" required autoComplete="name" placeholder="e.g. Alex Rivera" value={form.name} onChange={(e) => set('name', e.target.value)} onBlur={() => touch('name')} aria-invalid={touched.name && !nameValid} className={`${inputCls} h-10 ${touched.name && !nameValid ? invalidCls : validCls}`} />
                </label>
                {touched.name && !nameValid && (
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
              {generating ? 'Building your pricing strategy…' : 'Get My Pricing Strategy'}
            </button>
            <p className="mt-1 text-center text-xs text-gray-400">Three tiers, strategy notes and a revenue projection</p>
          </div>
        </form>
      </div>

      <PricingModal
        open={modalOpen}
        strategy={strategy}
        subtitle={subtitle}
        regenerating={pending === 'regenerate'}
        onClose={() => setModalOpen(false)}
        onRegenerate={handleRegenerate}
        onStartOver={handleStartOver}
        onCtaClick={(text, url) => trackCtaClick(form.email, text, url)}
      />
    </div>
  );
}
