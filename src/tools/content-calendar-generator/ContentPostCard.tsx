import { useState } from 'react';
import { copyText } from '../../shared/lib/copy';
import { captionText, hashtagText } from './calendarUtils';
import { longDate } from './dateScheduler';
import type { Post } from './types';

interface ContentPostCardProps {
  post: Post;
  regenerating: boolean;
  onEdit: () => void;
  onRegenerate: () => void;
}

const h4 = 'text-[11px] font-bold uppercase tracking-wide text-gray-500';
const btn =
  'flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-2 text-[12px] font-semibold text-gray-800 transition-colors hover:border-fb-teal hover:text-fb-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal disabled:cursor-wait disabled:opacity-60';

/** The selected post in full, with copy, edit and regenerate actions. Everything here is in the exports too. */
export function ContentPostCard({ post: p, regenerating, onEdit, onRegenerate }: ContentPostCardProps) {
  const [copied, setCopied] = useState<'caption' | 'hashtags' | 'failed' | null>(null);
  const copy = async (what: 'caption' | 'hashtags') => {
    const ok = await copyText(what === 'caption' ? captionText(p) : hashtagText(p));
    setCopied(ok ? what : 'failed');
    window.setTimeout(() => setCopied(null), 2000);
  };
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3" aria-live="polite">
      <div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          <span>{longDate(p.date)}</span>
          <span aria-hidden="true">·</span>
          <span>{p.platforms.join(' + ')}</span>
          <span aria-hidden="true">·</span>
          <span>{p.format}</span>
          <span className="rounded-full bg-fb-tint px-2 py-0.5 normal-case tracking-normal text-fb-teal">{p.pillar}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 normal-case tracking-normal text-gray-600">Draft</span>
        </div>
        <h3 className="mt-1 text-[15px] font-bold leading-tight text-gray-900">{p.topic}</h3>
      </div>

      <section>
        <h4 className={h4}>Hook</h4>
        <p className="mt-0.5 border-l-2 border-fb-orange pl-2 text-[13px] font-medium leading-snug text-gray-900">{p.hook}</p>
      </section>
      <section>
        <h4 className={h4}>Caption</h4>
        <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-snug text-gray-700">{p.caption}</p>
      </section>
      <section>
        <h4 className={h4}>Visual direction</h4>
        <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-snug text-gray-700">{p.creativeDirection}</p>
      </section>
      <section>
        <h4 className={h4}>CTA</h4>
        <p className="mt-0.5 text-[13px] leading-snug text-gray-700">{p.cta}</p>
      </section>
      {p.hashtags.length > 0 && (
        <section>
          <h4 className={h4}>Hashtags</h4>
          <p className="mt-0.5 text-[13px] leading-snug text-fb-teal">{p.hashtags.join(' ')}</p>
        </section>
      )}
      {p.productionNotes && (
        <section>
          <h4 className={h4}>Production notes</h4>
          <p className="mt-0.5 text-[13px] leading-snug text-gray-700">{p.productionNotes}</p>
        </section>
      )}
      {p.adaptations.map((a) => (
        <details key={a.platform} className="rounded-md border border-fb-tint-border bg-fb-tint px-2.5 py-1.5 text-[13px] leading-snug text-gray-700">
          <summary className="cursor-pointer font-semibold text-gray-900">
            {a.platform} version <span className="font-normal text-gray-500">· {a.format}</span>
          </summary>
          {a.hook && <p className="mt-1 font-medium text-gray-900">{a.hook}</p>}
          <p className="mt-1 whitespace-pre-wrap">{a.caption}</p>
        </details>
      ))}

      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button type="button" onClick={() => copy('caption')} className={btn}>
          {copied === 'caption' ? '✓ Caption copied' : copied === 'failed' ? 'Copy failed' : 'Copy Caption'}
        </button>
        <button type="button" onClick={() => copy('hashtags')} disabled={!p.hashtags.length} className={btn}>
          {copied === 'hashtags' ? '✓ Hashtags copied' : 'Copy Hashtags'}
        </button>
        <button type="button" onClick={onEdit} className={btn}>
          Edit Post
        </button>
        <button type="button" onClick={onRegenerate} disabled={regenerating} aria-busy={regenerating} className={btn}>
          {regenerating ? 'Rewriting…' : '↻ Regenerate Post'}
        </button>
      </div>
    </article>
  );
}
