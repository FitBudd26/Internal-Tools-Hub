import { useEffect, useRef, useState } from 'react';
import { copyText } from '../../shared/lib/copy';
import { MAX_BIO_CHARS, type GeneratedBio } from './types';

const STYLE_LABELS = ['Authority', 'Results', 'Community', 'Value'];

export function BioCard({ bio, index }: { bio: GeneratedBio; index: number }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async () => {
    if (!(await copyText(bio.text))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <article className="rounded-lg border border-fb-tint-border border-l-4 border-l-fb-teal bg-fb-tint p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Bio {index + 1} · {STYLE_LABELS[index % STYLE_LABELS.length]} angle
      </p>
      <p className="mt-0.5 text-[13.5px] leading-snug text-gray-800">{bio.text}</p>
      <div className="mt-1.5 flex items-center justify-between">
        <span className={`text-[11px] ${bio.charCount > MAX_BIO_CHARS ? 'text-red-500' : 'text-gray-500'}`}>
          {bio.charCount}/{MAX_BIO_CHARS} characters
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied bio to clipboard' : `Copy bio ${index + 1} to clipboard`}
          className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-teal ${
            copied ? 'border-fb-teal bg-fb-teal text-white' : 'border-fb-teal bg-white text-fb-teal hover:bg-fb-teal hover:text-white'
          }`}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </article>
  );
}
