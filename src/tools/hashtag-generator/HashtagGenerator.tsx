import { useState, type FormEvent } from 'react';
import {
  PLATFORM_OPTIONS,
  POST_TYPE_OPTIONS,
  TONE_OPTIONS,
  type HashtagFormState,
  type PlatformHashtags,
} from './types';
import { generateWithAi } from './aiHashtags';
import { trackGeneration } from './tracking';
import { HashMark } from '../../shared/components/HashMark';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { ResultsModal } from './ResultsModal';
import { SelectDropdown } from '../../shared/components/SelectDropdown';

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls =
  'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Pending = 'idle' | 'generate' | 'regenerate';
type Field = 'caption' | 'platforms' | 'name' | 'email';

function RequiredMark() {
  return (
    <span className="text-fb-orange" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export function HashtagGenerator() {
  const [form, setForm] = useState<HashtagFormState>({
    caption: '',
    topic: '',
    postType: null,
    platforms: [],
    tones: [],
    name: '',
    email: '',
  });
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    caption: false,
    platforms: false,
    name: false,
    email: false,
  });
  const [results, setResults] = useState<PlatformHashtags[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [variant, setVariant] = useState(0);
  const [pending, setPending] = useState<Pending>('idle');

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));

  const captionValid = form.caption.trim().length > 0;
  const platformsValid = form.platforms.length > 0;
  const nameValid = form.name.trim().length > 0;
  const emailValid = EMAIL_RE.test(form.email.trim());
  const isValid = captionValid && platformsValid && nameValid && emailValid;

  const captionError = touched.caption && !captionValid;
  const platformsError = touched.platforms && !platformsValid;
  const nameError = touched.name && !nameValid;
  const emailError = touched.email && !emailValid;
  const generating = pending === 'generate';

  const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid || pending !== 'idle') return;
    setPending('generate');
    try {
      // Gemini via /api/generate when configured; the local engine otherwise.
      const { groups } = await generateWithAi(form, 0);
      setResults(groups);
      setVariant(0);
      setModalOpen(true);
      // HubSpot lead capture (name + email); fire-and-forget, never blocks results.
      trackGeneration(form);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle') return;
    const next = variant + 1;
    setPending('regenerate');
    try {
      const shown = results.flatMap((g) => g.tags);
      const { groups } = await generateWithAi(form, next, shown);
      setVariant(next);
      setResults(groups);
    } finally {
      setPending('idle');
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <div className="flex min-h-[440px] flex-col">
        <form
          onSubmit={handleGenerate}
          className="flex flex-1 flex-col gap-2.5"
          noValidate
        >
          <div>
            <h1 className="flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-bold text-fb-orange">
              <HashMark size={20} className="shrink-0" />
              <span className="truncate">Hashtag Generator</span>
            </h1>
            <p className="mt-1 text-center text-[13px] text-gray-600">
              Create platform-ready hashtags for your next post in seconds.
            </p>
          </div>

          <div>
            <label className="block">
              <span className={labelCls}>
                Caption
                <RequiredMark />
              </span>
              <textarea
                required
                rows={2}
                placeholder="Paste your post caption here"
                value={form.caption}
                onChange={(e) =>
                  setForm((f) => ({ ...f, caption: e.target.value }))
                }
                onBlur={() => touch('caption')}
                aria-invalid={captionError}
                className={`${inputCls} h-[60px] resize-none py-2 ${captionError ? invalidCls : validCls}`}
              />
            </label>
            {captionError && (
              <p className="mt-1 text-xs text-red-500" role="alert">
                Caption is required before generating hashtags.
              </p>
            )}
          </div>

          {/* Two fields per row when the card is wide enough (container query);
              rows are z-stacked so an open dropdown overlays the row below. */}
          <div className="@container relative z-30">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>
                  Topic/Niche{' '}
                  <span className="font-normal text-gray-400">(recommended)</span>
                </span>
                <input
                  type="text"
                  placeholder="e.g. fitness, travel, food, tech"
                  value={form.topic}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, topic: e.target.value }))
                  }
                  className={`${inputCls} h-10 ${validCls}`}
                />
              </label>
              <SelectDropdown
                label="Post Type/Context"
                labelHint="(optional)"
                placeholder="Select post type"
                options={POST_TYPE_OPTIONS}
                selected={form.postType}
                onChange={(postType) => setForm((f) => ({ ...f, postType }))}
              />
            </div>
          </div>

          <div className="@container relative z-20">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2">
              <div>
                <MultiSelectDropdown
                  label="Target Platform(s)"
                  required
                  placeholder="Select platforms"
                  options={PLATFORM_OPTIONS}
                  selected={form.platforms}
                  onChange={(platforms) => {
                    touch('platforms');
                    setForm((f) => ({ ...f, platforms }));
                  }}
                />
                {platformsError && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    Select at least one platform.
                  </p>
                )}
              </div>
              <MultiSelectDropdown
                label="Tone/Goal"
                labelHint="(optional)"
                placeholder="Select tone or goal"
                options={TONE_OPTIONS}
                selected={form.tones}
                onChange={(tones) => setForm((f) => ({ ...f, tones }))}
              />
            </div>
          </div>

          {/* Lead capture: side by side when the card is wide enough (container query). */}
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
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

          <div className="mt-auto">
            <button
              type="submit"
              disabled={!isValid || pending !== 'idle'}
              aria-busy={generating}
              className={`h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors enabled:hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange ${
                generating
                  ? 'cursor-wait opacity-80'
                  : 'disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400'
              }`}
            >
              {generating ? 'Generating…' : 'Generate Hashtags'}
            </button>
            <p className="mt-1 text-center text-xs text-gray-400">
              Optimized for each platform
            </p>
          </div>
        </form>
      </div>

      <ResultsModal
        open={modalOpen}
        results={results}
        regenerating={pending === 'regenerate'}
        onClose={() => setModalOpen(false)}
        onRegenerate={handleRegenerate}
      />
    </div>
  );
}
