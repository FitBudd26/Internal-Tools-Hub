import { useState, type FormEvent } from 'react';
import { DumbbellMark } from '../../shared/components/DumbbellMark';
import { SelectDropdown } from '../../shared/components/SelectDropdown';
import { isValidEmail } from '../../shared/lib/tracking';
import { WorkoutModal } from './WorkoutModal';
import { generateWorkoutWithAi } from './aiWorkout';
import { trackCtaClick, trackLead, trackPdfDownload } from './tracking';
import {
  AGE_MAX,
  AGE_MIN,
  CHAT_EXAMPLES,
  CHAT_MAX_LEN,
  CHAT_MIN_LEN,
  DURATIONS,
  GOALS,
  INTENSITIES,
  LOCATIONS,
  NOTES_MAX_LEN,
  PROFESSIONS,
  SAMPLE_FORM,
  TARGET_AREAS,
  WORKOUT_TYPES,
  toGuidedInput,
  type GuidedFormState,
  type InputMode,
  type Profession,
  type WorkoutPlan,
  type WorkoutRequest,
} from './types';

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls = 'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';
const rowCls = 'grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2';

type Field = 'clientName' | 'age' | 'chat' | 'email';
type Pending = 'idle' | 'generate' | 'regenerate';

const EMPTY: GuidedFormState = { clientName: '', goal: null, location: null, intensity: null, workoutType: null, duration: null, age: '', targetArea: null, notes: '' };

function RequiredMark() {
  return (
    <span className="text-fb-orange" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

function ModeTabs({ mode, onChange }: { mode: InputMode; onChange: (m: InputMode) => void }) {
  const tab = (value: InputMode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => onChange(value)}
      className={`flex h-8 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-teal ${
        mode === value ? 'bg-fb-teal text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="Input mode" className="grid grid-cols-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
      {tab('guided', 'Guided Mode')}
      {tab('chat', 'Chat Mode')}
    </div>
  );
}

export function WorkoutGenerator() {
  const [mode, setMode] = useState<InputMode>('guided');
  const [form, setForm] = useState<GuidedFormState>(EMPTY);
  const [chat, setChat] = useState('');
  const [email, setEmail] = useState('');
  const [profession, setProfession] = useState<Profession | null>(null);
  const [consent, setConsent] = useState(true);
  const [touched, setTouched] = useState<Record<Field, boolean>>({ clientName: false, age: false, chat: false, email: false });
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [request, setRequest] = useState<WorkoutRequest | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<Pending>('idle');
  const [variant, setVariant] = useState(0);

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));
  const set = <K extends keyof GuidedFormState>(key: K, value: GuidedFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const guided = toGuidedInput(form);
  const nameValid = form.clientName.trim().length > 0;
  const ageNumber = Number(form.age);
  const ageValid = /^\d{1,2}$/.test(form.age.trim()) && ageNumber >= AGE_MIN && ageNumber <= AGE_MAX;
  const chatValid = chat.trim().length >= CHAT_MIN_LEN;
  const emailValid = isValidEmail(email);
  const current: WorkoutRequest | null = mode === 'guided' ? (guided ? { mode: 'guided', input: guided } : null) : chatValid ? { mode: 'chat', prompt: chat.trim() } : null;
  const isValid = Boolean(current) && emailValid && Boolean(profession) && consent;
  const generating = pending === 'generate';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!current || !isValid || !profession || pending !== 'idle') return;
    setPending('generate');
    try {
      // Gemini via /api/generate when configured; the built-in engine otherwise.
      const { plan: generated } = await generateWorkoutWithAi(current, 0);
      setPlan(generated);
      setRequest(current);
      setVariant(0);
      setModalOpen(true);
      // HubSpot lead; fire-and-forget, never blocks the plan.
      trackLead(email, profession, current);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle' || !plan || !request) return;
    const next = variant + 1;
    setPending('regenerate');
    try {
      const { plan: generated } = await generateWorkoutWithAi(request, next, plan.mainWorkout.map((x) => x.exercise));
      setVariant(next);
      setPlan(generated);
    } finally {
      setPending('idle');
    }
  };

  // A new client: clear the session inputs, keep the coach's own details.
  const handleBuildAnother = () => {
    setModalOpen(false);
    setForm(EMPTY);
    setChat('');
    setTouched({ clientName: false, age: false, chat: false, email: false });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <div className="flex min-h-[440px] flex-col">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2.5" noValidate>
          <div>
            <h1 className="flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-bold text-fb-orange">
              <DumbbellMark size={20} className="shrink-0" />
              <span className="truncate">AI Workout Generator</span>
            </h1>
            <p className="mt-1 text-center text-[13px] text-gray-600">Client-ready workout plans for coaches, in seconds.</p>
          </div>

          <ModeTabs mode={mode} onChange={setMode} />

          {mode === 'guided' ? (
            <>
              <div className="@container">
                <div className={rowCls}>
                  <div>
                    <label className="block">
                      <span className={labelCls}>
                        Client Name
                        <RequiredMark />
                      </span>
                      <input type="text" required placeholder="Enter client name" maxLength={60} value={form.clientName} onChange={(e) => set('clientName', e.target.value)} onBlur={() => touch('clientName')} aria-invalid={touched.clientName && !nameValid} className={`${inputCls} h-10 ${touched.clientName && !nameValid ? invalidCls : validCls}`} />
                    </label>
                    {touched.clientName && !nameValid && (
                      <p className="mt-1 text-xs text-red-500" role="alert">Client name is required.</p>
                    )}
                  </div>
                  <div>
                    <label className="block">
                      <span className={labelCls}>
                        Age
                        <RequiredMark />
                      </span>
                      <input type="text" required inputMode="numeric" placeholder="Client age" maxLength={2} value={form.age} onChange={(e) => set('age', e.target.value.replace(/\D/g, ''))} onBlur={() => touch('age')} aria-invalid={touched.age && !ageValid} className={`${inputCls} h-10 ${touched.age && !ageValid ? invalidCls : validCls}`} />
                    </label>
                    {touched.age && !ageValid && (
                      <p className="mt-1 text-xs text-red-500" role="alert">Enter an age from {AGE_MIN} to {AGE_MAX}.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="@container relative z-40">
                <div className={rowCls}>
                  <SelectDropdown label="Goal" required placeholder="Select goal" options={GOALS} selected={form.goal} onChange={(v) => set('goal', v)} />
                  <SelectDropdown label="Location" required placeholder="Select location" options={LOCATIONS} selected={form.location} onChange={(v) => set('location', v)} />
                </div>
              </div>
              <div className="@container relative z-30">
                <div className={rowCls}>
                  <SelectDropdown label="Intensity" required placeholder="Select intensity" options={INTENSITIES} selected={form.intensity} onChange={(v) => set('intensity', v)} />
                  <SelectDropdown label="Type" required placeholder="Select type" options={WORKOUT_TYPES} selected={form.workoutType} onChange={(v) => set('workoutType', v)} />
                </div>
              </div>
              <div className="@container relative z-20">
                <div className={rowCls}>
                  <SelectDropdown label="Duration" required placeholder="Select duration" options={DURATIONS} selected={form.duration} onChange={(v) => set('duration', v)} />
                  <SelectDropdown label="Target Area" required placeholder="Select target area" options={TARGET_AREAS} selected={form.targetArea} onChange={(v) => set('targetArea', v)} />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <label htmlFor="workout-notes" className="text-sm font-bold text-gray-900">
                    Injuries / Limitations / Notes <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <button type="button" onClick={() => { setForm(SAMPLE_FORM); setTouched((t) => ({ ...t, clientName: false, age: false })); }} className="shrink-0 rounded text-[11px] font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange">
                    Use sample
                  </button>
                </div>
                <textarea id="workout-notes" rows={2} maxLength={NOTES_MAX_LEN} placeholder="e.g. mild knee discomfort on deep squats; only has dumbbells; prefers no jumping" value={form.notes} onChange={(e) => set('notes', e.target.value)} className={`${inputCls} h-[60px] resize-none py-2 ${validCls}`} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="workout-chat" className="block text-sm font-bold text-gray-900">
                  Describe your client
                  <RequiredMark />
                </label>
                <p className="mb-1 text-[12px] text-gray-500">Goal, age, equipment, duration, and anything to work around.</p>
                <textarea id="workout-chat" rows={4} maxLength={CHAT_MAX_LEN} placeholder="e.g. 45-min fat loss for a 35-year-old at home with knee pain and dumbbells." value={chat} onChange={(e) => setChat(e.target.value)} onBlur={() => touch('chat')} aria-invalid={touched.chat && !chatValid} className={`${inputCls} h-[96px] resize-none py-2 ${touched.chat && !chatValid ? invalidCls : validCls}`} />
                {touched.chat && !chatValid && (
                  <p className="mt-1 text-xs text-red-500" role="alert">Describe the client in at least a sentence.</p>
                )}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Examples</p>
                <div className="flex flex-col gap-1.5">
                  {CHAT_EXAMPLES.map((example) => (
                    <button key={example} type="button" onClick={() => { setChat(example); setTouched((t) => ({ ...t, chat: false })); }} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-[12px] leading-snug text-gray-600 transition-colors hover:border-fb-teal/50 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-teal">
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="@container relative z-10">
            <div className={rowCls}>
              <div>
                <label className="block">
                  <span className={labelCls}>
                    Email
                    <RequiredMark />
                  </span>
                  <input type="email" required inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => touch('email')} aria-invalid={touched.email && !emailValid} className={`${inputCls} h-10 ${touched.email && !emailValid ? invalidCls : validCls}`} />
                </label>
                {touched.email && !emailValid && (
                  <p className="mt-1 text-xs text-red-500" role="alert">Enter a valid email address.</p>
                )}
              </div>
              <SelectDropdown label="Are you a fitness professional?" required placeholder="Select an option" options={PROFESSIONS} selected={profession} onChange={setProfession} />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-gray-500">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-fb-teal" />
            <span>I agree to receive communications from FitBudd and allow FitBudd to store my details. You can unsubscribe anytime.</span>
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
              {generating ? 'Designing your session…' : 'Generate Workout'}
            </button>
            <p className="mt-1 text-center text-xs text-gray-400">Full plan on screen, plus a client-ready PDF</p>
          </div>
        </form>
      </div>

      <WorkoutModal
        open={modalOpen}
        plan={plan}
        regenerating={pending === 'regenerate'}
        onClose={() => setModalOpen(false)}
        onRegenerate={handleRegenerate}
        onBuildAnother={handleBuildAnother}
        onPdfDownloaded={() => trackPdfDownload(email)}
        onCtaClick={() => trackCtaClick(email)}
      />
    </div>
  );
}
