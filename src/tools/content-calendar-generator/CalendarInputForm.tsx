import { useState, type FormEvent } from 'react';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { SelectDropdown } from '../../shared/components/SelectDropdown';
import { isConfigComplete } from './aiCalendar';
import { scheduleWindow, todayISO } from './dateScheduler';
import {
  AUDIENCES,
  BUSINESS_TYPES,
  DURATIONS,
  FORMAT_OPTIONS,
  FREQUENCIES,
  GOALS,
  LANGUAGES,
  MAX_AUDIENCES,
  MAX_FORMATS,
  MAX_GOALS,
  MAX_INSTRUCTIONS,
  MAX_NICHES,
  MAX_PLATFORMS,
  MAX_SHORT_TEXT,
  NICHES,
  PLATFORMS,
  TONES,
  type CalendarConfig,
} from './types';

interface CalendarInputFormProps {
  config: CalendarConfig;
  onChange: (next: CalendarConfig) => void;
  onSubmit: () => void;
}

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2 border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';

/** Screen 1: the content strategy inputs. Nothing here is a lead field. */
export function CalendarInputForm({ config, onChange, onSubmit }: CalendarInputFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const set = <K extends keyof CalendarConfig>(key: K, value: CalendarConfig[K]) => onChange({ ...config, [key]: value });
  const limited = <K extends 'niches' | 'audiences' | 'platforms' | 'goals' | 'formats'>(key: K, max: number) => (v: CalendarConfig[K]) => {
    if (v.length <= max) set(key, v);
  };
  const valid = isConfigComplete(config);
  const window = scheduleWindow(config);
  const extras = [
    config.frequency !== '5 Posts Per Week' ? config.frequency : '',
    config.tone ?? '',
    config.startDate && config.startDate !== todayISO() ? `from ${config.startDate}` : '',
    config.language !== 'English' ? config.language : '',
  ].filter(Boolean);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (valid) onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2.5" noValidate>
      {/* Two per row when the card is wide enough, one column on phones; rows are z-stacked so an open panel overlays the row below. */}
      <div className="@container relative z-30">
        <div className="grid grid-cols-1 items-start gap-2.5 @sm:grid-cols-2">
          <SelectDropdown label="Your Fitness Business" required placeholder="Select your business" options={BUSINESS_TYPES} selected={config.businessType} onChange={(v) => set('businessType', v)} />
          <MultiSelectDropdown label="Your Fitness Niche" required placeholder={`Choose up to ${MAX_NICHES}`} options={NICHES} selected={config.niches} onChange={limited('niches', MAX_NICHES)} />
        </div>
      </div>
      <div className="@container relative z-20">
        <div className="grid grid-cols-1 items-start gap-2.5 @sm:grid-cols-2">
          <MultiSelectDropdown label="Your Target Audience" required placeholder={`Choose up to ${MAX_AUDIENCES}`} options={AUDIENCES} selected={config.audiences} onChange={limited('audiences', MAX_AUDIENCES)} />
          <MultiSelectDropdown label="Target Platforms" required placeholder={`Choose up to ${MAX_PLATFORMS}`} options={PLATFORMS} selected={config.platforms} onChange={limited('platforms', MAX_PLATFORMS)} />
        </div>
      </div>
      <div className="@container relative z-10">
        <div className="grid grid-cols-1 items-start gap-2.5 @sm:grid-cols-2">
          <MultiSelectDropdown label="Your Content Goals" required placeholder={`Choose up to ${MAX_GOALS}`} options={GOALS} selected={config.goals} onChange={limited('goals', MAX_GOALS)} />
          <SelectDropdown label="Calendar Duration" required placeholder="Select a duration" options={DURATIONS} selected={config.duration} onChange={(v) => set('duration', v ?? '30 Days')} />
        </div>
      </div>

      {/* Compact expandable section: frequency, tone, formats, offer, promotions, start date, language, instructions. */}
      <details className="rounded-lg border border-gray-200 bg-white px-3 py-2 open:pb-3" open={advancedOpen} onToggle={(e) => setAdvancedOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer text-sm font-bold text-gray-900">
          Advanced Preferences <span className="font-normal text-gray-400">(optional{extras.length ? ` · ${extras.join(' · ')}` : ''})</span>
        </summary>
        <div className="mt-2 @container">
          <div className="grid grid-cols-1 items-start gap-2.5 @sm:grid-cols-2">
            <SelectDropdown label="Posts Per Week" placeholder="5 Posts Per Week" options={FREQUENCIES} selected={config.frequency} onChange={(v) => set('frequency', v ?? '5 Posts Per Week')} />
            <SelectDropdown label="Brand Tone" placeholder="Not specified" options={TONES} selected={config.tone} onChange={(v) => set('tone', v)} />
            <MultiSelectDropdown label="Content Formats" placeholder="Any that fit the platform" options={FORMAT_OPTIONS} selected={config.formats} onChange={limited('formats', MAX_FORMATS)} />
            <SelectDropdown label="Language" placeholder="English" options={LANGUAGES} selected={config.language} onChange={(v) => set('language', v ?? 'English')} />
            <label className="block">
              <span className={labelCls}>Main Offer / Service</span>
              <input type="text" value={config.offer} maxLength={MAX_SHORT_TEXT} onChange={(e) => set('offer', e.target.value.slice(0, MAX_SHORT_TEXT))} placeholder="E.g. Online strength coaching, small-group training" className={`${inputCls} h-10`} />
            </label>
            <label className="block">
              <span className={labelCls}>Key Promotions</span>
              <input type="text" value={config.promotions} maxLength={MAX_SHORT_TEXT} onChange={(e) => set('promotions', e.target.value.slice(0, MAX_SHORT_TEXT))} placeholder="E.g. New membership launch, 6-week coaching program" className={`${inputCls} h-10`} />
            </label>
            <label className="block">
              <span className={labelCls}>
                Calendar Start Date <span className="font-normal text-gray-400">(defaults to today)</span>
              </span>
              <input type="date" value={config.startDate} onChange={(e) => set('startDate', e.target.value)} className={`${inputCls} h-10`} aria-describedby="calendar-start-hint" />
            </label>
            <p id="calendar-start-hint" className="self-end pb-2 text-[12px] leading-snug text-gray-500">
              {window.dates.length} posts planned from {window.startDate} to {window.endDate}.
            </p>
          </div>
          <label className="mt-2.5 block">
            <span className={labelCls}>Additional Instructions</span>
            <textarea
              value={config.instructions}
              maxLength={MAX_INSTRUCTIONS}
              onChange={(e) => set('instructions', e.target.value.slice(0, MAX_INSTRUCTIONS))}
              placeholder="E.g. Focus on beginner-friendly content, avoid transformation posts"
              className={`${inputCls} h-[60px] resize-none py-2 leading-snug`}
            />
          </label>
          <p className="mt-1.5 text-[11px] leading-snug text-gray-400">Offers and promotions are only used when you provide them; the calendar never invents discounts, testimonials or results.</p>
        </div>
      </details>

      <div className="mt-auto">
        <button
          type="submit"
          disabled={!valid}
          className="h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors enabled:hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          Generate My Content Calendar
        </button>
        <p className="mt-1 text-center text-xs text-gray-400">Ready-to-use hooks, captions and creative directions + PDF and CSV exports</p>
      </div>
    </form>
  );
}
