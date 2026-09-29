import { useState, type FormEvent } from 'react';
import { MultiSelectChips } from '../../shared/components/MultiSelectChips';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { SelectDropdown } from '../../shared/components/SelectDropdown';
import { ToolMark } from '../../shared/components/ToolMark';
import { isValidEmail } from '../../shared/lib/tracking';
import { RecipeModal } from './RecipeModal';
import { generateRecipesWithAi } from './aiRecipes';
import { trackCtaClick, trackLead, trackPdfDownload } from './tracking';
import {
  CLIENT_GOALS,
  COOKING_TIMES,
  DIETS,
  MEAL_TYPES,
  PROTEINS,
  type CookingTime,
  type RecipeFormState,
  type RecipeInput,
  type RecipeSet,
} from './types';

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls = 'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';

type Field = 'proteins' | 'mealTypes' | 'name' | 'email';
type Pending = 'idle' | 'generate' | 'regenerate';

const EMPTY: RecipeFormState = {
  goal: null,
  proteins: [],
  diets: [],
  mealTypes: [],
  cookingTime: null,
  notes: '',
  name: '',
  email: '',
};

function toInput(f: RecipeFormState): RecipeInput {
  return { goal: f.goal, proteins: f.proteins, diets: f.diets, mealTypes: f.mealTypes, cookingTime: f.cookingTime, notes: f.notes };
}

function RequiredMark() {
  return (
    <span className="text-fb-orange" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export function RecipeGenerator() {
  const [form, setForm] = useState<RecipeFormState>(EMPTY);
  const [touched, setTouched] = useState<Record<Field, boolean>>({ proteins: false, mealTypes: false, name: false, email: false });
  const [set, setSet] = useState<RecipeSet | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<Pending>('idle');
  const [variant, setVariant] = useState(0);

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));
  const setField = <K extends keyof RecipeFormState>(key: K, value: RecipeFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const proteinsValid = form.proteins.length > 0;
  const mealsValid = form.mealTypes.length > 0;
  const nameValid = form.name.trim().length > 0;
  const emailValid = isValidEmail(form.email);
  const isValid = Boolean(form.goal && form.cookingTime) && proteinsValid && mealsValid && nameValid && emailValid;
  const generating = pending === 'generate';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid || pending !== 'idle') return;
    setPending('generate');
    try {
      const input = toInput(form);
      // Gemini via /api/generate when configured; the built-in library otherwise.
      const { set: generated } = await generateRecipesWithAi(input, 0);
      setSet(generated);
      setVariant(0);
      setModalOpen(true);
      // HubSpot lead (name + email + selections); fire-and-forget, never blocks results.
      trackLead(input, form.email, form.name, generated.recipes);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle' || !set) return;
    const next = variant + 1;
    setPending('regenerate');
    try {
      const { set: generated } = await generateRecipesWithAi(toInput(form), next, set.recipes.map((r) => r.name));
      setVariant(next);
      setSet(generated);
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
              <ToolMark size={20} className="shrink-0" />
              <span className="truncate">Fitness Recipe Generator</span>
            </h1>
            <p className="mt-1 text-center text-[13px] text-gray-600">
              Fuel your clients’ progress with tailored, goal-aligned recipes, created in seconds.
            </p>
          </div>

          <div className="@container relative z-30">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <SelectDropdown
                label="Client Goal"
                required
                placeholder="Select goal"
                options={CLIENT_GOALS}
                selected={form.goal}
                onChange={(v) => setField('goal', v)}
              />
              <div>
                <MultiSelectDropdown
                  label="Meal Type"
                  required
                  placeholder="Select meal types"
                  options={MEAL_TYPES}
                  selected={form.mealTypes}
                  onChange={(v) => {
                    touch('mealTypes');
                    setField('mealTypes', v);
                  }}
                />
                {touched.mealTypes && !mealsValid && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    Select at least one meal type.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="@container relative z-20">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <div>
                <MultiSelectDropdown
                  label="Preferred Protein"
                  required
                  placeholder="Select proteins"
                  options={PROTEINS}
                  selected={form.proteins}
                  onChange={(v) => {
                    touch('proteins');
                    setField('proteins', v);
                  }}
                />
                {touched.proteins && !proteinsValid && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    Select at least one protein.
                  </p>
                )}
              </div>
              <MultiSelectDropdown
                label="Dietary Preference"
                labelHint="(optional)"
                placeholder="No restrictions"
                options={DIETS}
                selected={form.diets}
                onChange={(v) => setField('diets', v)}
              />
            </div>
          </div>

          <MultiSelectChips
            label="Cooking Time"
            required
            options={COOKING_TIMES}
            selected={form.cookingTime ? [form.cookingTime] : []}
            onChange={(next) => {
              // Single choice: the newly clicked chip wins; clicking the active one clears it.
              const added = next.find((v) => v !== form.cookingTime) as CookingTime | undefined;
              setField('cookingTime', added ?? (next.length ? next[0] : null));
            }}
          />

          <label className="block">
            <span className={labelCls}>
              Notes / Preferences <span className="font-normal text-gray-400">(optional)</span>
            </span>
            <textarea
              rows={2}
              placeholder="Add client preferences, disliked foods, or nutrition notes"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              className={`${inputCls} h-[60px] resize-none py-2 ${validCls}`}
            />
          </label>

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
                    onChange={(e) => setField('name', e.target.value)}
                    onBlur={() => touch('name')}
                    aria-invalid={touched.name && !nameValid}
                    className={`${inputCls} h-10 ${touched.name && !nameValid ? invalidCls : validCls}`}
                  />
                </label>
                {touched.name && !nameValid && (
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
                    onChange={(e) => setField('email', e.target.value)}
                    onBlur={() => touch('email')}
                    aria-invalid={touched.email && !emailValid}
                    className={`${inputCls} h-10 ${touched.email && !emailValid ? invalidCls : validCls}`}
                  />
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
              {generating ? 'Generating…' : 'Generate Recipes'}
            </button>
            <p className="mt-1 text-center text-xs text-gray-400">
              Coach-ready recipes with approximate nutrition and a client PDF
            </p>
          </div>
        </form>
      </div>

      <RecipeModal
        open={modalOpen}
        input={toInput(form)}
        set={set}
        regenerating={pending === 'regenerate'}
        onClose={() => setModalOpen(false)}
        onRegenerate={handleRegenerate}
        onPdfDownloaded={() => {
          if (set) trackPdfDownload(form.email, set.recipes);
        }}
        onCtaClick={() => trackCtaClick(form.email)}
      />
    </div>
  );
}
