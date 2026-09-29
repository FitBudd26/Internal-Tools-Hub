import { useState, type FormEvent } from 'react';
import { MultiSelectChips } from '../../shared/components/MultiSelectChips';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { SelectDropdown } from '../../shared/components/SelectDropdown';
import { ToolMark } from '../../shared/components/ToolMark';
import { isValidEmail } from '../../shared/lib/tracking';
import { ChallengeModal } from './ChallengeModal';
import { generateChallengeWithAi } from './aiChallenge';
import { trackCtaClick, trackLead, trackPdfDownload } from './tracking';
import {
  AUDIENCE_TYPES,
  CHALLENGE_TYPES,
  DURATIONS,
  EQUIPMENT_OPTIONS,
  FITNESS_LEVELS,
  MEASUREMENT_OPTIONS,
  type Challenge,
  type ChallengeFormState,
  type ChallengeInput,
} from './types';

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls =
  'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';

type Field = 'challengeTypes' | 'measurements' | 'name' | 'email';

const EMPTY: ChallengeFormState = {
  challengeTypes: [],
  audience: null,
  fitnessLevel: null,
  duration: null,
  equipment: null,
  measurements: [],
  name: '',
  email: '',
  sendMoreTools: false,
};

/** The form keeps single choices as single values; the engine takes lists. */
export function toChallengeInput(f: ChallengeFormState): ChallengeInput {
  return {
    challengeTypes: f.challengeTypes,
    audienceTypes: f.audience ? [f.audience] : [],
    fitnessLevels: f.fitnessLevel ? [f.fitnessLevel] : [],
    duration: f.duration,
    equipment: f.equipment ? [f.equipment] : [],
    measurements: f.measurements,
  };
}

function RequiredMark() {
  return (
    <span className="text-fb-orange" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export function FitnessChallengeGenerator() {
  const [form, setForm] = useState<ChallengeFormState>(EMPTY);
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    challengeTypes: false,
    measurements: false,
    name: false,
    email: false,
  });
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<'idle' | 'generate' | 'regenerate'>('idle');
  const [variant, setVariant] = useState(0);
  const generating = pending === 'generate';

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));
  const set = <K extends keyof ChallengeFormState>(key: K, value: ChallengeFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const typesValid = form.challengeTypes.length > 0;
  const unitsValid = form.measurements.length > 0;
  const choicesValid = Boolean(form.audience && form.fitnessLevel && form.duration && form.equipment);
  const nameValid = form.name.trim().length > 0;
  const emailValid = isValidEmail(form.email);
  const isValid = typesValid && unitsValid && choicesValid && nameValid && emailValid;

  const typesError = touched.challengeTypes && !typesValid;
  const unitsError = touched.measurements && !unitsValid;
  const nameError = touched.name && !nameValid;
  const emailError = touched.email && !emailValid;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid || pending !== 'idle') return;
    setPending('generate');
    try {
      const input = toChallengeInput(form);
      // Gemini via /api/generate when configured; the built-in engine otherwise.
      const { challenge: generated } = await generateChallengeWithAi(input, 0);
      setChallenge(generated);
      setVariant(0);
      setModalOpen(true);
      // HubSpot lead (email + name + selections); fire-and-forget, never blocks results.
      trackLead(input, form.email, form.name, form.sendMoreTools, generated);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle' || !challenge) return;
    const next = variant + 1;
    setPending('regenerate');
    try {
      const { challenge: generated } = await generateChallengeWithAi(toChallengeInput(form), next, [challenge.challengeName]);
      setVariant(next);
      setChallenge(generated);
    } finally {
      setPending('idle');
    }
  };

  const createAnother = () => {
    setModalOpen(false);
    setChallenge(null);
    setForm((f) => ({ ...EMPTY, name: f.name, email: f.email, sendMoreTools: f.sendMoreTools }));
    setTouched({ challengeTypes: false, measurements: false, name: false, email: false });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <div className="flex min-h-[440px] flex-col">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2.5" noValidate>
          <div>
            <h1 className="flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-bold text-fb-orange">
              <ToolMark size={20} className="shrink-0" />
              <span className="truncate">Fitness Challenge Generator</span>
            </h1>
            <p className="mt-1 text-center text-[13px] text-gray-600">
              Create ready-to-use challenges for clients, groups, or communities in seconds.
            </p>
          </div>

          {/* Dropdowns for anything with more than five options, two per row when
              the card is wide enough; rows are z-stacked so an open panel overlays
              the row below. */}
          <div className="@container relative z-30">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <div>
                <MultiSelectDropdown
                  label="Challenge Type"
                  required
                  placeholder="Select challenge types"
                  options={CHALLENGE_TYPES}
                  selected={form.challengeTypes}
                  onChange={(v) => {
                    touch('challengeTypes');
                    set('challengeTypes', v);
                  }}
                />
                {typesError && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    Select at least one challenge type.
                  </p>
                )}
              </div>
              <SelectDropdown
                label="Audience"
                required
                placeholder="Who is it for?"
                options={AUDIENCE_TYPES}
                selected={form.audience}
                onChange={(v) => set('audience', v)}
              />
            </div>
          </div>

          <div className="@container relative z-20">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <SelectDropdown
                label="Fitness Level"
                required
                placeholder="Select level"
                options={FITNESS_LEVELS}
                selected={form.fitnessLevel}
                onChange={(v) => set('fitnessLevel', v)}
              />
              <SelectDropdown
                label="Duration"
                required
                placeholder="Select length"
                options={DURATIONS}
                selected={form.duration}
                onChange={(v) => set('duration', v)}
              />
            </div>
          </div>

          <div className="relative z-10">
            <SelectDropdown
              label="Equipment"
              required
              placeholder="Select equipment"
              options={EQUIPMENT_OPTIONS}
              selected={form.equipment}
              onChange={(v) => set('equipment', v)}
            />
          </div>

          <div>
            <MultiSelectChips
              label="Measurement Units"
              required
              options={MEASUREMENT_OPTIONS}
              selected={form.measurements}
              onChange={(v) => {
                touch('measurements');
                set('measurements', v);
              }}
            />
            {unitsError && (
              <p className="mt-1 text-xs text-red-500" role="alert">
                Select at least one unit.
              </p>
            )}
          </div>

          <div className="@container">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <div>
                <label className="block">
                  <span className={labelCls}>
                    Name
                    <RequiredMark />
                  </span>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    onBlur={() => touch('name')}
                    aria-invalid={nameError}
                    className={`${inputCls} h-10 ${nameError ? invalidCls : validCls}`}
                  />
                </label>
                {nameError && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    Name is required.
                  </p>
                )}
              </div>
              <div>
                <label className="block">
                  <span className={labelCls}>
                    Email
                    <RequiredMark />
                  </span>
                  <input
                    type="email"
                    required
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    onBlur={() => touch('email')}
                    aria-invalid={emailError}
                    className={`${inputCls} h-10 ${emailError ? invalidCls : validCls}`}
                  />
                </label>
                {emailError && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    Enter a valid email address.
                  </p>
                )}
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
            <input
              type="checkbox"
              checked={form.sendMoreTools}
              onChange={(e) => set('sendMoreTools', e.target.checked)}
              className="h-4 w-4 accent-fb-orange"
            />
            Send me more tools for coaches
          </label>

          <div className="mt-auto">
            <button
              type="submit"
              disabled={!isValid || pending !== 'idle'}
              aria-busy={generating}
              className={`h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors enabled:hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange ${
                generating ? 'cursor-wait opacity-80' : 'disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400'
              }`}
            >
              {generating ? 'Generating…' : 'Create My Challenge'}
            </button>
            <p className="mt-1 text-center text-xs text-gray-400">
              Ready-to-run framework + client-ready PDF
            </p>
          </div>
        </form>
      </div>

      <ChallengeModal
        open={modalOpen}
        challenge={challenge}
        regenerating={pending === 'regenerate'}
        onRegenerate={handleRegenerate}
        onClose={() => setModalOpen(false)}
        onCreateAnother={createAnother}
        onPdfDownloaded={() => {
          if (challenge) trackPdfDownload(form.email, challenge.challengeName);
        }}
        onCtaClick={() => trackCtaClick(form.email)}
      />
    </div>
  );
}
