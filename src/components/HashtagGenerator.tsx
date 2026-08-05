import { useState, type FormEvent } from 'react';
import {
  PLATFORM_OPTIONS,
  POST_TYPE_OPTIONS,
  TONE_OPTIONS,
  type HashtagFormState,
  type PlatformHashtags,
} from '../types';
import { generateHashtags } from '../lib/generateHashtags';
import { CTASection } from './CTASection';
import { HashMark } from './HashMark';
import { HashtagBlock } from './HashtagBlock';
import { MultiSelectChips } from './MultiSelectChips';
import { SelectDropdown } from './SelectDropdown';

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls =
  'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';

function Heading({ text }: { text: string }) {
  return (
    <h1 className="flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-bold text-fb-orange">
      <HashMark size={20} className="shrink-0" />
      <span className="truncate">{text}</span>
    </h1>
  );
}

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
  const [screen, setScreen] = useState<'form' | 'results'>('form');
  const [results, setResults] = useState<PlatformHashtags[]>([]);
  const [variant, setVariant] = useState(0);

  const captionValid = form.caption.trim().length > 0;
  const platformsValid = form.platforms.length > 0;
  const isValid = captionValid && platformsValid;

  const captionError = captionTouched && !captionValid;
  const platformsError = platformsTouched && !platformsValid;

  const handleGenerate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) return;
    setResults(generateHashtags(form, 0));
    setVariant(0);
    setScreen('results');
    window.scrollTo({ top: 0 });
  };

  const handleRegenerate = () => {
    const next = variant + 1;
    setVariant(next);
    setResults(generateHashtags(form, next));
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <div className="flex min-h-[440px] flex-col">
        {screen === 'form' ? (
          <form
            onSubmit={handleGenerate}
            className="flex flex-1 flex-col gap-3.5"
            noValidate
          >
            <Heading text="Hashtag Generator" />

            <div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-gray-900">
                  Caption
                  <span className="text-fb-orange" aria-hidden="true">
                    {' '}
                    *
                  </span>
                </span>
                <textarea
                  required
                  rows={3}
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
              <span className="mb-1.5 block text-sm font-bold text-gray-900">
                Topic / Niche / Keyword{' '}
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
              label="Post Type / Context"
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
              label="Tone / Goal"
              options={TONE_OPTIONS}
              selected={form.tones}
              onChange={(tones) => setForm((f) => ({ ...f, tones }))}
            />

            <button
              type="submit"
              disabled={!isValid}
              className="mt-auto h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors enabled:hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              🧠 Generate Hashtags
            </button>
          </form>
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            <Heading text="Your Hashtags Are Ready" />
            <p className="text-center text-[13px] text-gray-600">
              Your hashtags are ready👇 Tap any tag to copy it.
            </p>

            <div className="flex flex-col gap-2">
              {results.map((group) => (
                <HashtagBlock key={group.platform} group={group} />
              ))}
            </div>

            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => setScreen('form')}
                className="rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange"
              >
                ← Edit details
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                className="rounded text-[13px] font-medium text-fb-teal transition-colors hover:text-fb-teal-dark hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal"
              >
                ↻ Regenerate
              </button>
            </div>

            <div className="mt-auto">
              <CTASection />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
