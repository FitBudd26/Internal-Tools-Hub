import { useState, type FormEvent } from 'react';
import {
  PLATFORM_OPTIONS,
  POST_TYPE_OPTIONS,
  TONE_OPTIONS,
  type HashtagFormState,
  type PlatformHashtags,
} from '../types';
import { generateWithAi } from '../lib/aiHashtags';
import { trackGeneration } from '../lib/tracking';
import { HashMark } from './HashMark';
import { MultiSelectChips } from './MultiSelectChips';
import { ResultsModal } from './ResultsModal';
import { SelectDropdown } from './SelectDropdown';

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls =
  'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';

type Pending = 'idle' | 'generate' | 'regenerate';

export function HashtagGenerator() {
  const [form, setForm] = useState<HashtagFormState>({
    caption: '',
    topic: '',
    postType: null,
    platforms: [],
    tones: [],
  });
  const [captionTouched, setCaptionTouched] = useState(false);
  const [platformsTouched, setPlatformsTouched] = useState(false);
  const [results, setResults] = useState<PlatformHashtags[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [variant, setVariant] = useState(0);
  const [pending, setPending] = useState<Pending>('idle');

  const captionValid = form.caption.trim().length > 0;
  const platformsValid = form.platforms.length > 0;
  const isValid = captionValid && platformsValid;

  const captionError = captionTouched && !captionValid;
  const platformsError = platformsTouched && !platformsValid;
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
      // Optional HubSpot usage tracking; fire-and-forget, never blocks results.
      trackGeneration(form, groups);
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
              <span className="mb-1 block text-sm font-bold text-gray-900">
                Caption
                <span className="text-fb-orange" aria-hidden="true">
                  {' '}
                  *
                </span>
              </span>
              <textarea
                required
                rows={2}
                placeholder="Paste your post caption here"
                value={form.caption}
                onChange={(e) =>
                  setForm((f) => ({ ...f, caption: e.target.value }))
                }
                onBlur={() => setCaptionTouched(true)}
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

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-gray-900">
              Topic/Niche/Keyword{' '}
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

          <div>
            <MultiSelectChips
              label="Target Platform(s)"
              required
              options={PLATFORM_OPTIONS}
              selected={form.platforms}
              onChange={(platforms) => {
                setPlatformsTouched(true);
                setForm((f) => ({ ...f, platforms }));
              }}
            />
            {platformsError && (
              <p className="mt-1 text-xs text-red-500" role="alert">
                Select at least one platform.
              </p>
            )}
          </div>

          <MultiSelectChips
            label="Tone/Goal"
            options={TONE_OPTIONS}
            selected={form.tones}
            onChange={(tones) => setForm((f) => ({ ...f, tones }))}
          />

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
