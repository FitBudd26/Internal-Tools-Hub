import { useState, type FormEvent } from 'react';
import { InstagramMark } from '../../shared/components/InstagramMark';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { SelectDropdown } from '../../shared/components/SelectDropdown';
import { isValidEmail } from '../../shared/lib/tracking';
import { BioResultsModal } from './BioResultsModal';
import { generateBiosWithAi } from './aiBios';
import { trackCtaClick, trackGeneration } from './tracking';
import {
  BUSINESS_TYPES,
  SPECIALIZATIONS,
  TARGET_AUDIENCES,
  TONE_OPTIONS,
  type BioFormState,
  type BioResult,
} from './types';

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls = 'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';

type Field = 'name' | 'email';
type Pending = 'idle' | 'generate' | 'regenerate';

const EMPTY: BioFormState = {
  name: '',
  email: '',
  businessType: null,
  yearsExperience: '',
  location: '',
  specializations: [],
  targetAudience: null,
  uniqueSellingPoint: '',
  tone: 'Auto (based on your input)',
};

function RequiredMark() {
  return (
    <span className="text-fb-orange" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export function IgBioGenerator() {
  const [form, setForm] = useState<BioFormState>(EMPTY);
  const [touched, setTouched] = useState<Record<Field, boolean>>({ name: false, email: false });
  const [result, setResult] = useState<BioResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<Pending>('idle');
  const [variant, setVariant] = useState(0);
  const [generationCount, setGenerationCount] = useState(0);

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));
  const set = <K extends keyof BioFormState>(key: K, value: BioFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const nameValid = form.name.trim().length > 0;
  const emailValid = isValidEmail(form.email);
  const isValid = Boolean(form.businessType && form.targetAudience) && nameValid && emailValid;
  const generating = pending === 'generate';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid || pending !== 'idle') return;
    setPending('generate');
    try {
      // Gemini via /api/generate when configured; the templated engine otherwise.
      const { result: generated } = await generateBiosWithAi(form, 0);
      const count = generationCount + 1;
      setGenerationCount(count);
      setResult(generated);
      setVariant(0);
      setModalOpen(true);
      // HubSpot lead; fire-and-forget, never blocks results.
      trackGeneration(form, generated, count);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle' || !result) return;
    const next = variant + 1;
    setPending('regenerate');
    try {
      const { result: generated } = await generateBiosWithAi(form, next, result);
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
              <span className="truncate">Instagram Bio Generator</span>
            </h1>
            <p className="mt-1 text-center text-[13px] text-gray-600">
              Four ready-to-paste Instagram bios for fitness professionals, in seconds.
            </p>
          </div>

          <div className="@container relative z-30">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <SelectDropdown label="Business Type" required placeholder="Select type" options={BUSINESS_TYPES} selected={form.businessType} onChange={(v) => set('businessType', v)} />
              <SelectDropdown label="Target Audience" required placeholder="Who do you train?" options={TARGET_AUDIENCES} selected={form.targetAudience} onChange={(v) => set('targetAudience', v)} />
            </div>
          </div>

          <div className="@container relative z-20">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <MultiSelectDropdown label="Specializations" labelHint="(optional)" placeholder="Select specializations" options={SPECIALIZATIONS} selected={form.specializations} onChange={(v) => set('specializations', v)} />
              <SelectDropdown label="Tone" labelHint="(optional)" placeholder="Auto" options={TONE_OPTIONS} selected={form.tone} onChange={(v) => set('tone', v ?? 'Auto (based on your input)')} />
            </div>
          </div>

          <div className="@container">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>
                  Years of Experience <span className="font-normal text-gray-400">(optional)</span>
                </span>
                <input type="text" placeholder="e.g. 5+" value={form.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} className={`${inputCls} h-10 ${validCls}`} />
              </label>
              <label className="block">
                <span className={labelCls}>
                  Location <span className="font-normal text-gray-400">(optional)</span>
                </span>
                <input type="text" placeholder="City or Online" value={form.location} onChange={(e) => set('location', e.target.value)} className={`${inputCls} h-10 ${validCls}`} />
              </label>
            </div>
          </div>

          <label className="block">
            <span className={labelCls}>
              Unique Selling Point <span className="font-normal text-gray-400">(optional)</span>
            </span>
            <textarea
              rows={2}
              placeholder="What makes you different? Certifications, years, method, results"
              value={form.uniqueSellingPoint}
              onChange={(e) => set('uniqueSellingPoint', e.target.value)}
              className={`${inputCls} h-[60px] resize-none py-2 ${validCls}`}
            />
          </label>

          <div className="@container">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <div>
                <label className="block">
                  <span className={labelCls}>
                    Name / Business Name
                    <RequiredMark />
                  </span>
                  <input type="text" required autoComplete="name" placeholder="Your name or brand" value={form.name} onChange={(e) => set('name', e.target.value)} onBlur={() => touch('name')} aria-invalid={touched.name && !nameValid} className={`${inputCls} h-10 ${touched.name && !nameValid ? invalidCls : validCls}`} />
                </label>
                {touched.name && !nameValid && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    Name or business name is required.
                  </p>
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
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    Enter a valid email address.
                  </p>
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
              {generating ? 'Generating…' : 'Generate Bios'}
            </button>
            <p className="mt-1 text-center text-xs text-gray-400">Within Instagram's 150-character limit</p>
          </div>
        </form>
      </div>

      <BioResultsModal
        open={modalOpen}
        result={result}
        regenerating={pending === 'regenerate'}
        onClose={() => setModalOpen(false)}
        onRegenerate={handleRegenerate}
        onCtaClick={(text, url) => trackCtaClick(form.email, text, url)}
      />
    </div>
  );
}
