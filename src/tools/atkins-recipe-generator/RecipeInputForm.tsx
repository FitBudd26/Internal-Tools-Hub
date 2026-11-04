import { useState, type FormEvent } from 'react';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { SelectDropdown } from '../../shared/components/SelectDropdown';
import { isConfigComplete } from './aiRecipes';
import { profileFor, resolveProteins } from './atkinsRules';
import {
  ATKINS_PHASES,
  ATKINS_PLANS,
  CARB_RANGES,
  COOKING_TIMES,
  CUISINES,
  MAX_FREE_TEXT,
  MAX_PROTEINS,
  MAX_RESTRICTIONS,
  MEAL_TYPES,
  PROTEINS,
  RESTRICTIONS,
  type Protein,
  type RecipeConfig,
  type Restriction,
} from './types';

interface RecipeInputFormProps {
  config: RecipeConfig;
  onChange: (next: RecipeConfig) => void;
  onSubmit: () => void;
}

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2 border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';

/** "No Preference" / "No Restrictions" are exclusive: picking one clears the rest, picking anything else drops it. */
function exclusive<T extends string>(next: T[], previous: T[], none: T): T[] {
  const added = next.find((v) => !previous.includes(v));
  if (added === none) return [none];
  return next.filter((v) => v !== none);
}

/** Screen 1: recipe preferences. Nothing here is a lead field. */
export function RecipeInputForm({ config, onChange, onSubmit }: RecipeInputFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const set = <K extends keyof RecipeConfig>(key: K, value: RecipeConfig[K]) => onChange({ ...config, [key]: value });
  const valid = isConfigComplete(config);
  const profile = profileFor(config);
  const { excluded } = resolveProteins(config.proteins, config.restrictions);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (valid) onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2.5" noValidate>
      {/* Two per row when the card is wide enough, one column on phones; rows are z-stacked so an open panel overlays the row below. */}
      <div className="@container relative z-30">
        <div className="grid grid-cols-1 items-start gap-2.5 @sm:grid-cols-2">
          <SelectDropdown
            label="Atkins Plan"
            required
            placeholder="Select a plan"
            options={ATKINS_PLANS}
            selected={config.plan}
            onChange={(v) => set('plan', v ?? 'Atkins 20')}
          />
          {config.plan === 'Atkins 20' ? (
            <SelectDropdown
              label="Atkins Phase"
              required
              placeholder="Select a phase"
              options={ATKINS_PHASES}
              selected={config.phase}
              onChange={(v) => set('phase', v ?? 'Phase 1 — Induction')}
            />
          ) : (
            <div>
              <span className={labelCls}>Plan framework</span>
              <p className="flex h-10 items-center rounded-lg border border-fb-tint-border bg-fb-tint px-3 text-[12px] leading-tight text-gray-700" aria-live="polite">
                {config.plan === 'Atkins 40' ? 'About 40 g net carbs per day, wider food range' : `Your target: ${config.carbRange} (set below)`}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="@container relative z-20">
        <div className="grid grid-cols-1 items-start gap-2.5 @sm:grid-cols-2">
          <SelectDropdown label="Meal Type" required placeholder="Select a meal" options={MEAL_TYPES} selected={config.mealType} onChange={(v) => set('mealType', v)} />
          <MultiSelectDropdown
            label="Preferred Protein"
            placeholder={`Any protein · up to ${MAX_PROTEINS}`}
            options={PROTEINS}
            selected={config.proteins}
            onChange={(v) => {
              const next = exclusive<Protein>(v, config.proteins, 'No Preference');
              if (next.length <= MAX_PROTEINS) set('proteins', next);
            }}
          />
        </div>
      </div>

      <div className="@container relative z-10">
        <div className="grid grid-cols-1 items-start gap-2.5 @sm:grid-cols-2">
          <SelectDropdown label="Cuisine" required placeholder="Select a cuisine" options={CUISINES} selected={config.cuisine} onChange={(v) => set('cuisine', v)} />
          <SelectDropdown label="Cooking Time" required placeholder="Select a time" options={COOKING_TIMES} selected={config.cookingTime} onChange={(v) => set('cookingTime', v)} />
        </div>
      </div>

      {excluded.length > 0 && (
        <p className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[12px] leading-snug text-orange-900" role="status">
          {excluded.map((e) => `${e.protein} conflicts with ${e.reason}`).join('; ')}: {excluded.length === 1 ? 'it' : 'they'} will be left out and the restriction kept.
        </p>
      )}

      {/* Compact expandable section: restrictions, the Flexible carb range, avoid / available lists. */}
      <details
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 open:pb-3"
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-bold text-gray-900">
          Additional Preferences{' '}
          <span className="font-normal text-gray-400">
            (optional
            {config.restrictions.length && !config.restrictions.includes('No Restrictions') ? ` · ${config.restrictions.join(', ')}` : ''}
            {config.plan === 'Flexible Low-Carb' ? ` · ${config.carbRange}` : ''})
          </span>
        </summary>
        <div className="mt-2 @container">
          <div className="grid grid-cols-1 items-start gap-2.5 @sm:grid-cols-2">
            <MultiSelectDropdown
              label="Dietary Restrictions"
              placeholder="No restrictions"
              options={RESTRICTIONS}
              selected={config.restrictions}
              onChange={(v) => {
                const next = exclusive<Restriction>(v, config.restrictions, 'No Restrictions');
                if (next.length <= MAX_RESTRICTIONS) set('restrictions', next);
              }}
            />
            {config.plan === 'Flexible Low-Carb' ? (
              <SelectDropdown label="Daily net-carb range" required placeholder="Select a range" options={CARB_RANGES} selected={config.carbRange} onChange={(v) => set('carbRange', v ?? config.carbRange)} />
            ) : (
              <div>
                <span className={labelCls}>Plan summary</span>
                <p className="text-[12px] leading-snug text-gray-600">{profile.summary}</p>
              </div>
            )}
            <label className="block">
              <span className={labelCls}>Ingredients to Avoid</span>
              <input
                type="text"
                value={config.avoid}
                maxLength={MAX_FREE_TEXT}
                onChange={(e) => set('avoid', e.target.value.slice(0, MAX_FREE_TEXT))}
                placeholder="E.g. mushrooms, shellfish, peanuts"
                className={`${inputCls} h-10`}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Ingredients Available</span>
              <input
                type="text"
                value={config.available}
                maxLength={MAX_FREE_TEXT}
                onChange={(e) => set('available', e.target.value.slice(0, MAX_FREE_TEXT))}
                placeholder="E.g. chicken, spinach, cheese"
                className={`${inputCls} h-10`}
              />
            </label>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-gray-400">Allergies and avoided ingredients are strict exclusions. Nutrition is given per standard serving.</p>
        </div>
      </details>

      <div className="mt-auto">
        <button
          type="submit"
          disabled={!valid}
          className="h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors enabled:hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          Generate Recipes
        </button>
        <p className="mt-1 text-center text-xs text-gray-400">Three personalized low-carb recipes + a client-ready PDF</p>
      </div>
    </form>
  );
}
