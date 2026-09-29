import { useState, type FormEvent } from 'react';
import { MultiSelectChips } from '../../shared/components/MultiSelectChips';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { SelectDropdown } from '../../shared/components/SelectDropdown';
import { ToolMark } from '../../shared/components/ToolMark';
import { isValidEmail } from '../../shared/lib/tracking';
import { ACTIVITY_LEVELS, calorieTargetDetails, inToCm, lbToKg, profileIsComplete, targetNote, type ActivityLevel } from './calorieTarget';
import { meaningfulBrand } from './generateRecipes';
import { RecipeModal } from './RecipeModal';
import { generateRecipesWithAi } from './aiRecipes';
import { trackCtaClick, trackLead, trackPdfDownload } from './tracking';
import {
  CLIENT_GOALS,
  COOKING_TIMES,
  DIETS,
  MEAL_TYPES,
  PROTEINS,
  type ClientProfile,
  type CookingTime,
  type RecipeFormState,
  type RecipeInput,
  type RecipeSet,
} from './types';

const SEXES = ['Female', 'Male'] as const;

/** Optional client profile as typed (units kept until submit) plus PDF branding. */
interface ProfileForm {
  sex: 'Female' | 'Male' | null;
  age: string;
  height: string;
  heightUnit: 'cm' | 'in';
  weight: string;
  weightUnit: 'kg' | 'lb';
  activity: ActivityLevel | null;
  coachBrand: string;
  coachLogo: { dataUrl: string; ratio: number } | null;
  logoError: string;
}

const EMPTY_PROFILE: ProfileForm = { sex: null, age: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg', activity: null, coachBrand: '', coachLogo: null, logoError: '' };

const LOGO_MAX_BYTES = 1_500_000;

/** Read a PNG/JPG into a data URL and measure it, entirely in the browser. */
function readLogo(file: File): Promise<{ dataUrl: string; ratio: number }> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg)$/.test(file.type)) return reject(new Error('Use a PNG or JPG file.'));
    if (file.size > LOGO_MAX_BYTES) return reject(new Error('Keep the logo under 1.5 MB.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => resolve({ dataUrl, ratio: img.naturalHeight / Math.max(img.naturalWidth, 1) });
      img.onerror = () => reject(new Error('That image could not be decoded.'));
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function toProfile(p: ProfileForm): ClientProfile {
  const n = (v: string) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : null; };
  const h = n(p.height), w = n(p.weight);
  return {
    sex: p.sex,
    age: n(p.age),
    heightCm: h === null ? null : p.heightUnit === 'in' ? inToCm(h) : Math.round(h),
    weightKg: w === null ? null : p.weightUnit === 'lb' ? lbToKg(w) : w,
    activity: p.activity,
  };
}

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

function toInput(f: RecipeFormState, p: ProfileForm): RecipeInput {
  const profile = toProfile(p);
  return {
    goal: f.goal,
    proteins: f.proteins,
    diets: f.diets,
    mealTypes: f.mealTypes,
    cookingTime: f.cookingTime,
    notes: f.notes,
    profile: profileIsComplete(profile) ? profile : undefined,
    coachBrand: meaningfulBrand(p.coachBrand) || undefined,
    coachLogo: p.coachLogo ?? undefined,
  };
}

function UnitToggle<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <span className="ml-1.5 inline-flex overflow-hidden rounded border border-gray-300 text-[11px] font-medium">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === value}
          onClick={() => onChange(o)}
          className={`px-1.5 py-0.5 ${o === value ? 'bg-fb-orange text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          {o}
        </button>
      ))}
    </span>
  );
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
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const setP = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setProfile((p) => ({ ...p, [key]: value }));
  const clientProfile = toProfile(profile);
  const target = profileIsComplete(clientProfile) ? calorieTargetDetails(clientProfile, form.goal) : null;
  const dailyTarget = target?.target ?? null;
  const floorNote = targetNote(target);
  const brandIgnored = profile.coachBrand.trim().length > 0 && !meaningfulBrand(profile.coachBrand);
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
      const input = toInput(form, profile);
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
      const { set: generated } = await generateRecipesWithAi(toInput(form, profile), next, set.recipes.map((r) => r.name));
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

          {/* Optional: anonymous client stats size the portions; the name brands the PDF. Collapsed to keep the form short. */}
          <details className="rounded-lg border border-gray-200 bg-white px-3 py-2 open:pb-3">
            <summary className="cursor-pointer text-sm font-bold text-gray-900">
              Client profile and PDF branding{' '}
              <span className="font-normal text-gray-400">(optional)</span>
              <span className="mt-0.5 block text-[12px] font-normal text-gray-500">
                Sizes portions to the client and brands the PDF. Used only to generate this pack: not saved,
                not sent to HubSpot, and only the resulting calorie target is shared with the AI.
              </span>
            </summary>
            <div className="mt-2 @container">
              <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
                <SelectDropdown label="Sex" placeholder="Select" options={SEXES} selected={profile.sex} onChange={(v) => setP('sex', v)} />
                <SelectDropdown label="Activity level" placeholder="Select" options={ACTIVITY_LEVELS} selected={profile.activity} onChange={(v) => setP('activity', v)} />
                <label className="block">
                  <span className={labelCls}>Age</span>
                  <input type="number" inputMode="numeric" min={14} max={100} placeholder="e.g. 34" value={profile.age} onChange={(e) => setP('age', e.target.value)} className={`${inputCls} h-10 ${validCls}`} />
                </label>
                <label className="block">
                  <span className={`${labelCls} flex items-center`}>
                    Height
                    <UnitToggle value={profile.heightUnit} options={['cm', 'in'] as const} onChange={(v) => setP('heightUnit', v)} />
                  </span>
                  <input type="number" inputMode="decimal" min={1} placeholder={profile.heightUnit === 'cm' ? 'e.g. 172' : 'e.g. 68'} value={profile.height} onChange={(e) => setP('height', e.target.value)} className={`${inputCls} h-10 ${validCls}`} />
                </label>
                <label className="block">
                  <span className={`${labelCls} flex items-center`}>
                    Weight
                    <UnitToggle value={profile.weightUnit} options={['kg', 'lb'] as const} onChange={(v) => setP('weightUnit', v)} />
                  </span>
                  <input type="number" inputMode="decimal" min={1} placeholder={profile.weightUnit === 'kg' ? 'e.g. 78' : 'e.g. 172'} value={profile.weight} onChange={(e) => setP('weight', e.target.value)} className={`${inputCls} h-10 ${validCls}`} />
                </label>
                <div>
                  <label className="block">
                    <span className={labelCls}>
                      Your business name <span className="font-normal text-gray-400">(on the PDF)</span>
                    </span>
                    <input type="text" placeholder="e.g. Sam Lee Coaching" value={profile.coachBrand} onChange={(e) => setP('coachBrand', e.target.value)} className={`${inputCls} h-10 ${validCls}`} />
                  </label>
                  {brandIgnored && (
                    <p className="mt-1 text-xs text-gray-500">Enter your real business name; placeholder text is left off the PDF.</p>
                  )}
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-fb-accent">
                  {profile.coachLogo ? 'Change logo' : 'Upload your logo (PNG or JPG)'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setP('coachLogo', await readLogo(file));
                        setP('logoError', '');
                      } catch (err) {
                        setP('coachLogo', null);
                        setP('logoError', err instanceof Error ? err.message : 'Could not use that file.');
                      }
                    }}
                  />
                </label>
                {profile.coachLogo && (
                  <>
                    <img src={profile.coachLogo.dataUrl} alt="Your logo preview" className="h-8 max-w-[120px] object-contain" />
                    <button type="button" onClick={() => setP('coachLogo', null)} className="text-xs text-gray-500 hover:underline">
                      Remove
                    </button>
                  </>
                )}
                <span className="text-[11px] text-gray-400">Your logo replaces FitBudd&apos;s in the PDF header.</span>
              </div>
              {profile.logoError && <p className="mt-1 text-xs text-red-500" role="alert">{profile.logoError}</p>}
              {dailyTarget && (
                <p className="mt-2 text-[12px] font-medium text-fb-teal">
                  Portions will be sized for about {dailyTarget} kcal per day{form.goal ? ` (${form.goal.toLowerCase()})` : ''}. Approximate guidance only.
                </p>
              )}
              {floorNote && <p className="mt-1 text-[12px] leading-snug text-gray-600">{floorNote}</p>}
            </div>
          </details>

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
        input={toInput(form, profile)}
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
