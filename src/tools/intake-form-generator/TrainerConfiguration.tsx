import { useState, type FormEvent } from 'react';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { SelectDropdown } from '../../shared/components/SelectDropdown';
import {
  BUSINESS_TYPES,
  CLIENTELE,
  COACHING_FORMATS,
  FORM_LENGTH_LABELS,
  FORM_LENGTH_OPTIONS,
  MAX_MULTI,
  MAX_REQUIREMENTS,
  SPECIALIZATIONS,
  formLengthFromLabel,
  type TrainerConfig,
} from './types';

interface TrainerConfigurationProps {
  config: TrainerConfig;
  onChange: (next: TrainerConfig) => void;
  onSubmit: () => void;
}

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls = 'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';

export function isConfigValid(c: TrainerConfig): boolean {
  return Boolean(c.businessType && c.format && c.length && c.specializations.length && c.clientele.length);
}

/** Screen 1: the trainer's business profile. Nothing here is a lead field. */
export function TrainerConfiguration({ config, onChange, onSubmit }: TrainerConfigurationProps) {
  const [touched, setTouched] = useState({ specializations: false, clientele: false });
  const set = <K extends keyof TrainerConfig>(key: K, value: TrainerConfig[K]) => onChange({ ...config, [key]: value });
  const valid = isConfigValid(config);
  const remaining = MAX_REQUIREMENTS - config.requirements.length;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ specializations: true, clientele: true });
    if (valid) onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2.5" noValidate>
      {/* Dropdowns for every list (all have more than five options), two per row when the
          card is wide enough; rows are z-stacked so an open panel overlays the row below. */}
      <div className="@container relative z-30">
        <div className="grid grid-cols-1 items-start gap-2.5 @sm:grid-cols-2">
          <SelectDropdown
            label="Your Coaching Business"
            required
            placeholder="Select your business type"
            options={BUSINESS_TYPES}
            selected={config.businessType}
            onChange={(v) => set('businessType', v)}
          />
          <div>
            <MultiSelectDropdown
              label="Coaching Specialization"
              required
              placeholder={`Choose up to ${MAX_MULTI}`}
              options={SPECIALIZATIONS}
              selected={config.specializations}
              onChange={(v) => {
                setTouched((t) => ({ ...t, specializations: true }));
                if (v.length <= MAX_MULTI) set('specializations', v);
              }}
            />
            {touched.specializations && config.specializations.length === 0 && (
              <p className="mt-1 text-xs text-red-500" role="alert">
                Select at least one specialization.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="@container relative z-20">
        <div className="grid grid-cols-1 items-start gap-2.5 @sm:grid-cols-2">
          <div>
            <MultiSelectDropdown
              label="Who Do You Coach?"
              required
              placeholder={`Choose up to ${MAX_MULTI} groups`}
              options={CLIENTELE}
              selected={config.clientele}
              onChange={(v) => {
                setTouched((t) => ({ ...t, clientele: true }));
                if (v.length <= MAX_MULTI) set('clientele', v);
              }}
            />
            {touched.clientele && config.clientele.length === 0 && (
              <p className="mt-1 text-xs text-red-500" role="alert">
                Select at least one client group.
              </p>
            )}
          </div>
          <SelectDropdown
            label="Coaching Format"
            required
            placeholder="How do you coach?"
            options={COACHING_FORMATS}
            selected={config.format}
            onChange={(v) => set('format', v)}
          />
        </div>
      </div>

      <div className="relative z-10">
        <SelectDropdown
          label="Form Length"
          required
          placeholder="Select a length"
          options={FORM_LENGTH_OPTIONS}
          selected={FORM_LENGTH_LABELS[config.length]}
          onChange={(v) => set('length', formLengthFromLabel(v) ?? 'standard')}
        />
      </div>

      <label className="block">
        <span className={labelCls}>
          Specific Questions or Requirements <span className="font-normal text-gray-400">(optional)</span>
        </span>
        <textarea
          value={config.requirements}
          maxLength={MAX_REQUIREMENTS}
          onChange={(e) => set('requirements', e.target.value.slice(0, MAX_REQUIREMENTS))}
          placeholder="E.g. Ask about previous injuries, nutrition habits, training schedule, motivation, or equipment access."
          className={`${inputCls} h-[60px] resize-none py-2 leading-snug ${validCls}`}
        />
        {remaining <= 80 && (
          <span className="mt-0.5 block text-right text-[11px] text-gray-400">{remaining} characters left</span>
        )}
      </label>

      <div className="mt-auto">
        <button
          type="submit"
          disabled={!valid}
          className="h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors enabled:hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          Generate My Intake Form
        </button>
        <p className="mt-1 text-center text-xs text-gray-400">Custom questions for your clients + a client-ready PDF</p>
      </div>
    </form>
  );
}
